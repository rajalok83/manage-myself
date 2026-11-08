'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CredentialRow from './CredentialRow';
import NavigationBar from './NavigationBar';
import SharedManagement from './SharedManagement';
import CategoryAddForm from './CategoryAddForm';
import ToastViewport from './ToastViewport';
import LoadingViewport from './LoadingViewport';
import LoadingIndicator from './LoadingIndicator';
import { startLoading, stopLoading } from '@/lib/loading';
import { updateIfChanged } from '@/lib/data-equality';
import { getCategoryPalette } from '@/lib/category-palette';
import { useVaultData } from './VaultDataProvider';

export default function CategoryClient({
  user,
  categoryName,
  categories,
  isInviteAdmin = false,
  initialCategoryData = {},
  initialShareData = { sharedByMe: [], sharedWithMe: [] }
}) {
  const router = useRouter();
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
  const [switchingCategory, setSwitchingCategory] = useState(false);
  const subCategories = categories[categoryName] || [];
  const selectedCategoryPalette = getCategoryPalette(categoryName, categories);

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
        <div style={categoryHeaderStyle}>
          <h1 style={{ ...categoryTitleStyle, color: selectedCategoryPalette.accent }}>{categoryName}</h1>
          <label style={categorySelectLabelStyle}>
            <span>Switch category</span>
            {switchingCategory && <LoadingIndicator size={20} />}
            <select
              aria-label="Switch category"
              value={categoryName}
              onChange={(event) => {
                if (!event.target.value || event.target.value === categoryName) return;
                setSwitchingCategory(true);
                router.push(`/category/${encodeURIComponent(event.target.value)}`);
              }}
              disabled={switchingCategory}
              style={categorySelectStyle}
            >
              {Object.keys(categories).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>
        {activeView === 'vault' && <button type="button" aria-label={`Add item to ${categoryName}`} onClick={() => setIsAddOpen(true)} style={{ ...categoryAddButtonStyle, backgroundColor: selectedCategoryPalette.accent, boxShadow: `0 8px 18px ${selectedCategoryPalette.accent}55` }}>+</button>}
        {error && <p style={{ color: '#e53e3e' }}>{error}</p>}
        {activeView === 'vault' && !hasLoadedCategory ? (
          <p role="status" style={loadingMessageStyle}>
            <LoadingIndicator size={20} />
            {error ? 'Records are temporarily unavailable; retrying in the background…' : 'Loading records in the background…'}
          </p>
        ) : activeView === 'vault' && credentials.length === 0 ? (
          <p style={{ color: '#718096', fontStyle: 'italic' }}>No records saved in {categoryName} section yet.</p>
        ) : activeView === 'vault' ? credentials.map((row) => (
          <CredentialRow key={row.id} item={row} categories={categories} isSharedView={false} onRefresh={loadCategory} />
        )) : (
          <SharedManagement
            initialSharedByMe={sharedByMeRows}
            initialSharedWithMe={sharedWithMeRows}
            categories={categories}
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

const categoryHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', margin: '0 8px 18px', flexWrap: 'wrap' };
const categoryTitleStyle = { margin: 0, fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 800 };
const categorySelectLabelStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' };
const categorySelectStyle = { maxWidth: 'min(56vw, 240px)', padding: '9px 32px 9px 10px', border: '1px solid #cbd5e1', borderRadius: '9px', background: '#fff', color: '#1f2937', fontSize: '14px' };
const loadingMessageStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: '#718096', fontStyle: 'italic' };
const categoryAddButtonStyle = { position: 'fixed', right: '24px', bottom: 'calc(24px + env(safe-area-inset-bottom))', zIndex: 150, width: '58px', height: '58px', border: 'none', borderRadius: '50%', color: '#fff', fontSize: '34px', lineHeight: 1, cursor: 'pointer' };
const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15, 23, 42, 0.5)' };
const modalStyle = { width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '20px', borderRadius: '16px', background: '#fff', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)' };
const closeButtonStyle = { border: 'none', background: 'transparent', color: '#64748b', fontSize: '26px', cursor: 'pointer' };