import { NextResponse } from 'next/server';

const appOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET() {
  const callbackUrl = new URL('/api/auth/callback?code=mock_local_developer_mode', appOrigin);
  return NextResponse.redirect(callbackUrl);
}
