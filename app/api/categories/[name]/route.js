import { turso, getSessionUser, ensureCredentialMetadataColumns } from '@/lib/turso';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categoryName = decodeURIComponent(params.name);

  try {
    await ensureCredentialMetadataColumns();
    try {
      await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }

    const [credentialsQuery, shareCountQuery] = await Promise.all([
      turso.execute({
        sql: `SELECT c.id, c.category, c.nickname,
            c.subcategory AS subcategory
          FROM credentials c WHERE c.owner_id = ? AND c.category = ? ORDER BY c.nickname ASC`,
        args: [user.id, categoryName]
      }),
      turso.execute({
        sql: `SELECT COUNT(*) as count FROM credential_shares s
              JOIN credentials c ON s.credential_id = c.id WHERE c.owner_id = ?`,
        args: [user.id]
      })
    ]);

    return NextResponse.json({
      credentials: credentialsQuery.rows || [],
      sharedByMeCount: Number(shareCountQuery.rows[0]?.count || 0)
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Category API load error:', error);
    return NextResponse.json({ error: 'Unable to load category data.' }, { status: 500 });
  }
}