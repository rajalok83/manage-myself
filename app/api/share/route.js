import { turso, getSessionUser } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    try {
      await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }

    // 1. Fetch credentials shared WITH the current user
    const sharedWithMe = await turso.execute({
      sql: `SELECT c.id, c.category, c.nickname, c.web_url, c.login_id, c.description,
           COALESCE(c.subcategory, (SELECT subcategory FROM cards WHERE credential_id = c.id)) AS subcategory,
           u.email as shared_by
            FROM credentials c
            JOIN credential_shares s ON c.id = s.credential_id
            JOIN users u ON c.owner_id = u.id
            WHERE s.shared_with_user_id = ?`,
      args: [user.id]
    });

    // 2. Fetch credentials that the current user is sharing OUT to others
    const sharedByMe = await turso.execute({
      sql: `SELECT c.id, c.nickname, c.category, c.description,
           COALESCE(c.subcategory, (SELECT subcategory FROM cards WHERE credential_id = c.id)) AS subcategory,
           u.email as shared_with
            FROM credential_shares s
            JOIN credentials c ON s.credential_id = c.id
            JOIN users u ON s.shared_with_user_id = u.id
            WHERE c.owner_id = ?`,
      args: [user.id]
    });

    return NextResponse.json({
      sharedWithMe: sharedWithMe.rows,
      sharedByMe: sharedByMe.rows
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { credentialId, targetEmail } = await req.json();
    const normalizedEmail = String(targetEmail || '').trim().toLowerCase();

    if (!credentialId || !normalizedEmail) {
      return NextResponse.json({ error: 'Credential and recipient email are required.' }, { status: 400 });
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

    try {
      await turso.execute({
        sql: "INSERT INTO credential_shares (credential_id, shared_with_user_id) VALUES (?, ?)",
        args: [credentialId, recipientId]
      });
    } catch (error) {
      if (error.message?.includes('UNIQUE')) {
        return NextResponse.json({ error: 'This credential is already shared with that email.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

