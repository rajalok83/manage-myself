'use client';

import { useEffect, useMemo, useState } from 'react';
import { decryptData, encryptData } from '@/lib/crypto';

export default function CashLedger({ credentialId, transactionRows, pin, principal, canEdit }) {
  const [rows, setRows] = useState(transactionRows);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setRows(transactionRows), [transactionRows]);

  const transactions = useMemo(() => rows.map((row) => {
    if (row.amount !== null && row.amount !== undefined) {
      return { id: row.id, amount: Number(row.amount), date: row.transaction_date, note: row.note || '' };
    }
    try {
      return { id: row.id, ...JSON.parse(decryptData(row.encrypted_details, pin, row.salt, row.iv)) };
    } catch {
      return { id: row.id, invalid: true };
    }
  }), [rows, pin]);
  const principalCents = Math.round(Number(principal) * 100);
  const paidCents = transactions.reduce((total, transaction) => total + (transaction.invalid ? 0 : Math.round(Number(transaction.amount) * 100)), 0);
  const remainingCents = Math.max(0, principalCents - paidCents);
  const remaining = remainingCents / 100;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > remainingCents) {
      setMessage(`Enter an amount between 0.01 and ${remaining.toFixed(2)}.`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/credentials/${credentialId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: pin
          ? (() => {
              const encrypted = encryptData(JSON.stringify({ amount: amountCents / 100, date, note }), pin);
              return JSON.stringify({ encrypted_details: encrypted.encryptedData, salt: encrypted.salt, iv: encrypted.iv });
            })()
          : JSON.stringify({ amount: amountCents / 100, transaction_date: date, note })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save this payment.');

      const refreshed = await fetch(`/api/credentials/${credentialId}/transactions`, { cache: 'no-store' });
      const refreshedData = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshedData.error || 'Payment saved, but the ledger could not refresh.');
      setRows(refreshedData.transactions || []);
      setAmount('');
      setNote('');
      setMessage('Payment recorded.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section style={ledgerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <strong>Repayment ledger</strong>
        <span>{remainingCents === 0 ? 'Fully repaid' : `Outstanding: ${remaining.toFixed(2)}`}</span>
      </div>
      {transactions.length > 0 && <div style={{ display: 'grid', gap: '6px', marginTop: '10px' }}>
        {transactions.map((transaction) => (
          <div key={transaction.id} style={transactionStyle}>
            {transaction.invalid ? <span>Unable to decrypt this payment.</span> : <>
              <span>{transaction.date || transaction.transaction_date} · {Number(transaction.amount).toFixed(2)}</span>
              {transaction.note && <span>{transaction.note}</span>}
            </>}
          </div>
        ))}
      </div>}
      {canEdit && remainingCents > 0 && <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '12px' }}>
        <label style={fieldLabelStyle}>Payment amount
          <input type="number" min="0.01" max={remaining.toFixed(2)} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required style={fieldStyle} />
        </label>
        <label style={fieldLabelStyle}>Payment date
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required style={fieldStyle} />
        </label>
        <label style={{ ...fieldLabelStyle, gridColumn: '1 / -1' }}>Note
          <input value={note} onChange={(event) => setNote(event.target.value)} style={fieldStyle} />
        </label>
        <button type="submit" disabled={isSaving} style={submitStyle}>{isSaving ? 'Saving...' : 'Record payment'}</button>
      </form>}
      {message && <p role="status" style={{ margin: '8px 0 0', color: message === 'Payment recorded.' ? '#166534' : '#b91c1c', fontSize: '12px' }}>{message}</p>}
    </section>
  );
}

const ledgerStyle = { gridColumn: '1 / -1', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #bbf7d0', display: 'grid', gap: '4px', color: '#22543d', fontSize: '12px' };
const transactionStyle = { display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', padding: '6px 8px', background: '#fff', borderRadius: '4px' };
const fieldLabelStyle = { display: 'grid', gap: '4px', color: '#475569', fontSize: '11px' };
const fieldStyle = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' };
const submitStyle = { padding: '7px 10px', border: 0, borderRadius: '4px', background: '#15803d', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600, justifySelf: 'start' };