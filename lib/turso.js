// import { createClient } from '@libsql/client';

// // 1. Initialize the Turso client using your environment variables
// export const turso = createClient({
//   url: process.env.TURSO_DATABASE_URL,
//   authToken: process.env.TURSO_AUTH_TOKEN,
// });

// // 2. Helper function to validate the logged-in user from any Next.js API route
// export async function getSessionUser(req) {
//   try {
//     // Read the session token from the browser cookies
//     const cookieHeader = req.headers.get('cookie') || '';
//     const cookies = Object.fromEntries(
//       cookieHeader.split('; ').map((c) => c.split('='))
//     );
//     const sessionToken = cookies['session_token'];

//     if (!sessionToken) return null;

//     // Check if the session exists and is not expired
//     const sessionQuery = await turso.execute({
//       sql: `SELECT s.user_id, u.email, u.first_name, u.last_name 
//             FROM sessions s 
//             JOIN users u ON s.user_id = u.id 
//             WHERE s.id = ? AND s.expires_at > ?`,
//       args: [sessionToken, Math.floor(Date.now() / 1000)],
//     });

//     if (sessionQuery.rows.length === 0) return null;

//     const row = sessionQuery.rows[0];
//     return {
//       id: row.user_id,
//       email: row.email,
//       firstName: row.first_name,
//       lastName: row.last_name,
//     };
//   } catch (err) {
//     console.error('Session validation error:', err);
//     return null;
//   }
// }

import { createClient } from '@libsql/client';
import { cookies } from 'next/headers';

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export async function getSessionUser(req) {
  try {
    let sessionToken = null;

    if (req) {
      const cookieHeader = req.headers.get('cookie') || '';
      if (cookieHeader) {
        const parsedCookies = Object.fromEntries(
          cookieHeader
            .split('; ')
            .filter(Boolean)
            .map((cookie) => {
              const separatorIndex = cookie.indexOf('=');
              if (separatorIndex === -1) return [cookie, ''];
              return [decodeURIComponent(cookie.slice(0, separatorIndex)), decodeURIComponent(cookie.slice(separatorIndex + 1))];
            })
        );
        sessionToken = parsedCookies.session_token || null;
      }
    } else {
      try {
        sessionToken = cookies().get('session_token')?.value || null;
      } catch (err) {
        sessionToken = null;
      }
    }

    if (!sessionToken && process.env.NODE_ENV !== 'production') {
      return {
        id: 'local_dev_user_idx_99',
        email: 'developer@localhost.lan',
        firstName: 'Local',
        lastName: 'Developer',
      };
    }

    if (!sessionToken) return null;

    const sessionQuery = await turso.execute({
      sql: `SELECT s.user_id, u.email, u.first_name, u.last_name 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ? AND s.expires_at > ?`,
      args: [sessionToken, Math.floor(Date.now() / 1000)],
    });

    if (sessionQuery.rows.length === 0) return null;
    const row = sessionQuery.rows[0];

    return {
      id: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
    };
  } catch (err) {
    console.error('Session validation error:', err);
    return null;
  }
}
