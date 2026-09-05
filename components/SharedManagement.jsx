'use client';

import { useState, useEffect } from 'react';
import CredentialRow from './CredentialRow';

export default function SharedManagement({ initialSharedByMe, initialSharedWithMe, activeTab: parentActiveTab, onRefresh }) {
  const [sharedByMe, setSharedByMe] = useState(initialSharedByMe);
  const [sharedWithMe, setSharedWithMe] = useState(initialSharedWithMe);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
      }
    };

    loadShares();
    return () => { cancelled = true; };
  }, [parentActiveTab]);

  // Sends database calls to wipe explicit permission records immediately
  const handleRevokeShare = async (credentialId, recipientEmail) => {
    if (!confirm(`Are you sure you want to stop sharing this entry with ${recipientEmail}?`)) return;

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
      alert('Access privileges successfully revoked.');
    } catch (err) {
      alert(err.message);
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
                      onClick={() => handleRevokeShare(item.id, item.shared_with)}
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
    </div>
  );
}
