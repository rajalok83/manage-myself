import { turso, getSessionUser, ensureNotesTables } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureNotesTables();
    const { credentialId, itemType = 'credential', recipientEmail, recipientEmails = [], revokeAll = false } = await req.json();
    if (!['credential', 'note'].includes(itemType)) return NextResponse.json({ error: 'Invalid item type.' }, { status: 400 });
    const table = itemType === 'note' ? 'notes' : 'credentials';
    const shareTable = itemType === 'note' ? 'note_shares' : 'credential_shares';
    const idColumn = itemType === 'note' ? 'note_id' : 'credential_id';

    const ownerCheck = await turso.execute({
      sql: `SELECT owner_id FROM ${table} WHERE id = ?`,
      args: [credentialId]
    });

    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Modification restrictions active' }, { status: 403 });
    }

    if (revokeAll) {
      await turso.execute({
        sql: `DELETE FROM ${shareTable} WHERE ${idColumn} = ?`,
        args: [credentialId]
      });
      return NextResponse.json({ success: true });
    }

    const emails = [...new Set([recipientEmail, ...recipientEmails]
      .filter(Boolean)
      .map((email) => String(email).trim().toLowerCase()))];
    if (emails.length === 0) {
      return NextResponse.json({ error: 'Recipient email is required.' }, { status: 400 });
    }

    // Resolve the internal system user ID matching the recipient email address string
    const targetUser = await turso.execute({
      sql: `SELECT id FROM users WHERE lower(email) IN (${emails.map(() => '?').join(', ')})`,
      args: emails
    });

    if (targetUser.rows.length === 0) {
      return NextResponse.json({ error: 'Target recipient configuration not found.' }, { status: 404 });
    }

    // Delete the connection table row entry parameter matrix mapping values
    await turso.execute({
      sql: `DELETE FROM ${shareTable}
        WHERE ${idColumn} = ? AND shared_with_user_id IN (${targetUser.rows.map(() => '?').join(', ')})`,
      args: [credentialId, ...targetUser.rows.map((row) => row.id)]
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
