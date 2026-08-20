// /home/notroot/projects/manage-myself/app/api/credentials/[id]/decrypt/route.js

import { turso, getSessionUser } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Correctly unwrap params if you are using Next.js 15+
  const { id } = await params; 

  try {
    // 2. CRITICAL FIX: REMOVE the "await req.json()" line that was causing the 400 error.
    
    // Verify if the user owns the credential or if it has been shared with them
    const recordQuery = await turso.execute({
      sql: `SELECT c.encrypted_password, c.salt, c.iv, c.owner_id
            FROM credentials c
            LEFT JOIN credential_shares s ON c.id = s.credential_id AND s.shared_with_user_id = ?
            WHERE c.id = ? AND (c.owner_id = ? OR s.shared_with_user_id = ?)`,
      args: [user.id, id, user.id, user.id]
    });

    if (recordQuery.rows.length === 0) {
      return NextResponse.json({ error: 'Access denied or item not found.' }, { status: 403 });
    }

    // 3. Return the specific object containing crypto keys, not the whole raw array list wrapper
    const row = recordQuery.rows[0];
    return NextResponse.json(row);
    
  } catch (err) {
    return NextResponse.json({ error: 'Database processing failed.' }, { status: 500 });
  }
}
