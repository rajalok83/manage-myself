import { turso, getSessionUser, ensureNotesTables } from '@/lib/turso';
import { getShareData } from '@/lib/user-data';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await getShareData(user.id);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureNotesTables();
    const { credentialId, noteId, itemType = 'credential', targetEmail, shareMode = 'view' } = await req.json();
    const itemId = itemType === 'note' ? noteId : credentialId;
    const normalizedEmail = String(targetEmail || '').trim().toLowerCase();

    if (!itemId || !normalizedEmail || !['credential', 'note'].includes(itemType)) {
      return NextResponse.json({ error: 'Item and recipient email are required.' }, { status: 400 });
    }

    if (!['once', 'view', 'edit'].includes(shareMode)) {
      return NextResponse.json({ error: 'Invalid sharing option.' }, { status: 400 });
    }

    if (normalizedEmail === String(user.email || '').trim().toLowerCase()) {
      return NextResponse.json({ error: 'You cannot share an item with yourself.' }, { status: 400 });
    }

    const ownedItem = itemType === 'note'
      ? await turso.execute({ sql: 'SELECT id FROM notes WHERE id = ? AND owner_id = ?', args: [itemId, user.id] })
      : await turso.execute({ sql: 'SELECT id FROM credentials WHERE id = ? AND owner_id = ?', args: [itemId, user.id] });

    if (ownedItem.rows.length === 0) {
      return NextResponse.json({ error: 'You can only share items that you own.' }, { status: 403 });
    }

    // Verify recipient user exists in database ecosystem
    const targetUser = await turso.execute({
      sql: "SELECT id FROM users WHERE lower(email) = ?",
      args: [normalizedEmail]
    });
    if (targetUser.rows.length === 0) {
      return NextResponse.json({ error: 'No user registered with this email address.' }, { status: 404 });
    }

    const recipientId = targetUser.rows[0].id;

    const share = itemType === 'note'
      ? {
          sql: `INSERT INTO note_shares (note_id, shared_with_user_id, share_mode)
            VALUES (?, ?, ?) ON CONFLICT(note_id, shared_with_user_id)
            DO UPDATE SET share_mode = excluded.share_mode, shared_at = datetime('now')`,
          args: [itemId, recipientId, shareMode]
        }
      : {
          sql: `INSERT INTO credential_shares (credential_id, shared_with_user_id, share_mode)
            VALUES (?, ?, ?) ON CONFLICT(credential_id, shared_with_user_id)
            DO UPDATE SET share_mode = excluded.share_mode, shared_at = datetime('now')`,
          args: [itemId, recipientId, shareMode]
        };
    await turso.execute(share);

    return NextResponse.json({ success: true, shareMode });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
