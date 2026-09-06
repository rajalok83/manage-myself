'use client';

import { useState } from 'react';

export default function AddCredentialCard({ categories }) {
  const [form, setForm] = useState({
    category: categories[0] || 'Misc',
    nickname: '',
    web_url: '',
    login_id: '',
    password: '',
    pin: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save this credential.');
      }

      setMessage('Credential added successfully.');
      setForm({
        category: categories[0] || 'Misc',
        nickname: '',
        web_url: '',
        login_id: '',
        password: '',
        pin: '',
        description: ''
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h2 style={{ marginTop: 0, marginBottom: '14px', fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '600', color: '#2d3748' }}>➕ Add New Vault Item</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '500' }}>Category</span>
          <select value={form.category} onChange={(event) => handleChange('category', event.target.value)} style={{ ...fieldStyle, fontSize: '12px' }}>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '500' }}>Nickname</span>
          <input value={form.nickname} onChange={(event) => handleChange('nickname', event.target.value)} required style={{ ...fieldStyle, fontSize: '12px' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '500' }}>Website URL</span>
          <input type="url" value={form.web_url} onChange={(event) => handleChange('web_url', event.target.value)} required style={{ ...fieldStyle, fontSize: '12px' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '500' }}>Login ID</span>
          <input value={form.login_id} onChange={(event) => handleChange('login_id', event.target.value)} required style={{ ...fieldStyle, fontSize: '12px' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '500' }}>Password</span>
          <input type="password" value={form.password} onChange={(event) => handleChange('password', event.target.value)} required style={{ ...fieldStyle, fontSize: '12px' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#4a5568' }}>
          <span style={{ fontWeight: '500' }}>Encrypting PIN (4+ digits)</span>
          <input type="password" value={form.pin} onChange={(event) => handleChange('pin', event.target.value)} required minLength={4} style={{ ...fieldStyle, fontSize: '12px' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#4a5568', gridColumn: '1 / -1' }}>
          <span style={{ fontWeight: '500' }}>Description (optional)</span>
          <textarea value={form.description} onChange={(event) => handleChange('description', event.target.value)} rows={2} style={{ ...fieldStyle, resize: 'vertical', fontSize: '12px' }} />
        </label>

        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button type="submit" disabled={isSaving} style={{ padding: '8px 14px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '12px' }}>
            {isSaving ? 'Saving...' : '✓ Save Item'}
          </button>

          {message && (
            <span style={{ color: message.startsWith('Credential added successfully') ? '#2f855a' : '#c53030', fontSize: '12px', fontWeight: '500' }}>
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
  borderRadius: '6px',
  padding: '10px 12px',
  fontSize: '14px',
  backgroundColor: '#fff'
};
