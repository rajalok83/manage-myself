'use client';

import { useState, useEffect } from 'react';
import CredentialRow from './CredentialRow';
import { showToast } from '@/lib/toast';
import { startLoading, stopLoading } from '@/lib/loading';

export default function SharedManagement({ initialSharedByMe, initialSharedWithMe, activeTab: parentActiveTab, onRefresh }) {
  const [sharedByMe, setSharedByMe] = useState(initialSharedByMe);
  const [sharedWithMe, setSharedWithMe] = useState(initialSharedWithMe);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    return parentActiveTab === 'shared_by_me' ? 'by_me' : 'with_me';
  });

  // Update internal activeTab when parentActiveTab changes
  useEffect(() => {
    if (parentActiveTab === 'shared_by_me') {
      setActiveTab('by_me');
    } else if (parentActiveTab === 'shared_with_me') {
      setActiveTab('with_me');
    }
  }, [parentActiveTab]);

  useEffect(() => {
    setSharedByMe(initialSharedByMe || []);
    setSharedWithMe(initialSharedWithMe || []);
  }, [initialSharedByMe, initialSharedWithMe]);

  useEffect(() => {
    let cancelled = false;

    const loadShares = async () => {
      setIsLoading(true);
      setErrorMessage('');
      startLoading();

      try {
        const response = await fetch('/api/share', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load shared credentials.');
        if (!cancelled) {
          setSharedByMe(data.sharedByMe || []);
          setSharedWithMe(data.sharedWithMe || []);
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(error.message);
      } finally {
        if (!cancelled) setIsLoading(false);
        stopLoading();
      }
    };

    loadShares();
    return () => { cancelled = true; };
  }, [parentActiveTab]);

  // Sends database calls to wipe explicit permission records immediately
  const handleRevokeShare = async (credentialId, recipientEmail) => {
    startLoading();
    try {
      const res = await fetch('/api/share/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId, recipientEmail })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to remove share entry.');
      }

      // Filter local state instantly on success
      setSharedByMe(prev => prev.filter(item => !(item.id === credentialId && item.shared_with === recipientEmail)));
      if (onRefresh) await onRefresh();
      showToast('Access privileges revoked.', 'success');
    } catch (err) {
      showToast(err.message);
    } finally {
      stopLoading();
    }
  };

  return (
    <div>
      {errorMessage && <p style={{ color: '#e53e3e' }}>{errorMessage}</p>}
      {isLoading && <p style={{ color: '#718096' }}>Loading shared credentials...</p>}
      {/* Workspace Display Area Panels */}
      <div>
        {activeTab === 'with_me' ? (
          <div>
            {sharedWithMe.length === 0 ? (
              <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>No vault entries have been shared with you yet.</p>
            ) : (
              sharedWithMe.map((item) => (
                <CredentialRow key={`shared-wm-${item.id}`} item={item} isSharedView={true} onRefresh={onRefresh} />
              ))
            )}
          </div>
        ) : (
          <div>
            {sharedByMe.length === 0 ? (
              <p style={{ color: '#718096', fontStyle: 'italic', margin: 0 }}>You are not currently sharing any credentials with others.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sharedByMe.map((item, index) => (
                  <div
                    key={`shared-bm-${item.id}-${index}`}
                    style={{ display: 'grid', gap: '6px' }}
                  >
                    <CredentialRow item={item} isSharedView={false} onRefresh={onRefresh} />
                    <button 
                      onClick={() => setRevokeTarget({ id: item.id, email: item.shared_with })}
                      style={{ padding: '6px 10px', color: '#e53e3e', backgroundColor: '#fff', border: '1px solid #fed7d7', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      Revoke Access
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {revokeTarget && (
        <div style={confirmOverlayStyle}>
          <div style={confirmDialogStyle} role="dialog" aria-modal="true">
            <strong>Revoke access?</strong>
            <p style={{ margin: '8px 0', color: '#64748b', fontSize: '13px' }}>Remove access for {revokeTarget.email}?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setRevokeTarget(null)} style={smallCancelButtonStyle}>Cancel</button>
              <button type="button" onClick={async () => { const target = revokeTarget; setRevokeTarget(null); await handleRevokeShare(target.id, target.email); }} style={smallDangerButtonStyle}>Revoke</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const smallCancelButtonStyle = { padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '12px' };
const smallDangerButtonStyle = { padding: '7px 12px', border: 'none', borderRadius: '6px', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' };
const confirmOverlayStyle = { position: 'fixed', inset: 0, zIndex: 450, display: 'grid', placeItems: 'center', padding: '20px', background: 'rgba(15, 23, 42, 0.35)' };
const confirmDialogStyle = { width: '100%', maxWidth: '340px', padding: '18px', borderRadius: '12px', background: '#fff', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.2)', color: '#1f2937' };
