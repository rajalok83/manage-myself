import { turso, getSessionUser, ensureCredentialMetadataColumns, ensureCredentialShareColumns } from '@/lib/turso';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureCredentialMetadataColumns();
    await ensureCredentialShareColumns();
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
              u.email as shared_with,
              s.share_mode
              FROM credential_shares s JOIN credentials c ON s.credential_id = c.id
              JOIN users u ON s.shared_with_user_id = u.id WHERE c.owner_id = ?`,
        args: [user.id]
      }),
      turso.execute({
        sql: `SELECT c.id, c.category, c.nickname,
              c.subcategory AS subcategory,
              u.email as shared_by,
              s.share_mode
              FROM credentials c JOIN credential_shares s ON c.id = s.credential_id
              JOIN users u ON c.owner_id = u.id WHERE s.shared_with_user_id = ?`,
        args: [user.id]
      })
    ]);

    const sharedByMeByCredential = new Map();
    for (const row of sharedByMeQuery.rows) {
      const existing = sharedByMeByCredential.get(row.id);
      const recipient = { email: row.shared_with, share_mode: row.share_mode };
      if (existing) {
        existing.shared_with.push(recipient);
      } else {
        sharedByMeByCredential.set(row.id, {
          id: row.id,
          nickname: row.nickname,
          category: row.category,
          subcategory: row.subcategory,
          shared_with: [recipient]
        });
      }
    }

    return NextResponse.json({
      credentials: credentialsQuery.rows || [],
      sharedByMe: Array.from(sharedByMeByCredential.values()),
      sharedWithMe: sharedWithMeQuery.rows || []
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Dashboard API load error:', error);
    return NextResponse.json({ error: 'Unable to load dashboard data.' }, { status: 500 });
  }
}