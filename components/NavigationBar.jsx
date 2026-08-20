'use client';

import { useState } from 'react';

export default function NavigationBar({ user, activeView = 'vault', onViewChange, sharedWithMeCount = 0, sharedByMeCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (viewId) => {
    if (onViewChange) onViewChange(viewId);
    setIsOpen(false);
  };

  const navItems = [
    { id: 'vault', label: 'My Vault', icon: '🏠' },
    { id: 'shared_with_me', label: `Shared With Me (${sharedWithMeCount})`, icon: '📥' },
    { id: 'shared_by_me', label: `Shared By Me (${sharedByMeCount})`, icon: '📤' }
  ];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: '12px 16px',
      background: 'transparent'
    }}>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          aria-label="Open site menu"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#1a202c'
          }}
        >
          ☰
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '52px',
            right: 0,
            width: '280px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.14)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 16px 12px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #edf6ff 100%)',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#3182ce',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700'
                }}>
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#1a202c', fontSize: '14px' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '12px', wordBreak: 'break-all' }}>
                    {user.email}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
                Secure Vault
              </div>
            </div>

            <div style={{ padding: '8px 0' }}>
              <button
                type="button"
                onClick={() => handleSelect('vault')}
                style={{
                  width: '100%',
                  border: 'none',
                  background: activeView === 'vault' ? '#eff6ff' : 'transparent',
                  color: '#1a202c',
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span>🏠</span>
                <span>My Vault</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('shared_with_me')}
                style={{
                  width: '100%',
                  border: 'none',
                  background: activeView === 'shared_with_me' ? '#eff6ff' : 'transparent',
                  color: '#1a202c',
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span>📥</span>
                <span>Shared With Me ({sharedWithMeCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('shared_by_me')}
                style={{
                  width: '100%',
                  border: 'none',
                  background: activeView === 'shared_by_me' ? '#eff6ff' : 'transparent',
                  color: '#1a202c',
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span>📤</span>
                <span>Shared By Me ({sharedByMeCount})</span>
              </button>

              <div style={{ borderTop: '1px solid #edf2f7', margin: '8px 0' }} />

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: '#1a202c',
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span>👤</span>
                <span>View Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: '#1a202c',
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span>✏️</span>
                <span>Edit Profile</span>
              </button>

              <a
                href="/api/auth/logout"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  textDecoration: 'none',
                  color: '#e53e3e',
                  fontSize: '14px',
                  background: 'transparent'
                }}
              >
                <span>🚪</span>
                <span>Logout</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
