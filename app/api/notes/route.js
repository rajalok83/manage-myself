import { turso, getSessionUser, ensureNotesTables } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureNotesTables();
    const { nickname, markdown } = await request.json();
    const title = String(nickname || '').trim();
    if (!title || typeof markdown !== 'string' || !markdown.trim()) {
      return NextResponse.json({ error: 'A title and markdown content are required.' }, { status: 400 });
    }

    const [credentialDuplicate, noteDuplicate] = await Promise.all([
      turso.execute({ sql: 'SELECT id FROM credentials WHERE owner_id = ? AND nickname = ?', args: [user.id, title] }),
      turso.execute({ sql: 'SELECT id FROM notes WHERE owner_id = ? AND nickname = ?', args: [user.id, title] })
    ]);
    if (credentialDuplicate.rows.length || noteDuplicate.rows.length) {
      return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });
    }

    const result = await turso.execute({
      sql: 'INSERT INTO notes (owner_id, nickname, markdown) VALUES (?, ?, ?)',
      args: [user.id, title, markdown]
    });
    return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}