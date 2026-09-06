import { turso, getSessionUser, ensureCredentialMetadataColumns, ensureCredentialShareColumns } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureCredentialMetadataColumns();
    await ensureCredentialShareColumns();
    try {
      await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }

    // 1. Fetch credentials shared WITH the current user
    const sharedWithMe = await turso.execute({
      sql: `SELECT c.id, c.category, c.nickname,
           c.subcategory AS subcategory,
           u.email as shared_by,
           s.share_mode
            FROM credentials c
            JOIN credential_shares s ON c.id = s.credential_id
            JOIN users u ON c.owner_id = u.id
            WHERE s.shared_with_user_id = ?`,
      args: [user.id]
    });

    // 2. Fetch credentials that the current user is sharing OUT to others
    const sharedByMe = await turso.execute({
      sql: `SELECT c.id, c.nickname, c.category,
           c.subcategory AS subcategory,
           u.email as shared_with,
           s.share_mode
            FROM credential_shares s
            JOIN credentials c ON s.credential_id = c.id
            JOIN users u ON s.shared_with_user_id = u.id
            WHERE c.owner_id = ?`,
      args: [user.id]
    });

    const sharedByMeByCredential = new Map();
    for (const row of sharedByMe.rows) {
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
      sharedWithMe: sharedWithMe.rows,
      sharedByMe: Array.from(sharedByMeByCredential.values())
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { credentialId, targetEmail, shareMode = 'view' } = await req.json();
    const normalizedEmail = String(targetEmail || '').trim().toLowerCase();

    if (!credentialId || !normalizedEmail) {
      return NextResponse.json({ error: 'Credential and recipient email are required.' }, { status: 400 });
    }

    if (!['once', 'view', 'edit'].includes(shareMode)) {
      return NextResponse.json({ error: 'Invalid sharing option.' }, { status: 400 });
    }

    if (normalizedEmail === String(user.email || '').trim().toLowerCase()) {
      return NextResponse.json({ error: 'You cannot share a credential with yourself.' }, { status: 400 });
    }

    const ownedCredential = await turso.execute({
      sql: 'SELECT id FROM credentials WHERE id = ? AND owner_id = ?',
      args: [credentialId, user.id]
    });

    if (ownedCredential.rows.length === 0) {
      return NextResponse.json({ error: 'You can only share credentials that you own.' }, { status: 403 });
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

    await turso.execute({
      sql: `INSERT INTO credential_shares (credential_id, shared_with_user_id, share_mode)
            VALUES (?, ?, ?)
            ON CONFLICT(credential_id, shared_with_user_id)
            DO UPDATE SET share_mode = excluded.share_mode, shared_at = datetime('now')`,
      args: [credentialId, recipientId, shareMode]
    });

    return NextResponse.json({ success: true, shareMode });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

