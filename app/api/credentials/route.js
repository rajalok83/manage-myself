import { turso, getSessionUser, ensureCredentialMetadataColumns, ensureNotesTables } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureCredentialMetadataColumns();
    await ensureNotesTables();
    const { category, subcategory, nickname, encrypted_password, encrypted_details, encrypted_metadata, metadata_salt, metadata_iv, salt, iv, plain_details } = await req.json();

    try {
      await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }

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
      const noteDuplicate = await turso.execute({
        sql: 'SELECT id FROM notes WHERE owner_id = ? AND nickname = ?',
        args: [user.id, nickname]
      });
      if (noteDuplicate.rows.length > 0) return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });

      const credential = await turso.execute({
          sql: `INSERT INTO credentials (owner_id, category, subcategory, nickname, encrypted_metadata, metadata_salt, metadata_iv, encrypted_password, salt, iv, encrypted_details)
            VALUES (?, 'Cards', ?, ?, ?, ?, ?, '', ?, ?, ?)`,
          args: [user.id, subcategory, nickname, encrypted_metadata, metadata_salt, metadata_iv, salt, iv, encrypted_details]
      });
      return NextResponse.json({ success: true }, { status: 201 });
    }

    if (category === 'Cash') {
      const details = plain_details || {};
      if (!nickname?.trim() || !['Lent', 'Borrowed'].includes(subcategory) || !String(details.counterparty || '').trim() || !String(details.date || '').trim() || !Number.isFinite(Number(details.amount)) || Number(details.amount) <= 0) {
        return NextResponse.json({ error: 'A type, nickname, person, positive amount, and date are required.' }, { status: 400 });
      }
      const [credentialDuplicate, noteDuplicate] = await Promise.all([
        turso.execute({ sql: 'SELECT id FROM credentials WHERE owner_id = ? AND nickname = ?', args: [user.id, nickname.trim()] }),
        turso.execute({ sql: 'SELECT id FROM notes WHERE owner_id = ? AND nickname = ?', args: [user.id, nickname.trim()] })
      ]);
      if (credentialDuplicate.rows.length || noteDuplicate.rows.length) {
        return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });
      }
      await turso.execute({
        sql: `INSERT INTO credentials (owner_id, category, subcategory, nickname, encrypted_password, salt, iv, plain_details)
          VALUES (?, 'Cash', ?, ?, '', '', '', ?)`,
        args: [user.id, subcategory, nickname.trim(), JSON.stringify({
          counterparty: String(details.counterparty).trim(),
          amount: Number(details.amount),
          date: details.date
        })]
      });
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const isIdentity = category === 'Identity';

    // Identity records do not contain website or login fields.
    if (!category || !nickname || !encrypted_password || !salt || !iv || !encrypted_metadata || !metadata_salt || !metadata_iv) {
      return NextResponse.json({ error: 'Encrypted credential fields are required.' }, { status: 400 });
    }

    const duplicateCheck = await turso.execute({
      sql: "SELECT id FROM credentials WHERE owner_id = ? AND nickname = ?",
      args: [user.id, nickname]
    });
    
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });
    }
    const noteDuplicate = await turso.execute({
      sql: 'SELECT id FROM notes WHERE owner_id = ? AND nickname = ?',
      args: [user.id, nickname]
    });
    if (noteDuplicate.rows.length > 0) return NextResponse.json({ error: 'This nickname is already in use.' }, { status: 400 });

    await turso.execute({
      sql: `INSERT INTO credentials (owner_id, category, subcategory, nickname, encrypted_metadata, metadata_salt, metadata_iv, encrypted_password, salt, iv)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [user.id, category, subcategory || '', nickname, encrypted_metadata, metadata_salt, metadata_iv, encrypted_password, salt, iv]
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

