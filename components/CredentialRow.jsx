'use client';

import { useEffect, useRef, useState } from 'react';
import { encryptData, decryptData } from '@/lib/crypto';

export default function CredentialRow({ item, isSharedView = false, onRefresh }) {
  const rowRef = useRef(null);
  const isCard = item.category === 'Cards';
  const isIdentity = item.category === 'Identity';
  const subcategoryOptions = {
    Websites: ['Banking', 'Social Media', 'Work Tools', 'Shopping', 'Entertainment', 'Misc'],
    Cards: ['Debit', 'Credit'],
    Identity: ['Aadhar', 'PAN', 'VOTER ID'],
    'Money Matters': ['Bank Account', 'Demat Accounts', 'Insurance', 'Mutual Funds', 'Stocks']
  }[item.category] || (item.subcategory ? [item.subcategory] : []);
  const [pin, setPin] = useState('');
  const [decryptedPassword, setDecryptedPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showPasswordReveal, setShowPasswordReveal] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [revealedCard, setRevealedCard] = useState(null);
  const [showCardPin, setShowCardPin] = useState(false);
  const [showRevealPin, setShowRevealPin] = useState(false);
  const [showEditPin, setShowEditPin] = useState(false);
  const [showEditCardPin, setShowEditCardPin] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editCardPin, setEditCardPin] = useState('');
  const [revealSeconds, setRevealSeconds] = useState(null);
  const [showEditUnlock, setShowEditUnlock] = useState(false);
  const [editUnlockPin, setEditUnlockPin] = useState('');
  const [showEditUnlockPin, setShowEditUnlockPin] = useState(false);
  const [isUnlockingEdit, setIsUnlockingEdit] = useState(false);

  useEffect(() => {
    if (revealSeconds === null) return undefined;
    if (revealSeconds <= 0) {
      setShowPasswordReveal(false);
      setDecryptedPassword('');
      setRevealedCard(null);
      setShowCardPin(false);
      setPin('');
      setRevealSeconds(null);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRevealSeconds((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [revealSeconds]);

  useEffect(() => {
    const closeMenusOutsideRow = (event) => {
      if (rowRef.current?.contains(event.target)) return;
      setShowMenu(false);
      setShowShareForm(false);
      setShowEditUnlock(false);
    };

    document.addEventListener('pointerdown', closeMenusOutsideRow);
    return () => document.removeEventListener('pointerdown', closeMenusOutsideRow);
  }, []);

  const [editForm, setEditForm] = useState({
    nickname: item.nickname,
    subcategory: item.subcategory || '',
    web_url: item.web_url,
    login_id: item.login_id,
    description: item.description || ''
  });

  const handleEditChange = (field, value) => {
    setEditForm((previous) => ({ ...previous, [field]: value }));
  };

  const startEdit = async () => {
    setErrorMessage('');
    setEditUnlockPin('');
    setShowEditUnlockPin(false);
    setShowEditUnlock(true);
    setShowMenu(false);
  };

  const unlockEdit = async (event) => {
    event.preventDefault();
    if (!editUnlockPin) return;
    setIsUnlockingEdit(true);

    try {
      const response = await fetch(`/api/credentials/${item.id}/info`, {
        method: isCard ? 'POST' : 'GET',
        ...(isCard ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: editUnlockPin })
        } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to decrypt this item.');

      setPin(editUnlockPin);
      if (isCard) {
        const cardDetails = JSON.parse(decryptData(data.card.encrypted_details, editUnlockPin, data.card.salt, data.card.iv));
        setEditCardPin(cardDetails.cardPin || '');
      } else {
        setDecryptedPassword(decryptData(data.encrypted_password, editUnlockPin, data.salt, data.iv));
      }
      setShowEditUnlock(false);
      setIsEditing(true);
    } catch (error) {
      setErrorMessage(error.message);
      alert(`Unable to edit this item: ${error.message}`);
    } finally {
      setIsUnlockingEdit(false);
    }
  };

  const handleReveal = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    try {
      const res = await fetch(`/api/credentials/${item.id}/info`, {
        method: isCard ? 'POST' : 'GET',
        ...(isCard ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        } : {})
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to retrieve credential data');
      }

      const data = await res.json();

      if (isCard) {
        const cardDetails = JSON.parse(decryptData(data.card.encrypted_details, pin, data.card.salt, data.card.iv));
        setRevealedCard({ ...data.card, ...cardDetails });
        setDecryptedPassword('card');
        setShowCardPin(false);
        setRevealSeconds(30);
        setShowPasswordReveal(true);
        return;
      }

      const { encrypted_password, salt, iv } = data;

      // 2. Perform local client-side decryption processing 
      const decryptedPassword = decryptData(encrypted_password, pin, salt, iv);
      // console.log(decryptedPassword);
      setDecryptedPassword(decryptedPassword);
      setRevealSeconds(30);
      setShowPasswordReveal(true);
    } catch (err) {
      setErrorMessage(err.message);
      alert(`Unable to reveal this item: ${err.message}`);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const encryptionPayload = !isCard ? encryptData(decryptedPassword, pin) : null;
      let payload;
      if (isCard) {
        const cardResponse = await fetch(`/api/credentials/${item.id}/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const cardData = await cardResponse.json();
        if (!cardResponse.ok) throw new Error(cardData.error || 'Unable to load card details.');
        const cardDetails = JSON.parse(decryptData(cardData.card.encrypted_details, pin, cardData.card.salt, cardData.card.iv));
        const encryptedCard = encryptData(JSON.stringify({ ...cardDetails, cardPin: editCardPin || cardDetails.cardPin }), pin);
        payload = {
          ...editForm,
          category: item.category,
          encrypted_details: encryptedCard.encryptedData,
          salt: encryptedCard.salt,
          iv: encryptedCard.iv,
          subcategory: editForm.subcategory
        };
      } else {
        payload = { ...editForm, encrypted_password: encryptionPayload.encryptedData, salt: encryptionPayload.salt, iv: encryptionPayload.iv };
      }
      const res = await fetch(`/api/credentials/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Update execution failed');
      
      setIsEditing(false);
      setDecryptedPassword('');
      setPin('');
      setShowMenu(false);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const normalizedEmail = shareEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('Enter the recipient email address.');
      return;
    }

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: item.id, targetEmail: normalizedEmail })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Sharing error occurred');
      
      alert('Vault item linked successfully!');
      window.dispatchEvent(new CustomEvent('credential-shared'));
      setShareEmail('');
      setShowShareForm(false);
      if (onRefresh) await onRefresh();
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
        await onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Close menu if not editing
  if (!isEditing && !showPasswordReveal) {
    return (
      <div
        ref={rowRef}
        onClick={(event) => {
          if (event.target.closest('button, a, input, textarea, select, form')) return;
          setShowPasswordReveal(true);
        }}
        style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '12px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          {/* Card Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 'clamp(15px, 3vw, 16px)', fontWeight: '600', color: '#2d3748' }}>
              {item.nickname}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {item.subcategory && <p style={{ margin: 0, fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#718096' }}>
                <span style={{ fontWeight: '500' }}>Type:</span> {item.subcategory}
              </p>}
              {!isCard && !isIdentity && <p style={{ margin: 0, fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#718096' }}>
                <span style={{ fontWeight: '500' }}>Login:</span> {item.login_id}
              </p>}
              {!isCard && !isIdentity && <p style={{ margin: 0, fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#718096', wordBreak: 'break-all' }}>
                <span style={{ fontWeight: '500' }}>URL:</span> <a href={item.web_url} target="_blank" rel="noreferrer" style={{ color: '#3182ce', textDecoration: 'none' }}>{item.web_url}</a>
              </p>}
              {item.description && <p style={{ margin: 0, fontSize: 'clamp(12px, 2.5vw, 13px)', color: '#4a5568' }}>{item.description}</p>}
              {isSharedView && <p style={{ margin: '6px 0 0 0', fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#3182ce', fontWeight: '500' }}>📤 Shared by: {item.shared_by}</p>}
              {!isSharedView && item.shared_with && <p style={{ margin: '6px 0 0 0', fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#3182ce', fontWeight: '500' }}>📤 Shared with: {item.shared_with}</p>}
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
                <>
                    <button
                      onClick={() => {
                        startEdit();
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
                    {!isSharedView && <button
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
                    </button>}
                </>
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
                {!isSharedView && <button
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
                </button>}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>{errorMessage}</p>}

        {showEditUnlock && (
          <form onSubmit={unlockEdit} style={editUnlockStyle}>
            <strong style={{ color: '#1f2937', fontSize: '13px' }}>Enter PIN to edit</strong>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showEditUnlockPin ? 'text' : 'password'}
                value={editUnlockPin}
                onChange={(event) => setEditUnlockPin(event.target.value)}
                placeholder="PIN"
                required
                autoFocus
                style={{ ...editFieldStyle, marginTop: 0, paddingRight: '36px' }}
              />
              <button type="button" onClick={() => setShowEditUnlockPin(!showEditUnlockPin)} style={eyeButtonStyle}>
                {showEditUnlockPin ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={isUnlockingEdit} style={smallPrimaryButtonStyle}>{isUnlockingEdit ? 'Checking...' : 'Continue'}</button>
              <button type="button" onClick={() => setShowEditUnlock(false)} style={smallCancelButtonStyle}>Cancel</button>
            </div>
          </form>
        )}

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
      <div ref={rowRef} style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 'clamp(15px, 3vw, 16px)', fontWeight: '600', color: '#2d3748' }}>
              {item.nickname}
            </h3>
            <form onSubmit={handleReveal} style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
              <input 
                type={showRevealPin ? 'text' : 'password'}
                placeholder="Enter PIN" 
                inputMode={item.category === 'Cards' ? 'numeric' : undefined}
                pattern={item.category === 'Cards' ? '[0-9]+' : undefined}
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                required 
                style={{ padding: '6px 34px 6px 10px', borderRadius: '4px', border: '1px solid #cbd5e0', fontSize: '12px', minWidth: '100px', width: '100%' }}
              />
              <button type="button" onClick={() => setShowRevealPin(!showRevealPin)} style={eyeButtonStyle}>
                {showRevealPin ? '🙈' : '👁️'}
              </button>
              </div>
              <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#48bb78', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>Reveal</button>
            </form>
            {decryptedPassword && (
              <div style={{ padding: '10px', backgroundColor: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: '8px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#22543d', fontWeight: '500' }}>Category: {item.category || 'Not specified'}</p>
                  </div>

                {item.category === 'Cards' && revealedCard ? (
                  <>
                    <p style={revealDetailStyle}>Card Type: {revealedCard.subcategory || item.category}</p>
                    <p style={revealDetailStyle}>Card Number: <code style={revealCodeStyle}>{revealedCard.cardNumber}</code></p>
                    <p style={revealDetailStyle}>CVV: <code style={revealCodeStyle}>{revealedCard.cvv}</code></p>
                    <p style={revealDetailStyle}>Expiry Date: {revealedCard.expiryDate}</p>
                    <p style={revealDetailStyle}>Name on Card: {revealedCard.nameOnCard}</p>
                    <p style={revealDetailStyle}>
                      Card PIN: <code style={revealCodeStyle}>{showCardPin ? revealedCard.cardPin : '••••'}</code>
                      <button type="button" onClick={() => setShowCardPin(!showCardPin)} style={inlineEyeButtonStyle}>
                        {showCardPin ? '🙈' : '👁️'}
                      </button>
                    </p>
                  </>
                ) : isIdentity ? (
                  <p style={revealDetailStyle}>Identity Number: <code style={revealCodeStyle}>{decryptedPassword}</code></p>
                ) : (
                  <>
                <p style={{ margin: 0, fontSize: '12px', color: '#22543d', fontWeight: '500', wordBreak: 'break-all' }}>Website: {item.web_url}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#22543d', fontWeight: '500', wordBreak: 'break-all' }}>Login ID: {item.login_id}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#22543d', fontWeight: '500' }}>Password: <code style={{ fontSize: '13px', color: '#2d3748', wordBreak: 'break-all' }}>{decryptedPassword}</code></p>
                  </>
                )}
                {item.description && <p style={{ margin: 0, fontSize: '12px', color: '#22543d', fontWeight: '500' }}>Description: {item.description}</p>}
                {isSharedView && <p style={{ margin: 0, fontSize: '12px', color: '#22543d', fontWeight: '500' }}>Shared by: {item.shared_by}</p>}
                </div>
                <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
                  <div style={countdownStyle(revealSeconds)} aria-label={`${revealSeconds} seconds remaining`}>
                    {revealSeconds}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setShowPasswordReveal(false);
              setDecryptedPassword('');
              setRevealedCard(null);
              setShowCardPin(false);
              setRevealSeconds(null);
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
      <div ref={rowRef} style={{ padding: '14px', border: '2px solid #3182ce', borderRadius: '8px', backgroundColor: '#ebf8ff', marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 'clamp(15px, 3vw, 16px)', fontWeight: '600', color: '#2d3748' }}>
          Edit: {item.nickname}
        </h3>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '600' }}>Subcategory</span>
          <select
            value={editForm.subcategory}
            onChange={(e) => handleEditChange('subcategory', e.target.value)}
            required
            style={editFieldStyle}
          >
            <option value="" disabled>Select Subcategory</option>
            {subcategoryOptions.map((subcategory) => (
              <option key={subcategory} value={subcategory}>{subcategory}</option>
            ))}
          </select>
        </label>
          <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Nickname:
            <input type="text" value={editForm.nickname} onChange={(e) => handleEditChange('nickname', e.target.value)} required style={editFieldStyle} />
          </label>
          {!isCard && !isIdentity && <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Web URL:
            <input type="url" value={editForm.web_url} onChange={(e) => handleEditChange('web_url', e.target.value)} required style={editFieldStyle} />
          </label>}
          {!isCard && !isIdentity && <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Login ID:
            <input type="text" value={editForm.login_id} onChange={(e) => handleEditChange('login_id', e.target.value)} required style={editFieldStyle} />
          </label>}
          {!isCard && <label style={{ fontSize: '12px', color: '#4a5568' }}>
            {isIdentity ? 'Identity Number:' : 'Password:'}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input type={showEditPassword ? 'text' : 'password'} value={decryptedPassword === 'card' ? '' : decryptedPassword} onChange={(e) => setDecryptedPassword(e.target.value)} required style={{ ...editFieldStyle, paddingRight: '36px' }} />
              <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} style={eyeButtonStyle}>{showEditPassword ? '🙈' : '👁️'}</button>
            </div>
          </label>}
          {isCard && <>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>
              Card PIN:
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={showEditCardPin ? 'text' : 'password'} value={editCardPin} onChange={(e) => setEditCardPin(e.target.value)} required inputMode="numeric" style={{ ...editFieldStyle, paddingRight: '36px' }} />
                <button type="button" onClick={() => setShowEditCardPin(!showEditCardPin)} style={eyeButtonStyle}>{showEditCardPin ? '🙈' : '👁️'}</button>
              </div>
            </label>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>
              PIN (for re-encryption):
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={showEditPin ? 'text' : 'password'} value={pin} onChange={(e) => setPin(e.target.value)} required minLength={4} style={{ ...editFieldStyle, paddingRight: '36px' }} />
                <button type="button" onClick={() => setShowEditPin(!showEditPin)} style={eyeButtonStyle}>{showEditPin ? '🙈' : '👁️'}</button>
              </div>
            </label>
          </>}
          {!isCard && <label style={{ fontSize: '12px', color: '#4a5568' }}>
            PIN (for re-encryption):
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input type={showEditPin ? 'text' : 'password'} value={pin} onChange={(e) => setPin(e.target.value)} required minLength={4} style={{ ...editFieldStyle, paddingRight: '36px' }} />
              <button type="button" onClick={() => setShowEditPin(!showEditPin)} style={eyeButtonStyle}>{showEditPin ? '🙈' : '👁️'}</button>
            </div>
          </label>}
          <label style={{ fontSize: '12px', color: '#4a5568' }}>
            Description:
            <textarea value={editForm.description} onChange={(e) => handleEditChange('description', e.target.value)} style={editFieldStyle} />
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

const revealDetailStyle = { margin: 0, fontSize: '12px', color: '#22543d', fontWeight: '500', wordBreak: 'break-word' };
const revealCodeStyle = { fontSize: '13px', color: '#2d3748', wordBreak: 'break-all' };
const inlineEyeButtonStyle = { border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 4px', fontSize: '13px' };
const editFieldStyle = { width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' };
const eyeButtonStyle = { position: 'absolute', right: '8px', border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', zIndex: 2 };
const editUnlockStyle = { marginTop: '12px', padding: '12px', display: 'grid', gap: '8px', border: '1px solid #bfdbfe', borderRadius: '8px', background: '#eff6ff' };
const smallPrimaryButtonStyle = { padding: '7px 12px', border: 'none', borderRadius: '6px', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' };
const smallCancelButtonStyle = { padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '12px' };
const countdownStyle = (seconds) => ({
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: seconds < 10 ? '#b91c1c' : '#1f2937',
  fontSize: '13px',
  fontWeight: '700',
  background: `radial-gradient(circle, #fff 58%, transparent 60%), conic-gradient(${seconds < 10 ? '#dc2626' : '#3182ce'} ${(seconds / 30) * 360}deg, #e2e8f0 0deg)`
});
