import { turso, getSessionUser, ensureCredentialMetadataColumns, ensureNotesTables } from '@/lib/turso';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categoryName = decodeURIComponent(params.name);

  try {
    await ensureCredentialMetadataColumns();
    await ensureNotesTables();
    try {
      await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }

    const [credentialsQuery, noteQuery, shareCountQuery] = await Promise.all([
      turso.execute({
        sql: `SELECT c.id, c.category, c.nickname,
          c.subcategory AS subcategory,
          CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin
          FROM credentials c WHERE c.owner_id = ? AND c.category = ? ORDER BY c.nickname ASC`,
        args: [user.id, categoryName]
      }),
      turso.execute({
        sql: `SELECT id, 'Notes' AS category, nickname, NULL AS subcategory, 'note' AS item_type
          FROM notes WHERE owner_id = ? ORDER BY nickname ASC`,
        args: [user.id]
      }),
      turso.execute({
        sql: `SELECT (SELECT COUNT(*) FROM credential_shares s JOIN credentials c ON s.credential_id = c.id WHERE c.owner_id = ?)
              + (SELECT COUNT(*) FROM note_shares s JOIN notes n ON s.note_id = n.id WHERE n.owner_id = ?) AS count`,
        args: [user.id, user.id]
      })
    ]);

    const categoryRows = categoryName === 'Notes'
      ? noteQuery.rows
      : credentialsQuery.rows.map((row) => ({ ...row, item_type: 'credential' }));

    return NextResponse.json({
      credentials: categoryRows || [],
      sharedByMeCount: Number(shareCountQuery.rows[0]?.count || 0)
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Category API load error:', error);
    return NextResponse.json({ error: 'Unable to load category data.' }, { status: 500 });
  }
}