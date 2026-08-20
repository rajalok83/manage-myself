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
    // 1. Exchange the authorization code for access tokens
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
    if (tokens.error) throw new Error(tokens.error_description);

    // 2. Use the token to fetch the user's Google profile details
    const userResponse = await fetch('https://googleapis.com', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userResponse.json(); 
    // profile contains fields: id, email, name, given_name, family_name, picture

    // 3. Fallback logic to split full name if specific components are missing
    const firstName = profile.given_name || profile.name?.split(' ')[0] || 'First';
    const lastName = profile.family_name || profile.name?.split(' ').slice(1).join(' ') || 'Last';

    // 4. Save or update the user details in Turso
    await turso.execute({
      sql: `INSERT INTO users (id, email, first_name, last_name, avatar_url) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT(email) DO UPDATE SET 
              first_name = excluded.first_name, 
              last_name = excluded.last_name, 
              avatar_url = excluded.avatar_url`,
      args: [profile.id, profile.email, firstName, lastName, profile.picture]
    });

    // 5. Generate a secure, randomized 64-character session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const oneWeekInSeconds = 60 * 60 * 24 * 7;
    const expiresAt = Math.floor(Date.now() / 1000) + oneWeekInSeconds;

    // 6. Write the session to the database
    await turso.execute({
      sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      args: [sessionToken, profile.id, expiresAt]
    });

    // 7. Attach the secure HTTP-only cookie and send them to the dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true on Render, false locally
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
// import { turso } from '../../../../lib/turso';
// import { NextResponse } from 'next/server';
// import crypto from 'crypto';

// const appOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// export async function GET() {
//   try {
//     const mockProfile = {
//       id: 'local_dev_user_idx_99',
//       email: 'developer@localhost.lan',
//       firstName: 'Local',
//       lastName: 'Developer',
//       avatarUrl: ''
//     };

//     await turso.execute({
//       sql: `INSERT INTO users (id, email, first_name, last_name, avatar_url) 
//             VALUES (?, ?, ?, ?, ?) 
//             ON CONFLICT(email) DO UPDATE SET 
//               first_name = excluded.first_name, 
//               last_name = excluded.last_name`,
//       args: [mockProfile.id, mockProfile.email, mockProfile.firstName, mockProfile.lastName, mockProfile.avatarUrl]
//     });

//     const sessionToken = crypto.randomBytes(32).toString('hex');
//     const oneWeekInSeconds = 60 * 60 * 24 * 7;
//     const expiresAt = Math.floor(Date.now() / 1000) + oneWeekInSeconds;

//     await turso.execute({
//       sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
//       args: [sessionToken, mockProfile.id, expiresAt]
//     });

//     const response = NextResponse.redirect(new URL('/dashboard', appOrigin));
//     response.cookies.set('session_token', sessionToken, {
//       httpOnly: true,
//       secure: false,
//       sameSite: 'lax',
//       maxAge: oneWeekInSeconds,
//       path: '/',
//     });

//     return response;

//   } catch (error) {
//     console.error('Local Authentication Bypass Error:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
