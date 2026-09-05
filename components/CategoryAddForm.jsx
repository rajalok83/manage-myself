'use client';

import { useState } from 'react';
import { encryptData } from '@/lib/crypto';

export default function CategoryAddForm({ subCategories = [], category, onSuccess, onClose }) {
  const [form, setForm] = useState({
    category,
    subcategory: subCategories[0] || '', 
    nickname: '',
    web_url: '',
    login_id: '',
    password: '',
    identityNumber: '',
    pin: '',
    cardPin: '',
    cardNumber: '',
    cvv: '',
    expiryDate: '',
    nameOnCard: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Individual visibility toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showCardPin, setShowCardPin] = useState(false);
  const isIdentity = category === 'Identity';

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      if (category === 'Cards') {
        const missingFields = [
          ['card type', form.subcategory],
          ['nickname', form.nickname],
          ['card number', form.cardNumber],
          ['CVV', form.cvv],
          ['expiry date', form.expiryDate],
          ['name on card', form.nameOnCard],
          ['PIN', form.pin],
          ['Card PIN', form.cardPin]
        ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);

        if (missingFields.length > 0) {
          throw new Error(`Enter: ${missingFields.join(', ')}.`);
        }
      } else if (isIdentity) {
        const missingFields = [
          ['identity number', form.identityNumber],
          ['PIN', form.pin]
        ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);

        if (missingFields.length > 0) {
          throw new Error(`Enter: ${missingFields.join(', ')}.`);
        }
      }

      const securePayload = {
        category: form.category,
        subcategory: form.subcategory,
        nickname: form.nickname,
        web_url: form.web_url,
        login_id: form.login_id,
        description: form.description,
      };

      if (category === 'Cards') {
        const encryptedCard = encryptData(JSON.stringify({
          cardNumber: form.cardNumber,
          cvv: form.cvv,
          expiryDate: form.expiryDate,
          nameOnCard: form.nameOnCard,
          cardPin: form.cardPin
        }), form.pin);
        Object.assign(securePayload, {
          encrypted_details: encryptedCard.encryptedData,
          salt: encryptedCard.salt,
          iv: encryptedCard.iv
        });
      } else {
        const encryptedCredential = encryptData(isIdentity ? form.identityNumber : form.password, form.pin);
        Object.assign(securePayload, {
          encrypted_password: encryptedCredential.encryptedData,
          salt: encryptedCredential.salt,
          iv: encryptedCredential.iv
        });
      }

      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securePayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add this item.');
      }

      setMessage('Item added successfully.');
      setForm({
        category,
        subcategory: subCategories[0] || '',
        nickname: '',
        web_url: '',
        login_id: '',
        password: '',
        identityNumber: '',
        pin: '',
        cardPin: '',
        cardNumber: '',
        cvv: '',
        expiryDate: '',
        nameOnCard: '',
        description: ''
      });
      setShowPassword(false);
      setShowPin(false);
      setShowCardPin(false);

      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 200);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section style={{ marginBottom: '0', padding: '8px 0', backgroundColor: '#fff', borderRadius: '16px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '600' }}>Subcategory</span>
          <select
            value={form.subcategory}
            onChange={(e) => handleChange('subcategory', e.target.value)}
            required
            style={fieldStyle}
          >
            <option value="" disabled>Select Subcategory</option>
            {subCategories.map((sub, idx) => (
              <option key={idx} value={sub}>{sub}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '600' }}>Nickname</span>
          <input value={form.nickname} onChange={(e) => handleChange('nickname', e.target.value)} required style={fieldStyle} />
        </label>

        {category === 'Cards' && (
          <>
            <label style={fieldLabelStyle}>
              <span style={{ fontWeight: '600' }}>Card Number</span>
              <input inputMode="numeric" autoComplete="cc-number" value={form.cardNumber} onChange={(e) => handleChange('cardNumber', e.target.value)} required style={fieldStyle} />
            </label>
            <label style={fieldLabelStyle}>
              <span style={{ fontWeight: '600' }}>CVV</span>
              <input type="password" inputMode="numeric" autoComplete="cc-csc" value={form.cvv} onChange={(e) => handleChange('cvv', e.target.value)} required minLength={3} maxLength={4} style={fieldStyle} />
            </label>
            <label style={fieldLabelStyle}>
              <span style={{ fontWeight: '600' }}>Expiry Date</span>
              <input placeholder="MM/YY" autoComplete="cc-exp" value={form.expiryDate} onChange={(e) => handleChange('expiryDate', e.target.value)} required style={fieldStyle} />
            </label>
            <label style={fieldLabelStyle}>
              <span style={{ fontWeight: '600' }}>Name on Card</span>
              <input autoComplete="cc-name" value={form.nameOnCard} onChange={(e) => handleChange('nameOnCard', e.target.value)} required style={fieldStyle} />
            </label>
          </>
        )}

        {category !== 'Cards' && !isIdentity && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568' }}>
              <span style={{ fontWeight: '600' }}>Website URL</span>
              <input type="url" value={form.web_url} onChange={(e) => handleChange('web_url', e.target.value)} required style={fieldStyle} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568' }}>
              <span style={{ fontWeight: '600' }}>Login ID</span>
              <input value={form.login_id} onChange={(e) => handleChange('login_id', e.target.value)} required style={fieldStyle} />
            </label>
          </>
        )}

        {/* Password input wrapper with Eye Icon toggle */}
        {category !== 'Cards' && !isIdentity && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568', position: 'relative' }}>
          <span style={{ fontWeight: '600' }}>Password</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={form.password} 
              onChange={(e) => handleChange('password', e.target.value)} 
              required 
              style={{ ...fieldStyle, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              style={eyeButtonStyle}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>}

        {isIdentity && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568', position: 'relative' }}>
            <span style={{ fontWeight: '600' }}>Identity Number</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.identityNumber}
                onChange={(e) => handleChange('identityNumber', e.target.value)}
                required
                style={{ ...fieldStyle, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        )}

        {/* PIN encrypts the credential. Cards also have a separate encrypted Card PIN. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568', position: 'relative' }}>
          <span style={{ fontWeight: '600' }}>PIN</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]+"
              value={form.pin} 
              onChange={(e) => handleChange('pin', e.target.value)} 
              required
              onKeyDown={(event) => {
                if (!/[0-9]/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
              }}
              minLength={4} 
              style={{ ...fieldStyle, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} 
            />
            <button 
              type="button" 
              onClick={() => setShowPin(!showPin)} 
              style={eyeButtonStyle}
            >
              {showPin ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {category === 'Cards' && (
          <label style={fieldLabelStyle}>
            <span style={{ fontWeight: '600' }}>Card PIN</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
              type={showCardPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]+"
              placeholder="Numeric Card PIN"
              value={form.cardPin}
              onChange={(e) => handleChange('cardPin', e.target.value)}
              onKeyDown={(event) => {
                if (!/[0-9]/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
              }}
              required
              style={{ ...fieldStyle, width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowCardPin(!showCardPin)} style={eyeButtonStyle}>
                {showCardPin ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568', gridColumn: '1 / -1' }}>
          <span style={{ fontWeight: '600' }}>Description</span>
          <textarea rows={2} value={form.description} onChange={(e) => handleChange('description', e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} />
        </label>

        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" disabled={isSaving} style={{ padding: '10px 16px', border: 'none', borderRadius: '10px', backgroundColor: '#3182ce', color: '#fff', fontWeight: '700', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
              {isSaving ? 'Saving...' : 'Save item'}
            </button>
            {onClose && (
              <button type="button" onClick={onClose} style={{ padding: '10px 16px', border: '1px solid #cbd5e0', borderRadius: '10px', backgroundColor: '#fff', color: '#4a5568', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
          {message && (
            <span style={{ fontSize: '12px', color: message.includes('successfully') ? '#2f855a' : '#c53030', fontWeight: '600' }}>
              {message}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

const fieldStyle = {
  border: '1px solid #cbd5e0',
  borderRadius: '10px',
  padding: '10px 12px',
  fontSize: '13px',
  backgroundColor: '#fff',
  outline: 'none'
};

const fieldLabelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '12px',
  color: '#4a5568'
};

const eyeButtonStyle = {
  position: 'absolute',
  right: '10px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '4px',
  zIndex: 2,
  userSelect: 'none'
};
