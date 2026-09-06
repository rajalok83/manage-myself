'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { startLoading, stopLoading } from '@/lib/loading';

export default function NavigationBar({ user, activeView = 'vault', onViewChange, sharedWithMeCount = 0, sharedByMeCount = 0 }) {
  const navRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [profileMode, setProfileMode] = useState(null);
  const [profile, setProfile] = useState({
    firstName: user.firstName || user.first_name || '',
    lastName: user.lastName || user.last_name || '',
    email: user.email || ''
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [sharedWithMeTotal, setSharedWithMeTotal] = useState(sharedWithMeCount);
  const [sharedByMeTotal, setSharedByMeTotal] = useState(sharedByMeCount);

  useEffect(() => {
    setSharedWithMeTotal(sharedWithMeCount);
    setSharedByMeTotal(sharedByMeCount);
  }, [sharedWithMeCount, sharedByMeCount]);

  useEffect(() => {
    const handleCredentialShared = () => setSharedByMeTotal((count) => count + 1);
    window.addEventListener('credential-shared', handleCredentialShared);
    return () => window.removeEventListener('credential-shared', handleCredentialShared);
  }, []);

  useEffect(() => {
    const closeNavbarOutside = (event) => {
      if (!navRef.current?.contains(event.target)) {
        setIsOpen(false);
        setProfileMode(null);
      }
    };

    document.addEventListener('pointerdown', closeNavbarOutside);
    return () => document.removeEventListener('pointerdown', closeNavbarOutside);
  }, []);

  const handleSelect = (viewId) => {
    if (viewId === 'vault' && window.location.pathname !== '/dashboard') {
      window.location.assign('/dashboard');
    } else if (onViewChange) {
      onViewChange(viewId);
    }
    setIsOpen(false);
  };

  const openProfile = (mode) => {
    setProfileMessage('');
    setProfileMode(mode);
    setIsOpen(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage('');
    startLoading();

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: profile.firstName, lastName: profile.lastName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update profile.');
      setProfileMessage('Profile updated.');
      setProfileMode('view');
    } catch (error) {
      setProfileMessage(error.message);
    } finally {
      setIsSavingProfile(false);
      stopLoading();
    }
  };

  const navItems = [
    { id: 'vault', label: 'My Vault', icon: '🔐' },
    { id: 'shared_with_me', label: `Shared With Me (${sharedWithMeTotal})`, icon: '📥' },
    { id: 'shared_by_me', label: `Shared By Me (${sharedByMeTotal})`, icon: '📤' }
  ];

  return (
    <nav ref={navRef} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      background: '#f7fafc',
      boxSizing: 'border-box'
    }}>
      <Link
        href="/dashboard"
        aria-label="Go to dashboard"
        onClick={(event) => {
          event.preventDefault();
          window.location.assign('/dashboard');
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#1a202c',
          fontSize: '16px',
          fontWeight: '700',
          textDecoration: 'none'
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '22px', lineHeight: 1 }}>🔐 Manage Myself</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#1a202c', fontSize: '14px' }}>
                    {profile.firstName} {profile.lastName}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '12px', wordBreak: 'break-all' }}>
                    {profile.email}
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
                <span aria-hidden="true">🔐</span>
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
                <span aria-hidden="true">📥</span>
                <span>Shared With Me ({sharedWithMeTotal})</span>
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
                <span aria-hidden="true">📤</span>
                <span>Shared By Me ({sharedByMeTotal})</span>
              </button>

              <div style={{ borderTop: '1px solid #edf2f7', margin: '8px 0' }} />

              <button
                type="button"
                onClick={() => openProfile('view')}
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
                onClick={() => openProfile('edit')}
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
      </div>

      {profileMode && (
        <div
          role="presentation"
          onClick={() => setProfileMode(null)}
          style={profileOverlayStyle}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={profileDialogStyle}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <h2 id="profile-dialog-title" style={{ margin: 0, fontSize: '20px', color: '#1a202c' }}>
                {profileMode === 'edit' ? 'Edit Profile' : 'Your Profile'}
              </h2>
              <button type="button" aria-label="Close profile" onClick={() => setProfileMode(null)} style={closeButtonStyle}>×</button>
            </div>

            {profileMode === 'edit' ? (
              <form onSubmit={saveProfile} style={{ display: 'grid', gap: '12px', marginTop: '18px' }}>
                <label style={labelStyle}>
                  First name
                  <input value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Last name
                  <input value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Email
                  <input value={profile.email} readOnly style={{ ...inputStyle, backgroundColor: '#f1f5f9' }} />
                </label>
                <button type="submit" disabled={isSavingProfile} style={saveButtonStyle}>
                  {isSavingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'grid', gap: '8px', marginTop: '18px', color: '#475569' }}>
                <strong style={{ color: '#1a202c', fontSize: '18px' }}>{profile.firstName} {profile.lastName}</strong>
                <span>{profile.email}</span>
                <button type="button" onClick={() => setProfileMode('edit')} style={saveButtonStyle}>Edit profile</button>
              </div>
            )}
            {profileMessage && <p style={{ margin: '12px 0 0', color: profileMessage === 'Profile updated.' ? '#15803d' : '#b91c1c', fontSize: '13px' }}>{profileMessage}</p>}
          </section>
        </div>
      )}
    </nav>
  );
}

const navButtonStyle = {
  border: 'none',
  borderRadius: '8px',
  padding: '8px 10px',
  background: '#fff',
  color: '#1a202c',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer'
};

const profileOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  background: 'rgba(15, 23, 42, 0.45)'
};

const profileDialogStyle = {
  width: '100%',
  maxWidth: '420px',
  padding: '24px',
  borderRadius: '16px',
  background: '#fff',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)'
};

const closeButtonStyle = {
  border: 'none',
  background: 'transparent',
  color: '#64748b',
  fontSize: '26px',
  cursor: 'pointer'
};

const labelStyle = {
  display: 'grid',
  gap: '6px',
  color: '#475569',
  fontSize: '13px',
  fontWeight: '600'
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '14px'
};

const saveButtonStyle = {
  border: 'none',
  borderRadius: '8px',
  padding: '10px 14px',
  background: '#2563eb',
  color: '#fff',
  fontWeight: '700',
  cursor: 'pointer'
};
