import { turso, getSessionUser, ensureCredentialMetadataColumns, ensureCredentialShareColumns } from '@/lib/turso';
import { NextResponse } from 'next/server';

// 1. GET: Fetch all active credential items belonging to the logged-in profile
export async function GET(req) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized profile state.' }, { status: 401 });
  }

  try {
    await ensureCredentialMetadataColumns();
    const records = await turso.execute({
      sql: `SELECT id, category, subcategory, nickname, created_at
            FROM credentials 
            WHERE owner_id = ? 
            ORDER BY created_at DESC`,
      args: [user.id]
    });

    return NextResponse.json({ credentials: records.rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST: Securely receive browser-encrypted parameters and create a new database row
export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized profile state.' }, { status: 401 });
  }

  try {
    // UPDATED: Now destructuring the encrypted crypto structures sent from the frontend
    const { category, subcategory, nickname, encrypted_password, encrypted_metadata, metadata_salt, metadata_iv, salt, iv } = await req.json();

    // Updated validation checks (no longer checking for 'password' or 'pin' strings)
    if (!category || !nickname || !encrypted_password || !encrypted_metadata || !metadata_salt || !metadata_iv || !salt || !iv) {
      return NextResponse.json({ error: 'Missing mandatory registration fields.' }, { status: 400 });
    }

    // Uniqueness Verification: Check for duplicate nicknames across this specific profile scope
    const duplicateCheck = await turso.execute({
      sql: "SELECT id FROM credentials WHERE owner_id = ? AND nickname = ?",
      args: [user.id, nickname]
    });
    
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });
    }

    // Commit parameters into your Turso database (No server-side encryption execution)
    await turso.execute({
      sql: `INSERT INTO credentials (owner_id, category, subcategory, nickname, encrypted_metadata, metadata_salt, metadata_iv, encrypted_password, salt, iv)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [user.id, category, subcategory || '', nickname, encrypted_metadata, metadata_salt, metadata_iv, encrypted_password, salt, iv]
    });

    return NextResponse.json({ success: true, message: 'Vault item saved successfully!' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. PUT: Update an existing credential entry using client-encrypted data
export async function PUT(req, { params }) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized profile state.' }, { status: 401 });
  }

  try {
    const { id } = await params; // Wrapped in await for Next.js 15+ safety
    await ensureCredentialMetadataColumns();
    await ensureCredentialShareColumns();
    try {
      await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }
    
    // UPDATED: Expects pre-packaged payload values from the client component
    const { nickname, subcategory, encrypted_password, encrypted_details, encrypted_metadata, metadata_salt, metadata_iv, salt, iv } = await req.json();

    // Verify ownership
    const credential = await turso.execute({
      sql: `SELECT c.owner_id, c.category,
                   (SELECT s.share_mode FROM credential_shares s WHERE s.credential_id = c.id AND s.shared_with_user_id = ?) AS share_mode
            FROM credentials c WHERE c.id = ?`,
      args: [user.id, id]
    });

    if (credential.rows.length === 0 || (credential.rows[0].owner_id !== user.id && credential.rows[0].share_mode !== 'edit')) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    const recordCategory = credential.rows[0].category;
    if (recordCategory === 'Cards') {
      if (!nickname || !encrypted_details || !encrypted_metadata || !metadata_salt || !metadata_iv || !salt || !iv) {
        return NextResponse.json({ error: 'Required card fields are missing.' }, { status: 400 });
      }
      await turso.execute({
        sql: `UPDATE credentials SET nickname = ?, subcategory = ?, encrypted_metadata = ?, metadata_salt = ?, metadata_iv = ?,
          encrypted_details = COALESCE(?, encrypted_details), salt = COALESCE(?, salt), iv = COALESCE(?, iv) WHERE id = ?`,
        args: [nickname, subcategory || '', encrypted_metadata, metadata_salt, metadata_iv, encrypted_details || null, encrypted_details ? salt : null, encrypted_details ? iv : null, id]
      });
      return NextResponse.json({ success: true, message: 'Card updated successfully!' }, { status: 200 });
    }

    const isIdentity = recordCategory === 'Identity';
    if (!nickname || !encrypted_password || !salt || !iv || !encrypted_metadata || !metadata_salt || !metadata_iv) {
      return NextResponse.json({ error: 'Required credential fields are missing.' }, { status: 400 });
    }

    // Update the credential using the new client-supplied cryptographic hashes
    await turso.execute({
      sql: `UPDATE credentials 
        SET nickname = ?, subcategory = ?, encrypted_metadata = ?, metadata_salt = ?, metadata_iv = ?, encrypted_password = ?, salt = ?, iv = ?
            WHERE id = ?`,
          args: [nickname, subcategory || '', encrypted_metadata, metadata_salt, metadata_iv, encrypted_password, salt, iv, id]
    });

    return NextResponse.json({ success: true, message: 'Credential updated successfully!' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. DELETE: Remove a credential entry and all associated shares
export async function DELETE(req, { params }) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized profile state.' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify ownership
    const credential = await turso.execute({
      sql: 'SELECT owner_id FROM credentials WHERE id = ?',
      args: [id]
    });

    if (credential.rows.length === 0 || credential.rows[0].owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    // Delete all credential shares associated with this credential
    await turso.execute({
      sql: 'DELETE FROM credential_shares WHERE credential_id = ?',
      args: [id]
    });

    // Delete the credential itself
    await turso.execute({
      sql: 'DELETE FROM credentials WHERE id = ? AND owner_id = ?',
      args: [id, user.id]
    });

    return NextResponse.json({ success: true, message: 'Credential deleted successfully!' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
