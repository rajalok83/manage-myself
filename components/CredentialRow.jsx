'use client';

import { useState } from 'react';
import { encryptData, decryptData } from '@/lib/crypto';

export default function CredentialRow({ item, isSharedView = false, onRefresh }) {
  const [pin, setPin] = useState('');
  const [decryptedPassword, setDecryptedPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showPasswordReveal, setShowPasswordReveal] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);

  const [editForm, setEditForm] = useState({
    nickname: item.nickname,
    web_url: item.web_url,
    login_id: item.login_id,
    description: item.description || ''
  });

  const handleReveal = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    try {
      const res = await fetch(`/api/credentials/${item.id}/info`, {
        method: 'GET',
        // method: 'POST',
        // headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({ pin })
      });
      // const data = await res.json();

      if (!res.ok) {
        throw new Error('Failed to retrieve credential data');
      }

      const { encrypted_password, salt, iv } = await res.json();

      // 2. Perform local client-side decryption processing 
      const decryptedPassword = decryptData(encrypted_password, pin, salt, iv);
      // console.log(decryptedPassword);
      setDecryptedPassword(decryptedPassword);
      setShowPasswordReveal(true);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const encryptionPayload = encryptData(decryptedPassword, pin);
      const res = await fetch(`/api/credentials/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, encrypted_password: encryptionPayload.encryptedData, // Make sure your object mapping keys align!
          salt: encryptionPayload.salt, 
          iv: encryptionPayload.iv 
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Update execution failed');
      
      setIsEditing(false);
      setDecryptedPassword('');
      setPin('');
      setShowMenu(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: item.id, targetEmail: shareEmail })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Sharing error occurred');
      
      alert('Vault item linked successfully!');
      setShareEmail('');
      setShowShareForm(false);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${item.nickname}"? This action cannot be undone.`)) {
      return;
    }

    setErrorMessage('');
    try {
      const res = await fetch(`/api/credentials/${item.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to delete credential');
      
      alert('Credential deleted successfully.');
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Close menu if not editing
  if (!isEditing && !showPasswordReveal && !showShareForm) {
    return (
      <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          {/* Card Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 'clamp(15px, 3vw, 16px)', fontWeight: '600', color: '#2d3748' }}>
              {item.nickname}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ margin: 0, fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#718096' }}>
                <span style={{ fontWeight: '500' }}>Login:</span> {item.login_id}
              </p>
              <p style={{ margin: 0, fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#718096', wordBreak: 'break-all' }}>
                <span style={{ fontWeight: '500' }}>URL:</span> <a href={item.web_url} target="_blank" rel="noreferrer" style={{ color: '#3182ce', textDecoration: 'none' }}>{item.web_url}</a>
              </p>
              {item.description && <p style={{ margin: 0, fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#4a5568' }}>{item.description}</p>}
              {isSharedView && <p style={{ margin: '6px 0 0 0', fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#3182ce', fontWeight: '500' }}>📤 Shared by: {item.shared_by}</p>}
            </div>
          </div>

          {/* 3-Dot Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                color: '#718096',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#2d3748'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#718096'}
            >
              ⋮
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '140px',
                zIndex: 10,
                overflow: 'hidden'
              }}>
                {!isSharedView && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowShareForm(!showShareForm);
                        setShowMenu(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      📤 Share
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowPasswordReveal(!showPasswordReveal);
                    setShowMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#2d3748',
                    borderBottom: '1px solid #e2e8f0',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  👁️ Reveal
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#e53e3e',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>{errorMessage}</p>}

        {/* Share Form */}
        {showShareForm && !isSharedView && (
          <form onSubmit={handleShare} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="email" 
              placeholder="user@example.com" 
              value={shareEmail} 
              onChange={(e) => setShareEmail(e.target.value)} 
              required 
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e0', minWidth: '140px', flex: '1' }}
            />
            <button type="submit" style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Share</button>
            <button type="button" onClick={() => setShowShareForm(false)} style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          </form>
        )}
      </div>
    );
  }

  // Password Reveal State
  if (showPasswordReveal && !isEditing) {
    return (
      <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 'clamp(15px, 3vw, 16px)', fontWeight: '600', color: '#2d3748' }}>
              {item.nickname}
            </h3>
            <form onSubmit={handleReveal} style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input 
                type="password" 
                placeholder="Enter PIN" 
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                required 
                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e0', fontSize: '12px', minWidth: '100px', flex: '1' }}
              />
              <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#48bb78', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>Reveal</button>
            </form>
            {decryptedPassword && (
              <div style={{ padding: '10px', backgroundColor: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#22543d', fontWeight: '500' }}>Password:</p>
                <code style={{ fontSize: '13px', color: '#2d3748', wordBreak: 'break-all' }}>{decryptedPassword}</code>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setShowPasswordReveal(false);
              setDecryptedPassword('');
              setPin('');
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              color: '#718096'
            }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Editing State
  if (isEditing) {
    return (
      <div style={{ padding: '14px', border: '2px solid #3182ce', borderRadius: '8px', backgroundColor: '#ebf8ff', marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 'clamp(15px, 3vw, 16px)', fontWeight: '600', color: '#2d3748' }}>
          Edit: {item.nickname}
        </h3>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '600' }}>Subcategory</span>
          <select
            value={editForm.subcategory}
            onChange={(e) => handleChange('subcategory', e.target.value)}
            required
            // style={fieldStyle}
          >
            <option value="" disabled>{editForm.subcategory}</option>
            {/* {subCategories.map((sub, idx) => (
              <option key={idx} value={sub}>{sub}</option>
            ))} */}
          </select>
        </label>
          <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Nickname:
            <input type="text" value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} required style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }} />
          </label>
          <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Web URL:
            <input type="url" value={editForm.web_url} onChange={(e) => setEditForm({ ...editForm, web_url: e.target.value })} required style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }} />
          </label>
          <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Login ID:
            <input type="text" value={editForm.login_id} onChange={(e) => setEditForm({ ...editForm, login_id: e.target.value })} required style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }} />
          </label>
          <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Password:
            <input type="text" value={decryptedPassword} onChange={(e) => setDecryptedPassword(e.target.value)} required style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }} />
          </label>
          <label style={{ fontSize: '12px', color: '#4a5568' }}>
            PIN (for re-encryption):
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} required minLength={4} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }} />
          </label>
          <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Description:
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0', minHeight: '60px' }} />
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" style={{ padding: '8px 14px', backgroundColor: '#38a169', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Save</button>
            <button type="button" onClick={() => { setIsEditing(false); setDecryptedPassword(''); setPin(''); }} style={{ padding: '8px 14px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          </div>
        </form>
        {errorMessage && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>{errorMessage}</p>}
      </div>
    );
  }
}
