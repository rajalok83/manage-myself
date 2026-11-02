import { turso, getSessionUser, ensureCredentialMetadataColumns, ensureCashTransactionsTable } from '@/lib/turso';
import { NextResponse } from 'next/server';

async function getCashAccess(userId, id) {
  const result = await turso.execute({
    sql: `SELECT c.owner_id, c.category, c.plain_details, s.share_mode
      FROM credentials c
      LEFT JOIN credential_shares s ON c.id = s.credential_id AND s.shared_with_user_id = ?
      WHERE c.id = ? AND (c.owner_id = ? OR s.shared_with_user_id = ?)`,
    args: [userId, id, userId, userId]
  });
  return result.rows[0];
}

export async function GET(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    await ensureCredentialMetadataColumns();
    await ensureCashTransactionsTable();
    const access = await getCashAccess(user.id, id);
    if (!access || access.category !== 'Cash') return NextResponse.json({ error: 'Cash record not found.' }, { status: 404 });
    const transactions = await turso.execute({
      sql: 'SELECT id, encrypted_details, salt, iv, amount, transaction_date, note, created_at FROM cash_transactions WHERE credential_id = ? ORDER BY id ASC',
      args: [id]
    });
    return NextResponse.json({ transactions: transactions.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to load cash transactions.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    await ensureCredentialMetadataColumns();
    await ensureCashTransactionsTable();
    const access = await getCashAccess(user.id, id);
    if (!access || access.category !== 'Cash') return NextResponse.json({ error: 'Cash record not found.' }, { status: 404 });
    if (access.owner_id !== user.id && access.share_mode !== 'edit') {
      return NextResponse.json({ error: 'You do not have permission to add transactions.' }, { status: 403 });
    }

    const payload = await request.json();
    if (access.plain_details) {
      const amount = Number(payload.amount);
      const transactionDate = String(payload.transaction_date || '').trim();
      if (!Number.isFinite(amount) || amount <= 0 || !transactionDate) {
        return NextResponse.json({ error: 'A positive payment amount and date are required.' }, { status: 400 });
      }
      const principal = Number(JSON.parse(access.plain_details).amount);
      const totals = await turso.execute({
        sql: 'SELECT COALESCE(SUM(amount), 0) AS paid FROM cash_transactions WHERE credential_id = ?',
        args: [id]
      });
      const paid = Number(totals.rows[0]?.paid || 0);
      if (Math.round(amount * 100) > Math.round((principal - paid) * 100)) {
        return NextResponse.json({ error: 'Payment exceeds the outstanding balance.' }, { status: 400 });
      }
      await turso.execute({
        sql: `INSERT INTO cash_transactions (credential_id, amount, transaction_date, note, encrypted_details, salt, iv)
          VALUES (?, ?, ?, ?, '', '', '')`,
        args: [id, Math.round(amount * 100) / 100, transactionDate, String(payload.note || '').trim()]
      });
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const { encrypted_details, salt, iv } = payload;
    if (![encrypted_details, salt, iv].every((value) => typeof value === 'string' && value.trim())) {
      return NextResponse.json({ error: 'Encrypted transaction fields are required for this legacy cash record.' }, { status: 400 });
    }
    await turso.execute({
      sql: 'INSERT INTO cash_transactions (credential_id, encrypted_details, salt, iv) VALUES (?, ?, ?, ?)',
      args: [id, encrypted_details, salt, iv]
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to save cash transaction.' }, { status: 500 });
  }
}