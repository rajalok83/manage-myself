import { turso, getSessionUser } from '@/lib/turso';
import { encryptData } from '@/lib/crypto';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { category, nickname, web_url, login_id, password, pin, description } = await req.json();

    // Validate Nickname Uniqueness across this specific profile scope
    const duplicateCheck = await turso.execute({
      sql: "SELECT id FROM credentials WHERE owner_id = ? AND nickname = ?",
      args: [user.id, nickname]
    });
    
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });
    }

    // Process secure real-time encryption block transforms
    const { encryptedData, salt, iv } = encryptData(password, pin);

    await turso.execute({
      sql: `INSERT INTO credentials (owner_id, category, nickname, web_url, login_id, encrypted_password, salt, iv, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [user.id, category, nickname, web_url, login_id, encryptedData, salt, iv, description]
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

