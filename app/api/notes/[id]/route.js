import { turso, getSessionUser, ensureNotesTables } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureNotesTables();
    const { id } = await params;
    const { nickname, markdown } = await request.json();
    const title = String(nickname || '').trim();
    if (!title || typeof markdown !== 'string' || !markdown.trim()) {
      return NextResponse.json({ error: 'A title and markdown content are required.' }, { status: 400 });
    }

    const access = await turso.execute({
      sql: `SELECT n.owner_id, s.share_mode FROM notes n
        LEFT JOIN note_shares s ON s.note_id = n.id AND s.shared_with_user_id = ?
        WHERE n.id = ? AND (n.owner_id = ? OR s.shared_with_user_id = ?)`,
      args: [user.id, id, user.id, user.id]
    });
    if (!access.rows.length || (access.rows[0].owner_id !== user.id && access.rows[0].share_mode !== 'edit')) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    const [duplicate, credentialDuplicate] = await Promise.all([
      turso.execute({
        sql: 'SELECT id FROM notes WHERE owner_id = ? AND nickname = ? AND id <> ?',
        args: [access.rows[0].owner_id, title, id]
      }),
      turso.execute({
        sql: 'SELECT id FROM credentials WHERE owner_id = ? AND nickname = ?',
        args: [access.rows[0].owner_id, title]
      })
    ]);
    if (duplicate.rows.length || credentialDuplicate.rows.length) {
      return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });
    }

    await turso.execute({ sql: 'UPDATE notes SET nickname = ?, markdown = ? WHERE id = ?', args: [title, markdown, id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureNotesTables();
    const { id } = await params;
    const owner = await turso.execute({ sql: 'SELECT owner_id FROM notes WHERE id = ?', args: [id] });
    if (!owner.rows.length || owner.rows[0].owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }
    await turso.execute({ sql: 'DELETE FROM note_shares WHERE note_id = ?', args: [id] });
    await turso.execute({ sql: 'DELETE FROM notes WHERE id = ? AND owner_id = ?', args: [id, user.id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}