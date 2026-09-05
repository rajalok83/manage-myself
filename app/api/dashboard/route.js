import { turso, getSessionUser, ensureCredentialMetadataColumns } from '@/lib/turso';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureCredentialMetadataColumns();
    try {
      await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }

    const [credentialsQuery, sharedByMeQuery, sharedWithMeQuery] = await Promise.all([
      turso.execute({
          sql: `SELECT c.id, c.category, c.nickname, c.created_at,
              c.subcategory AS subcategory
            FROM credentials c WHERE c.owner_id = ? ORDER BY c.created_at DESC`,
        args: [user.id]
      }),
      turso.execute({
        sql: `SELECT c.id, c.nickname, c.category,
              c.subcategory AS subcategory,
              u.email as shared_with
              FROM credential_shares s JOIN credentials c ON s.credential_id = c.id
              JOIN users u ON s.shared_with_user_id = u.id WHERE c.owner_id = ?`,
        args: [user.id]
      }),
      turso.execute({
        sql: `SELECT c.id, c.category, c.nickname,
              c.subcategory AS subcategory,
              u.email as shared_by
              FROM credentials c JOIN credential_shares s ON c.id = s.credential_id
              JOIN users u ON c.owner_id = u.id WHERE s.shared_with_user_id = ?`,
        args: [user.id]
      })
    ]);

    return NextResponse.json({
      credentials: credentialsQuery.rows || [],
      sharedByMe: sharedByMeQuery.rows || [],
      sharedWithMe: sharedWithMeQuery.rows || []
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Dashboard API load error:', error);
    return NextResponse.json({ error: 'Unable to load dashboard data.' }, { status: 500 });
  }
}