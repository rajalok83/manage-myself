'use client';

import { useCallback, useEffect, useState } from 'react';
import CredentialRow from './CredentialRow';
import NavigationBar from './NavigationBar';
import SharedManagement from './SharedManagement';
import CategoryAddForm from './CategoryAddForm';
import ToastViewport from './ToastViewport';
import LoadingViewport from './LoadingViewport';
import { startLoading, stopLoading } from '@/lib/loading';

export default function CategoryClient({ user, categoryName }) {
  const [credentials, setCredentials] = useState([]);
  const [sharedByMeCount, setSharedByMeCount] = useState(0);
  const [sharedWithMeCount, setSharedWithMeCount] = useState(0);
  const [sharedByMeRows, setSharedByMeRows] = useState([]);
  const [sharedWithMeRows, setSharedWithMeRows] = useState([]);
  const [activeView, setActiveView] = useState('vault');
  const [error, setError] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const subCategories = {
    Websites: ['Banking', 'Social Media', 'Work Tools', 'Shopping', 'Entertainment', 'Misc'],
    Cards: ['Debit', 'Credit'],
    Identity: ['Aadhar', 'PAN', 'VOTER ID'],
    'Money Matters': ['Bank Account', 'Demat Accounts', 'Insurance', 'Mutual Funds', 'Stocks']
  }[categoryName] || [];

  const loadCategory = useCallback(async () => {
    startLoading();
    try {
    const [categoryResponse, shareResponse] = await Promise.all([
      fetch(`/api/categories/${encodeURIComponent(categoryName)}`, { cache: 'no-store' }),
      fetch('/api/share', { cache: 'no-store' })
    ]);
    const data = await categoryResponse.json();
    const shareData = await shareResponse.json();
    if (!categoryResponse.ok) throw new Error(data.error || 'Unable to load category.');
    if (!shareResponse.ok) throw new Error(shareData.error || 'Unable to load shared credentials.');
    setCredentials(data.credentials || []);
    setSharedByMeCount(data.sharedByMeCount || 0);
    setSharedByMeRows(shareData.sharedByMe || []);
    setSharedWithMeRows(shareData.sharedWithMe || []);
    setSharedWithMeCount((shareData.sharedWithMe || []).length);
    } finally {
      stopLoading();
    }
  }, [categoryName]);

  useEffect(() => {
    let cancelled = false;
    loadCategory().catch((loadError) => {
      if (!cancelled) setError(loadError.message);
    });
    return () => { cancelled = true; };
  }, [loadCategory]);

  const handleSharesLoaded = useCallback(({ sharedByMe, sharedWithMe }) => {
    setSharedByMeRows(sharedByMe);
    setSharedWithMeRows(sharedWithMe);
    setSharedByMeCount(sharedByMe.length);
    setSharedWithMeCount(sharedWithMe.length);
  }, []);

  return (
    <>
      <ToastViewport />
      <LoadingViewport />
      <NavigationBar
        user={user}
        activeView={activeView}
        onViewChange={setActiveView}
        sharedByMeCount={sharedByMeCount}
        sharedWithMeCount={sharedWithMeCount}
      />
      <main style={{ padding: '76px 5px 5px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        {activeView === 'vault' && <button type="button" aria-label={`Add item to ${categoryName}`} onClick={() => setIsAddOpen(true)} style={categoryAddButtonStyle}>+</button>}
        {error && <p style={{ color: '#e53e3e' }}>{error}</p>}
        {activeView === 'vault' && !error && credentials.length === 0 ? (
          <p style={{ color: '#718096', fontStyle: 'italic' }}>No records saved in {categoryName} section yet.</p>
        ) : activeView === 'vault' ? credentials.map((row) => (
          <CredentialRow key={row.id} item={row} isSharedView={false} onRefresh={loadCategory} />
        )) : (
          <SharedManagement
            initialSharedByMe={sharedByMeRows}
            initialSharedWithMe={sharedWithMeRows}
            activeTab={activeView}
            onRefresh={loadCategory}
            onSharesLoaded={handleSharesLoaded}
          />
        )}
      </main>
      {isAddOpen && (
        <div style={modalOverlayStyle} onClick={() => setIsAddOpen(false)}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Add item to {categoryName}</h3>
              <button type="button" onClick={() => setIsAddOpen(false)} style={closeButtonStyle}>×</button>
            </div>
            <CategoryAddForm
              category={categoryName}
              subCategories={subCategories}
              onClose={() => setIsAddOpen(false)}
              onSuccess={async () => { setIsAddOpen(false); await loadCategory(); }}
            />
          </div>
        </div>
      )}
    </>
  );
}

const categoryAddButtonStyle = { display: 'block', margin: '0 auto 16px', width: '42px', height: '42px', border: 'none', borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: '28px', lineHeight: 1, cursor: 'pointer', boxShadow: '0 8px 18px rgba(37, 99, 235, 0.25)' };
const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15, 23, 42, 0.5)' };
const modalStyle = { width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '20px', borderRadius: '16px', background: '#fff', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)' };
const closeButtonStyle = { border: 'none', background: 'transparent', color: '#64748b', fontSize: '26px', cursor: 'pointer' };