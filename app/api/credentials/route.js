import { turso, getSessionUser } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { category, subcategory, nickname, web_url, login_id, encrypted_password, encrypted_details, salt, iv, description } = await req.json();

    if (category === 'Cards') {
      const cardValues = {
        'card type': subcategory,
        nickname,
        'encrypted card data': encrypted_details,
        salt,
        iv
      };
      const missingFields = Object.entries(cardValues).filter(([, value]) => !String(value || '').trim()).map(([label]) => label);

      if (missingFields.length > 0) {
        return NextResponse.json({ error: `Missing: ${missingFields.join(', ')}.` }, { status: 400 });
      }
      const duplicateCheck = await turso.execute({
        sql: 'SELECT id FROM credentials WHERE owner_id = ? AND nickname = ?',
        args: [user.id, nickname]
      });
      if (duplicateCheck.rows.length > 0) return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });

      await turso.execute(`CREATE TABLE IF NOT EXISTS cards (
        credential_id INTEGER PRIMARY KEY,
        subcategory TEXT NOT NULL,
        nickname TEXT NOT NULL,
        encrypted_details TEXT NOT NULL,
        salt TEXT NOT NULL,
        iv TEXT NOT NULL,
        FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE
      )`);
      const credential = await turso.execute({
        sql: `INSERT INTO credentials (owner_id, category, nickname, web_url, login_id, encrypted_password, salt, iv, description)
              VALUES (?, 'Cards', ?, '', '', '', '', '', ?)`,
        args: [user.id, nickname, description || '']
      });
      const credentialId = credential.lastInsertRowid;
      await turso.execute({
        sql: `INSERT INTO cards (credential_id, subcategory, nickname, encrypted_details, salt, iv)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [credentialId, subcategory, nickname, encrypted_details, salt, iv]
      });
      return NextResponse.json({ success: true }, { status: 201 });
    }

    // Validate Nickname Uniqueness across this specific profile scope
    if (!category || !nickname || !web_url || !login_id || !encrypted_password || !salt || !iv) {
      return NextResponse.json({ error: 'Encrypted credential fields are required.' }, { status: 400 });
    }

    const duplicateCheck = await turso.execute({
      sql: "SELECT id FROM credentials WHERE owner_id = ? AND nickname = ?",
      args: [user.id, nickname]
    });
    
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });
    }

    await turso.execute({
      sql: `INSERT INTO credentials (owner_id, category, nickname, web_url, login_id, encrypted_password, salt, iv, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [user.id, category, nickname, web_url, login_id, encrypted_password, salt, iv, description]
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

