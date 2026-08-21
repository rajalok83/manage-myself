import { turso } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function GET(request) {
  // FIXED: Cleanly extract the cookie token using Next.js built-in cookies API
  const sessionToken = request.cookies.get('session_token')?.value;

  if (sessionToken) {
    try {
      // Delete the active token row from the database structure
      await turso.execute({
        sql: "DELETE FROM sessions WHERE id = ?",
        args: [sessionToken]
      });
    } catch (dbError) {
      console.error("Failed to clean session:", dbError);
    }
  }

  // Generate redirect targeting the index landing page root
  const response = NextResponse.redirect(new URL('/', request.url));
  
  // FIXED: Explicitly wipe the browser cookie securely using the standard framework utility
  response.cookies.delete('session_token');
  
  return response;
}
