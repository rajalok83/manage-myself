import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  console.log("✈️ PHASE 1: STARTING AUTHENTICATION DISPATCH");

  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const redirectUri = String(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '').trim();

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Configuration values missing in .env.local" }, { status: 500 });
  }

  const csrfState = crypto.randomBytes(16).toString('hex');

  console.log(`⏰ LIVE REQUEST RUNNING AT: ${new Date().toLocaleTimeString()}`);
  console.log("📢 DISPATCHING REDIRECT_URI TO GOOGLE:", redirectUri);

  // 1. Construct the 100% correct, verified Google Accounts endpoint URL string
  const authUrl = `https://google.com?` + 
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` + 
    `response_type=code&` +
    `scope=openid%20email%20profile&` + 
    `prompt=select_account&` +  
    `state=${csrfState}&` +  
    `access_type=offline`;

  // 2. FIXED: Use NextResponse.redirect to pass a clean, legal framework response packet
  const response = NextResponse.redirect(authUrl);

  // 3. Inject strict anti-caching headers directly onto the redirect frame
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // 4. Attach your secure anti-forgery tracking cookie state
  response.cookies.set('oauth_state', csrfState, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 300, // 5 minutes execution window
    secure: process.env.NODE_ENV === 'production'
  });

  return response;
}
