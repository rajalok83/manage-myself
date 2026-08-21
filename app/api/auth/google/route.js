import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; 

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI; 

  // ❌ CRITICAL PRE-FLIGHT CHECK: Block broken links before redirecting
  if (!clientId || clientId.trim() === '') {
    return NextResponse.json(
      { 
        error: "Configuration Error", 
        message: "Your GOOGLE_CLIENT_ID is missing or blank inside your .env.local file. Google will not show the sign-in screen without it." 
      }, 
      { status: 500 }
    );
  }

  // FIXED: Pointing directly to the official OAuth2 validation endpoint
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  googleAuthUrl.searchParams.append('client_id', clientId);
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri || '');
  googleAuthUrl.searchParams.append('response_type', 'code');
  googleAuthUrl.searchParams.append('scope', 'openid email profile');

  return NextResponse.redirect(googleAuthUrl.toString());
}
