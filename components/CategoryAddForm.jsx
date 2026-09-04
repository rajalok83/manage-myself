'use client';

import { useState } from 'react';

export default function CategoryAddForm({ subCategories = [], category, onSuccess, onClose }) {
  const [form, setForm] = useState({
    category,
    subcategory: subCategories[0] || '', 
    nickname: '',
    web_url: '',
    login_id: '',
    password: '',
    pin: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Individual visibility toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const securePayload = {
        category: form.category,
        subcategory: form.subcategory,
        nickname: form.nickname,
        web_url: form.web_url,
        login_id: form.login_id,
        password: form.password,
        pin: form.pin,
        description: form.description,
      };

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
        pin: '',
        description: ''
      });
      setShowPassword(false);
      setShowPin(false);

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

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '600' }}>Website URL</span>
          <input type="url" value={form.web_url} onChange={(e) => handleChange('web_url', e.target.value)} required style={fieldStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '600' }}>Login ID</span>
          <input value={form.login_id} onChange={(e) => handleChange('login_id', e.target.value)} required style={fieldStyle} />
        </label>

        {/* Password input wrapper with Eye Icon toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568', position: 'relative' }}>
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
        </div>

        {/* PIN input wrapper with Eye Icon toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#4a5568', position: 'relative' }}>
          <span style={{ fontWeight: '600' }}>PIN</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showPin ? "text" : "password"} 
              value={form.pin} 
              onChange={(e) => handleChange('pin', e.target.value)} 
              required 
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
