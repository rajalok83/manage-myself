'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import NavigationBar from './NavigationBar';
import SharedManagement from './SharedManagement';
import CategoryCard from './CategoryCard';
import CategoryAddForm from './CategoryAddForm';
import ToastViewport from './ToastViewport';
import LoadingViewport from './LoadingViewport';
import LoadingIndicator from './LoadingIndicator';
import { startLoading, stopLoading } from '@/lib/loading';
import { updateIfChanged } from '@/lib/data-equality';
import { categoryPalette } from '@/lib/category-palette';
import { useVaultData } from './VaultDataProvider';

export default function DashboardClient({ user, categories, isInviteAdmin = false, initialData = {} }) {
  const { getDashboardSnapshot, setDashboardSnapshot } = useVaultData();
  const [activeView, setActiveView] = useState('vault');
  const [modalCategory, setModalCategory] = useState(null);
  const [allCredentials, setAllCredentials] = useState(initialData.credentials || []);
  const [sharedByMeRows, setSharedByMeRows] = useState(initialData.sharedByMe || []);
  const [sharedWithMeRows, setSharedWithMeRows] = useState(initialData.sharedWithMe || []);
  const [hasLoadedDashboard, setHasLoadedDashboard] = useState(Boolean(initialData.credentials));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      startLoading();
      setIsLoading(true);
    }

    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign('/');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Unable to load dashboard.');
      setDashboardSnapshot(user.id, data);
      updateIfChanged(setAllCredentials, data.credentials || []);
      updateIfChanged(setSharedByMeRows, data.sharedByMe || []);
      updateIfChanged(setSharedWithMeRows, data.sharedWithMe || []);
      setHasLoadedDashboard(true);
      setError('');
    } catch (loadError) {
      if (background) {
        console.error('Background dashboard refresh failed:', loadError);
        setError('Unable to refresh vault data. Your current view is unchanged; retrying in the background.');
      } else {
        setError(loadError.message);
      }
    } finally {
      if (!background) {
        setIsLoading(false);
        stopLoading();
      }
    }
  }, [setDashboardSnapshot, user.id]);

  useEffect(() => {
    let active = true;
    let requestPending = false;

    const refreshInBackground = async () => {
      if (!active || requestPending || document.visibilityState === 'hidden') return;
      requestPending = true;
      try {
        await loadDashboard({ background: true });
      } finally {
        requestPending = false;
      }
    };

    const cachedData = getDashboardSnapshot(user.id);
    if (cachedData) {
      updateIfChanged(setAllCredentials, cachedData.credentials);
      updateIfChanged(setSharedByMeRows, cachedData.sharedByMe);
      updateIfChanged(setSharedWithMeRows, cachedData.sharedWithMe);
      setHasLoadedDashboard(true);
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
  }, [getDashboardSnapshot, loadDashboard, user.id]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    Object.keys(categories).forEach((cat) => {
      counts[cat] = 0;
    });

    allCredentials.forEach((cred) => {
      if (counts.hasOwnProperty(cred.category)) {
        counts[cred.category] += 1;
      }
    });

    return counts;
  }, [allCredentials, categories]);

  return (
    <>
      <ToastViewport />
      <LoadingViewport />
      <NavigationBar 
        user={user} 
        isInviteAdmin={isInviteAdmin}
        activeView={activeView} 
        onViewChange={setActiveView}
        sharedWithMeCount={sharedWithMeRows.length}
        sharedByMeCount={sharedByMeRows.length}
      />

      <main style={{ padding: '76px 16px 16px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        {error && <p style={{ color: '#e53e3e' }}>{error}</p>}
        {isLoading && <p style={{ color: '#718096' }}>Loading your vault...</p>}
        {activeView === 'vault' && (
          <section>
            {!hasLoadedDashboard && (
              <p role="status" style={loadingMessageStyle}>
                <LoadingIndicator size={20} />
                Loading item counts in the background…
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
              {Object.keys(categories).map((cat, index) => (
                <CategoryCard 
                  key={cat} 
                  name={cat}
                  count={hasLoadedDashboard ? categoryCounts[cat] || 0 : '…'}
                  palette={categoryPalette[index % categoryPalette.length]}
                  onAddClick={(category) => setModalCategory(category)}
                  onRefresh={loadDashboard}
                />
              ))}
            </div>
          </section>
        )}

        {(activeView === 'shared_with_me' || activeView === 'shared_by_me') && (
          <SharedManagement
            initialSharedByMe={sharedByMeRows}
            initialSharedWithMe={sharedWithMeRows}
            categories={categories}
            activeTab={activeView}
            onRefresh={loadDashboard}
            isInitialLoading={!hasLoadedDashboard && !error}
          />
        )}
      </main>

      {modalCategory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 200
        }} onClick={() => setModalCategory(null)}>
          <div style={{
            width: '100%',
            maxWidth: '700px',
            backgroundColor: '#fff',
            borderRadius: '18px',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)',
            padding: '20px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Add item to {modalCategory}</h3>
              <button
                type="button"
                onClick={() => setModalCategory(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>
            <CategoryAddForm
              subCategories={categories[modalCategory]}
              category={modalCategory}
              onSuccess={() => {
                setModalCategory(null);
                loadDashboard();
              }}
              onClose={() => setModalCategory(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}

const loadingMessageStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: '#718096', margin: '0 0 12px' };
