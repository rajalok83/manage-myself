import { turso } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').map((c) => c.split('=')));
  const sessionToken = cookies['session_token'];

  if (sessionToken) {
    // Delete the active token row row from the database structure
    await turso.execute({
      sql: "DELETE FROM sessions WHERE id = ?",
      args: [sessionToken]
    });
  }

  // Clear cookie and redirect to the application index page
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set('session_token', '', { maxAge: 0, path: '/' });
  return response;
}
