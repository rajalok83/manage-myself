// import { NextResponse } from 'next/server';

// const appOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// export async function GET() {
//   const callbackUrl = new URL('/api/auth/callback?code=mock_local_developer_mode', appOrigin);
//   return NextResponse.redirect(callbackUrl);
// }
import { NextResponse } from 'next/server';

export async function GET() {
  // 1. Base Google OAuth 2.0 endpoint
  const googleAuthUrl = new URL('https://google.com');

  // 2. Safely read configuration from environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI; 

  // 3. Append required OAuth parameters
  googleAuthUrl.searchParams.append('client_id', clientId);
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.append('response_type', 'code');
  googleAuthUrl.searchParams.append('scope', 'openid email profile');
  googleAuthUrl.searchParams.append('access_type', 'offline'); // Optional: gives you a refresh token
  googleAuthUrl.searchParams.append('prompt', 'select_account'); // Optional: forces account picker

  // 4. Redirect the user to Google's secure sign-in page
  return NextResponse.redirect(googleAuthUrl.toString());
}
