'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function InvitationManagement() {
  const [email, setEmail] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/invitations', { cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign('/');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Unable to load invitations.');
      setInvitations(data.invitations || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const submitInvite = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to add invitation.');
      setEmail('');
      setMessage(`Invitation added for ${data.email}.`);
      await loadInvitations();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const revokeInvite = async (inviteEmail) => {
    setMessage('');
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to revoke invitation.');
      setMessage(`Invitation revoked for ${data.email}.`);
      await loadInvitations();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
      <Link href="/dashboard" style={{ color: '#2b6cb0', textDecoration: 'none' }}>← Back to vault</Link>
      <h1 style={{ color: '#1a202c', marginBottom: '8px' }}>Manage invitations</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        Only enrolled email addresses and the administrator can sign in. Revoking an invitation blocks existing sessions too.
      </p>

      <form onSubmit={submitInvite} style={{ display: 'flex', gap: '8px', margin: '24px 0' }}>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="person@example.com"
          aria-label="Email address to invite"
          style={{ flex: 1, minWidth: 0, padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px' }}
        />
        <button type="submit" disabled={isSaving} style={buttonStyle}>
          {isSaving ? 'Adding…' : 'Add invitation'}
        </button>
      </form>

      {message && <p role="status" style={{ color: '#2d3748' }}>{message}</p>}
      <h2 style={{ fontSize: '18px', color: '#1a202c' }}>Enrolled email addresses</h2>
      {isLoading ? <p>Loading invitations…</p> : invitations.length === 0 ? (
        <p style={{ color: '#64748b' }}>No invitations have been added.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          {invitations.map((invite) => (
            <li key={invite.email} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#1a202c', overflowWrap: 'anywhere' }}>{invite.email}</div>
                <small style={{ color: invite.revoked_at ? '#c53030' : '#2f855a' }}>
                  {invite.revoked_at ? `Revoked ${invite.revoked_at}` : `Active · added ${invite.created_at}`}
                </small>
              </div>
              {!invite.revoked_at && (
                <button type="button" onClick={() => revokeInvite(invite.email)} style={revokeButtonStyle}>
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const buttonStyle = {
  border: 0,
  borderRadius: '8px',
  padding: '0 16px',
  background: '#2b6cb0',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer'
};

const revokeButtonStyle = {
  border: '1px solid #fed7d7',
  borderRadius: '7px',
  padding: '7px 10px',
  background: '#fff5f5',
  color: '#c53030',
  cursor: 'pointer'
};
