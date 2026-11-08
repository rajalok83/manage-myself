'use client';

import { useCallback, useEffect, useState } from 'react';
import CredentialRow from './CredentialRow';
import NavigationBar from './NavigationBar';
import SharedManagement from './SharedManagement';
import CategoryAddForm from './CategoryAddForm';
import ToastViewport from './ToastViewport';
import LoadingViewport from './LoadingViewport';
import { startLoading, stopLoading } from '@/lib/loading';
import { updateIfChanged } from '@/lib/data-equality';
import { categories } from '@/lib/categories';
import { useVaultData } from './VaultDataProvider';

export default function CategoryClient({
  user,
  categoryName,
  isInviteAdmin = false,
  initialCategoryData = {},
  initialShareData = { sharedByMe: [], sharedWithMe: [] }
}) {
  const { getCategorySnapshot, setCategorySnapshot } = useVaultData();
  const [credentials, setCredentials] = useState(initialCategoryData.credentials || []);
  const [sharedByMeCount, setSharedByMeCount] = useState(initialCategoryData.sharedByMeCount || 0);
  const [sharedWithMeCount, setSharedWithMeCount] = useState(initialShareData.sharedWithMe.length);
  const [sharedByMeRows, setSharedByMeRows] = useState(initialShareData.sharedByMe);
  const [sharedWithMeRows, setSharedWithMeRows] = useState(initialShareData.sharedWithMe);
  const [hasLoadedCategory, setHasLoadedCategory] = useState(Boolean(initialCategoryData.credentials));
  const [activeView, setActiveView] = useState('vault');
  const [error, setError] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const subCategories = categories[categoryName] || [];

  const loadCategory = useCallback(async ({ background = false } = {}) => {
    if (!background) startLoading();
    try {
      const [categoryResponse, shareResponse] = await Promise.all([
        fetch(`/api/categories/${encodeURIComponent(categoryName)}`, { cache: 'no-store' }),
        fetch('/api/share', { cache: 'no-store' })
      ]);
      const data = await categoryResponse.json();
      const shareData = await shareResponse.json();
      if (!categoryResponse.ok) throw new Error(data.error || 'Unable to load category.');
      if (!shareResponse.ok) throw new Error(shareData.error || 'Unable to load shared credentials.');
      setCategorySnapshot(user.id, categoryName, data, shareData);
      updateIfChanged(setCredentials, data.credentials || []);
      updateIfChanged(setSharedByMeRows, shareData.sharedByMe || []);
      updateIfChanged(setSharedWithMeRows, shareData.sharedWithMe || []);
      setHasLoadedCategory(true);
      setSharedByMeCount((currentCount) => (
        currentCount === (data.sharedByMeCount || 0) ? currentCount : (data.sharedByMeCount || 0)
      ));
      setSharedWithMeCount((currentCount) => (
        currentCount === (shareData.sharedWithMe || []).length
          ? currentCount
          : (shareData.sharedWithMe || []).length
      ));
      setError('');
    } catch (loadError) {
      if (background) {
        console.error('Background category refresh failed:', loadError);
        setError('Unable to refresh category data. Your current view is unchanged; retrying in the background.');
      } else {
        setError(loadError.message);
      }
    } finally {
      if (!background) stopLoading();
    }
  }, [categoryName, setCategorySnapshot, user.id]);

  useEffect(() => {
    let active = true;
    let requestPending = false;

    const refreshInBackground = async () => {
      if (!active || requestPending || document.visibilityState === 'hidden') return;
      requestPending = true;
      try {
        await loadCategory({ background: true });
      } finally {
        requestPending = false;
      }
    };

    const cachedData = getCategorySnapshot(user.id, categoryName);
    if (cachedData) {
      updateIfChanged(setCredentials, cachedData.credentials);
      updateIfChanged(setSharedByMeRows, cachedData.sharedByMe);
      updateIfChanged(setSharedWithMeRows, cachedData.sharedWithMe);
      setSharedByMeCount(cachedData.sharedByMeCount);
      setSharedWithMeCount(cachedData.sharedWithMe.length);
      setHasLoadedCategory(true);
    }

    const intervalId = window.setInterval(refreshInBackground, 30_000);
    window.addEventListener('focus', refreshInBackground);
    document.addEventListener('visibilitychange', refreshInBackground);
    refreshInBackground();

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshInBackground);
      document.removeEventListener('visibilitychange', refreshInBackground);
    };
  }, [categoryName, getCategorySnapshot, loadCategory, user.id]);

  return (
    <>
      <ToastViewport />
      <LoadingViewport />
      <NavigationBar
        user={user}
        isInviteAdmin={isInviteAdmin}
        activeView={activeView}
        onViewChange={setActiveView}
        sharedByMeCount={sharedByMeCount}
        sharedWithMeCount={sharedWithMeCount}
      />
      <main style={{ padding: '76px 5px 5px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        {activeView === 'vault' && <button type="button" aria-label={`Add item to ${categoryName}`} onClick={() => setIsAddOpen(true)} style={categoryAddButtonStyle}>+</button>}
        {error && <p style={{ color: '#e53e3e' }}>{error}</p>}
        {activeView === 'vault' && !hasLoadedCategory ? (
          <p role="status" style={{ color: '#718096', fontStyle: 'italic' }}>
            {error ? 'Records are temporarily unavailable; retrying in the background…' : 'Loading records in the background…'}
          </p>
        ) : activeView === 'vault' && credentials.length === 0 ? (
          <p style={{ color: '#718096', fontStyle: 'italic' }}>No records saved in {categoryName} section yet.</p>
        ) : activeView === 'vault' ? credentials.map((row) => (
          <CredentialRow key={row.id} item={row} isSharedView={false} onRefresh={loadCategory} />
        )) : (
          <SharedManagement
            initialSharedByMe={sharedByMeRows}
            initialSharedWithMe={sharedWithMeRows}
            activeTab={activeView}
            onRefresh={loadCategory}
            isInitialLoading={!hasLoadedCategory && !error}
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