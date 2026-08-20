import { turso, getSessionUser } from '@/lib/turso';
import { NextResponse } from 'next/server';

// 1. GET: Fetch all active credential items belonging to the logged-in profile
export async function GET(req) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized profile state.' }, { status: 401 });
  }

  try {
    const records = await turso.execute({
      sql: `SELECT id, category, nickname, web_url, login_id, description, created_at 
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
    const { category, nickname, web_url, login_id, encrypted_password, salt, iv, description } = await req.json();

    // Updated validation checks (no longer checking for 'password' or 'pin' strings)
    if (!category || !nickname || !web_url || !login_id || !encrypted_password || !salt || !iv) {
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
      sql: `INSERT INTO credentials (owner_id, category, nickname, web_url, login_id, encrypted_password, salt, iv, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [user.id, category, nickname, web_url, login_id, encrypted_password, salt, iv, description || '']
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
    
    // UPDATED: Expects pre-packaged payload values from the client component
    const { nickname, web_url, login_id, encrypted_password, salt, iv, description } = await req.json();

    // Verify ownership
    const credential = await turso.execute({
      sql: 'SELECT owner_id FROM credentials WHERE id = ?',
      args: [id]
    });

    if (credential.rows.length === 0 || credential.rows[0].owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    // Update the credential using the new client-supplied cryptographic hashes
    await turso.execute({
      sql: `UPDATE credentials 
            SET nickname = ?, web_url = ?, login_id = ?, encrypted_password = ?, salt = ?, iv = ?, description = ?
            WHERE id = ? AND owner_id = ?`,
      args: [nickname, web_url, login_id, encrypted_password, salt, iv, description || '', id, user.id]
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
