import { turso } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  const sessionToken = request.cookies.get('session_token')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = await turso.execute({
      sql: 'SELECT user_id FROM sessions WHERE id = ? AND expires_at > ? LIMIT 1',
      args: [sessionToken, Math.floor(Date.now() / 1000)]
    });
    const userId = session.rows[0]?.user_id;

    if (!userId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { firstName, lastName } = await request.json();
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required.' }, { status: 400 });
    }

    await turso.execute({
      sql: 'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
      args: [firstName.trim(), lastName.trim(), userId]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile update failed:', error);
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 });
  }
}