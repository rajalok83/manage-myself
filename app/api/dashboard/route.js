import { turso, getSessionUser, ensureCredentialMetadataColumns, ensureCredentialShareColumns, ensureNotesTables } from '@/lib/turso';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureCredentialMetadataColumns();
    await ensureCredentialShareColumns();
    await ensureNotesTables();
    try {
      await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }

    const [credentialsQuery, notesQuery, sharedByMeQuery, sharedWithMeQuery, noteSharedByMeQuery, noteSharedWithMeQuery] = await Promise.all([
      turso.execute({
            sql: `SELECT c.id, c.category, c.nickname, c.created_at,
              c.subcategory AS subcategory,
              CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin
            FROM credentials c WHERE c.owner_id = ? ORDER BY c.created_at DESC`,
        args: [user.id]
      }),
      turso.execute({
        sql: `SELECT id, 'Notes' AS category, NULL AS subcategory, nickname, created_at, 'note' AS item_type, 0 AS requires_pin
          FROM notes WHERE owner_id = ? ORDER BY created_at DESC`,
        args: [user.id]
      }),
      turso.execute({
          sql: `SELECT c.id, c.nickname, c.category, 'credential' AS item_type,
            CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin,
              c.subcategory AS subcategory,
              u.email as shared_with,
              s.share_mode
              FROM credential_shares s JOIN credentials c ON s.credential_id = c.id
              JOIN users u ON s.shared_with_user_id = u.id WHERE c.owner_id = ?`,
        args: [user.id]
      }),
      turso.execute({
          sql: `SELECT c.id, c.category, c.nickname, 'credential' AS item_type,
            CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin,
              c.subcategory AS subcategory,
              u.email as shared_by,
              s.share_mode
              FROM credentials c JOIN credential_shares s ON c.id = s.credential_id
              JOIN users u ON c.owner_id = u.id WHERE s.shared_with_user_id = ?`,
        args: [user.id]
      }),
      turso.execute({
        sql: `SELECT n.id, n.nickname, 'Notes' AS category, 'note' AS item_type,
              u.email as shared_with, s.share_mode
          FROM note_shares s JOIN notes n ON s.note_id = n.id
          JOIN users u ON s.shared_with_user_id = u.id WHERE n.owner_id = ?`,
        args: [user.id]
      }),
      turso.execute({
        sql: `SELECT n.id, 'Notes' AS category, n.nickname, 'note' AS item_type,
              u.email as shared_by, s.share_mode
          FROM notes n JOIN note_shares s ON n.id = s.note_id
          JOIN users u ON n.owner_id = u.id WHERE s.shared_with_user_id = ?`,
        args: [user.id]
      })
    ]);

    const sharedByMeByCredential = new Map();
    for (const row of [...sharedByMeQuery.rows, ...noteSharedByMeQuery.rows]) {
      const key = `${row.item_type}:${row.id}`;
      const existing = sharedByMeByCredential.get(key);
      const recipient = { email: row.shared_with, share_mode: row.share_mode };
      if (existing) {
        existing.shared_with.push(recipient);
      } else {
        sharedByMeByCredential.set(key, {
          id: row.id,
          nickname: row.nickname,
          category: row.category,
          subcategory: row.subcategory,
          item_type: row.item_type,
          shared_with: [recipient]
        });
      }
    }

    const sharedWithMe = [...sharedWithMeQuery.rows, ...noteSharedWithMeQuery.rows];

    return NextResponse.json({
      credentials: [...(credentialsQuery.rows || []).map((row) => ({ ...row, item_type: 'credential' })), ...(notesQuery.rows || [])],
      sharedByMe: Array.from(sharedByMeByCredential.values()),
      sharedWithMe
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Dashboard API load error:', error);
    return NextResponse.json({ error: 'Unable to load dashboard data.' }, { status: 500 });
  }
}