import { turso, getSessionUser } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { credentialId, recipientEmail } = await req.json();

    // Security Check: Verify that the person initiating the revocation owns the parent asset
    const ownerCheck = await turso.execute({
      sql: "SELECT owner_id FROM credentials WHERE id = ?",
      args: [credentialId]
    });

    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Modification restrictions active' }, { status: 403 });
    }

    // Resolve the internal system user ID matching the recipient email address string
    const targetUser = await turso.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [recipientEmail]
    });

    if (targetUser.rows.length === 0) {
      return NextResponse.json({ error: 'Target recipient configuration not found.' }, { status: 404 });
    }

    const recipientId = targetUser.rows[0].id;

    // Delete the connection table row entry parameter matrix mapping values
    await turso.execute({
      sql: "DELETE FROM credential_shares WHERE credential_id = ? AND shared_with_user_id = ?",
      args: [credentialId, recipientId]
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
