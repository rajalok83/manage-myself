import { turso } from '@/lib/turso';
import { NextResponse } from 'next/server';
import { getGoogleRedirectUri } from '@/lib/google-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  // This message will now successfully print to your terminal window!
  console.log("📥 PHASE 2 CALLBACK RECEIVED! Intercepting token validation code packet...");

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const incomingState = searchParams.get('state');

  if (!code) {
    return NextResponse.json({ error: 'Authorization token code payload missing' }, { status: 400 });
  }

  try {
    // These lines will now map beautifully without throwing an undefined error
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const redirectUri = getGoogleRedirectUri(request);

    // Extract temporary state tracker cookie safely
    const cookieHeader = request.headers.get('cookie') || '';
    const stateCookie = cookieHeader.match(/oauth_state=([^;]+)/)?.[1];

    // Assemble the body values payload explicitly as url-encoded forms
        // Ensure the payload values match standard application/x-www-form-urlencoded specifications
    const payload = new URLSearchParams();
    payload.append('code', code.trim());
    payload.append('client_id', clientId);
    payload.append('client_secret', clientSecret);
    payload.append('redirect_uri', redirectUri);
    payload.append('grant_type', 'authorization_code');

    console.log("📡 EXCHANGING TOKEN WITH OAUTH2.GOOGLEAPIS.COM...");
    
    // =========================================================================
    // ⚡ FIXED: Explicitly call payload.toString() inside the body block.
    // This forces the environment to send a native form string payload, 
    // resolving Google's strict endpoint 404 rejection.
    // =========================================================================
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: payload.toString(), // Explicit string serialization fix
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Google Token API Crash payload response:", errorText);
      throw new Error(`Google Token HTTP Error Status: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();

    console.log("👤 FETCHING IDENTITY PROFILE METADATA...");
    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      },
    });
    
    if (!userResponse.ok) {
      throw new Error(`Google Profile Userinfo HTTP Error Status: ${userResponse.status}`);
    }

    const profile = await userResponse.json(); 

    // Handle names configuration extraction safely
    const nameParts = profile.name?.split(' ') || [];
    const firstName = profile.given_name || nameParts[0] || 'First';
    const lastName = profile.family_name || nameParts.slice(1).join(' ') || 'Last';
    const userId = String(profile.sub || profile.id);

    console.log("💾 COMMITTING RECORD TO TURSO DATABASE:", profile.email);
    await turso.execute({
      sql: `INSERT INTO users (id, email, first_name, last_name, avatar_url) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT(email) DO UPDATE SET 
              first_name = excluded.first_name, 
              last_name = excluded.last_name, 
              avatar_url = excluded.avatar_url`,
      args: [userId, profile.email, firstName, lastName, profile.picture || '']
    });

    // Create a crypto secure session token using Web Crypto API
    const sessionArray = new Uint8Array(32);
    crypto.getRandomValues(sessionArray);
    const sessionToken = Array.from(sessionArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    const oneWeekInSeconds = 60 * 60 * 24 * 7;
    const expiresAt = Math.floor(Date.now() / 1000) + oneWeekInSeconds;

    await turso.execute({
      sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      args: [sessionToken, userId, expiresAt]
    });

    // Build absolute redirection parameters to neutralize Next.js domain loops
    const appRootUrl = new URL(request.url).origin;
    const destinationDashboard = new URL('/dashboard', appRootUrl);

    console.log("🎯 REDIRECTING SECURE USER ENTRY TO:", destinationDashboard.toString());
    const response = NextResponse.redirect(destinationDashboard);
    
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      maxAge: oneWeekInSeconds,
      path: '/',
    });

    // Clean up temporary tracking cookie
    response.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });
    
    console.log("🚀 AUTHENTICATION COMPLETELY SUCCESSFUL! DATAFRAMES VERIFIED.");
    return response;

  } catch (error) {
    console.error('❌ Phase 2 process encountered a critical error:', error);

    if (error.message === 'Server returned HTTP status 401') {
      return NextResponse.json({
        error: 'The Turso database token is expired or invalid. Generate a new token and restart the development server.',
        file: 'callback/route.js'
      }, { status: 503 });
    }

    return NextResponse.json({ error: error.message, file: 'callback/route.js' }, { status: 500 });
  }
}
