import { turso } from '@/lib/turso';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
  }

  try {
    // FIXED: Changed from 'https://googleapis.com' to official token gateway
    const tokenResponse = await fetch('https://googleapis.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // FIXED: Changed from 'https://googleapis.com' to official userinfo gateway
    const userResponse = await fetch('https://googleapis.com', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    
    const profile = await userResponse.json(); 
    if (profile.error) throw new Error(profile.error_description || 'Failed fetching profile');

    const firstName = profile.given_name || profile.name?.split(' ')[0] || 'First';
    const lastName = profile.family_name || profile.name?.split(' ').slice(1).join(' ') || 'Last';
    const userId = profile.sub || profile.id;

    // Save or update the user details in Turso
    await turso.execute({
      sql: `INSERT INTO users (id, email, first_name, last_name, avatar_url) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT(email) DO UPDATE SET 
              first_name = excluded.first_name, 
              last_name = excluded.last_name, 
              avatar_url = excluded.avatar_url`,
      args: [userId, profile.email, firstName, lastName, profile.picture]
    });

    // Generate a secure, randomized session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const oneWeekInSeconds = 60 * 60 * 24 * 7;
    const expiresAt = Math.floor(Date.now() / 1000) + oneWeekInSeconds;

    // Write the session to the database
    await turso.execute({
      sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      args: [sessionToken, userId, expiresAt]
    });

    // Attach cookie and send to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      maxAge: oneWeekInSeconds,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('OAuth Callback handling failure:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
