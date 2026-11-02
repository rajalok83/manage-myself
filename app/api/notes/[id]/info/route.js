import { turso, getSessionUser, ensureNotesTables } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureNotesTables();
    const { id } = await params;
    const result = await turso.execute({
      sql: `SELECT n.markdown, s.share_mode FROM notes n
        LEFT JOIN note_shares s ON s.note_id = n.id AND s.shared_with_user_id = ?
        WHERE n.id = ? AND (n.owner_id = ? OR s.shared_with_user_id = ?)`,
      args: [user.id, id, user.id, user.id]
    });
    if (!result.rows.length) return NextResponse.json({ error: 'Access denied or note not found.' }, { status: 403 });

    if (result.rows[0].share_mode === 'once') {
      await turso.execute({
        sql: 'DELETE FROM note_shares WHERE note_id = ? AND shared_with_user_id = ? AND share_mode = ?',
        args: [id, user.id, 'once']
      });
    }
    return NextResponse.json({ markdown: result.rows[0].markdown });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to load this note.' }, { status: 500 });
  }
}