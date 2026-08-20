// import { NextResponse } from 'next/server';

// const appOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// export async function GET() {
//   const callbackUrl = new URL('/api/auth/callback?code=mock_local_developer_mode', appOrigin);
//   return NextResponse.redirect(callbackUrl);
// }
import { NextResponse } from 'next/server';

// 🚀 FORCE NEXT.JS TO RUN THIS CODE AT RUNTIME ON RENDER
export const dynamic = 'force-dynamic'; 

export async function GET() {
  const googleAuthUrl = new URL('https://google.com');
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI; 

  // These will now stream live to Render's backend dashboard
  console.log("=== DEBUG AUTH START ===");
  console.log("Is Client ID configured?", !!clientId);
  console.log("Current Redirect URI:", redirectUri);
  console.log("=== DEBUG AUTH END ===");

  googleAuthUrl.searchParams.append('client_id', clientId || '');
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri || '');
  googleAuthUrl.searchParams.append('response_type', 'code');
  googleAuthUrl.searchParams.append('scope', 'openid email profile');

  return NextResponse.redirect(googleAuthUrl.toString());
}
