// /home/notroot/projects/manage-myself/app/api/credentials/[id]/decrypt/route.js

import { turso, getSessionUser, ensureCredentialMetadataColumns, ensureCredentialShareColumns } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Correctly unwrap params if you are using Next.js 15+
  const { id } = await params; 

  try {
    await ensureCredentialMetadataColumns();
    await ensureCredentialShareColumns();
    // 2. CRITICAL FIX: REMOVE the "await req.json()" line that was causing the 400 error.
    
    // Verify if the user owns the credential or if it has been shared with them
    const recordQuery = await turso.execute({
      sql: `SELECT c.encrypted_password, c.salt, c.iv, c.owner_id,
           c.encrypted_metadata, c.metadata_salt, c.metadata_iv, s.share_mode
            FROM credentials c
            LEFT JOIN credential_shares s ON c.id = s.credential_id AND s.shared_with_user_id = ?
            WHERE c.id = ? AND (c.owner_id = ? OR s.shared_with_user_id = ?)`,
      args: [user.id, id, user.id, user.id]
    });

    if (recordQuery.rows.length === 0) {
      return NextResponse.json({ error: 'Access denied or item not found.' }, { status: 403 });
    }

    const categoryQuery = await turso.execute({ sql: 'SELECT category FROM credentials WHERE id = ?', args: [id] });
    if (categoryQuery.rows[0]?.category === 'Cards') {
      return NextResponse.json({ error: 'A PIN is required to reveal card details.' }, { status: 405 });
    }

    // 3. Return the specific object containing crypto keys, not the whole raw array list wrapper
    const row = recordQuery.rows[0];
    if (row.share_mode === 'once') {
      await turso.execute({
        sql: 'DELETE FROM credential_shares WHERE credential_id = ? AND shared_with_user_id = ? AND share_mode = ?',
        args: [id, user.id, 'once']
      });
    }
    return NextResponse.json(row);
    
  } catch (err) {
    return NextResponse.json({ error: 'Database processing failed.' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await ensureCredentialMetadataColumns();
    await ensureCredentialShareColumns();
    const access = await turso.execute({
       sql: `SELECT c.category, c.owner_id, s.shared_with_user_id, c.subcategory, c.nickname,
         c.encrypted_details, c.salt, c.iv,
           c.encrypted_metadata, c.metadata_salt, c.metadata_iv, s.share_mode
            FROM credentials c
            LEFT JOIN credential_shares s ON c.id = s.credential_id AND s.shared_with_user_id = ?
            WHERE c.id = ? AND (c.owner_id = ? OR s.shared_with_user_id = ?)`,
      args: [user.id, id, user.id, user.id]
    });
    if (!access.rows.length) return NextResponse.json({ error: 'Access denied or card not found.' }, { status: 403 });

    const row = access.rows[0];
    if (row.share_mode === 'once') {
      await turso.execute({
        sql: 'DELETE FROM credential_shares WHERE credential_id = ? AND shared_with_user_id = ? AND share_mode = ?',
        args: [id, user.id, 'once']
      });
    }
    if (row.category !== 'Cards' || !row.encrypted_details || !row.salt || !row.iv) {
      return NextResponse.json({ error: 'Card details are unavailable for this credential.' }, { status: 422 });
    }
    return NextResponse.json({
      card: {
        subcategory: row.subcategory,
        nickname: row.nickname,
        encrypted_metadata: row.encrypted_metadata,
        metadata_salt: row.metadata_salt,
        metadata_iv: row.metadata_iv,
        encrypted_details: row.encrypted_details,
        salt: row.salt,
        iv: row.iv
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Card processing failed.' }, { status: 400 });
  }
}
