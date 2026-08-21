import { createClient } from '@libsql/client';
import { cookies } from 'next/headers';

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function getSessionUser() {
  // 1. Safely retrieve the cookie container
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  // ❌ CRITICAL: If there is no cookie, stop immediately and return null
  if (!token) {
    return null;
  }

  try {
    // 2. Query your local.db for the active session row
    const result = await turso.execute({
      sql: `SELECT users.* FROM sessions 
            JOIN users ON sessions.user_id = users.id 
            WHERE sessions.id = ? AND sessions.expires_at > ? 
            LIMIT 1`,
      args: [token, Math.floor(Date.now() / 1000)]
    });

    // ❌ CRITICAL: Check if rows actually exist. 
    // An empty array '[]' is truthy and will break 'if (user)' loops!
    if (result.rows && result.rows.length > 0) {
      return result.rows[0]; // Return the single user object record
    }

    // No valid session row matched in the database
    return null;

  } catch (error) {
    console.error("Database session lookup error:", error);
    return null;
  }
}