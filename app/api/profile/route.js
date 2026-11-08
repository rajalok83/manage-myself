import { turso, getSessionUser } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { firstName, lastName } = await request.json();
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required.' }, { status: 400 });
    }

    await turso.execute({
      sql: 'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
      args: [firstName.trim(), lastName.trim(), user.id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile update failed:', error);
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 });
  }
}