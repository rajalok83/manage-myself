import { NextResponse } from 'next/server';
import { INVITE_ADMIN_EMAIL } from '@/lib/config';
import { ensureInvitationsTable, getSessionUser, normalizeEmail, turso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (normalizeEmail(user.email) !== normalizeEmail(INVITE_ADMIN_EMAIL)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const authorization = await requireAdmin();
  if (authorization.response) return authorization.response;

  try {
    await ensureInvitationsTable();
    const result = await turso.execute(
      'SELECT email, invited_by, created_at, revoked_at FROM invited_emails ORDER BY email'
    );
    return NextResponse.json({ invitations: result.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Unable to load invitations:', error);
    return NextResponse.json({ error: 'Unable to load invitations.' }, { status: 500 });
  }
}

export async function POST(request) {
  const authorization = await requireAdmin();
  if (authorization.response) return authorization.response;

  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (email === normalizeEmail(INVITE_ADMIN_EMAIL)) {
      return NextResponse.json({ error: 'The administrator already has permanent access.' }, { status: 400 });
    }

    await ensureInvitationsTable();
    await turso.execute({
      sql: `INSERT INTO invited_emails (email, invited_by, created_at, revoked_at)
        VALUES (?, ?, datetime('now'), NULL)
        ON CONFLICT(email) DO UPDATE SET
          invited_by = excluded.invited_by,
          created_at = datetime('now'),
          revoked_at = NULL`,
      args: [email, authorization.user.email]
    });

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error('Unable to add invitation:', error);
    return NextResponse.json({ error: 'Unable to add invitation.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const authorization = await requireAdmin();
  if (authorization.response) return authorization.response;

  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (email === normalizeEmail(INVITE_ADMIN_EMAIL)) {
      return NextResponse.json({ error: 'The administrator cannot be removed.' }, { status: 400 });
    }

    await ensureInvitationsTable();
    const result = await turso.execute({
      sql: `UPDATE invited_emails SET revoked_at = datetime('now')
        WHERE email = ? AND revoked_at IS NULL`,
      args: [email]
    });
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'No active invitation exists for this email.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error('Unable to revoke invitation:', error);
    return NextResponse.json({ error: 'Unable to revoke invitation.' }, { status: 500 });
  }
}
