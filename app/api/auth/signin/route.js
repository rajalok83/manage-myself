import { NextResponse } from 'next/server';
import { getGoogleRedirectUri } from '@/lib/google-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  console.log("✈️ PHASE 1: STARTING AUTHENTICATION DISPATCH");

  // Read explicitly from the stable config file to clear undefined/blank variable constraints
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const redirectUri = getGoogleRedirectUri(request);

  console.log(`⏰ SYSTEM RUNNING TIMESTAMP: ${new Date().toLocaleTimeString()}`);
  console.log("📢 DISPATCHING RAW CONFIG REDIRECT_URI:", redirectUri);

  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const csrfState = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  // Assemble using clean string interpolation to maintain absolute character formatting
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile&` +  
    `prompt=select_account%20consent&` + // Forces Google to clear past caches and show selector UI
    `state=${csrfState}&` +
    `access_type=offline`;

  const response = NextResponse.redirect(authUrl);

  // Anti-caching protocolsnot
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  response.cookies.set('oauth_state', csrfState, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 300,
    secure: process.env.NODE_ENV === 'production'
  });

  return response;
}
