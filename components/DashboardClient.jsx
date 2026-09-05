'use client';

import { useEffect, useState, useMemo } from 'react';
import NavigationBar from './NavigationBar';
import SharedManagement from './SharedManagement';
import CategoryCard from './CategoryCard';
import CategoryAddForm from './CategoryAddForm';

const cardPalette = [
  { background: '#f4f1ea', accent: '#8b6f47', border: '#e7dcc6' },
  { background: '#edf5ef', accent: '#3d6d4c', border: '#d6e8d9' },
  { background: '#eef4fb', accent: '#355f8a', border: '#d8e7f7' },
  { background: '#f7f0f7', accent: '#7a4d73', border: '#ead9ec' },
  { background: '#fff5ee', accent: '#b96b42', border: '#f2d9c9' },
  { background: '#f3f7f8', accent: '#496a72', border: '#d9e6e8' },
];

export default function DashboardClient({ user, categories }) {
  const [activeView, setActiveView] = useState('vault');
  const [modalCategory, setModalCategory] = useState(null);
  const [allCredentials, setAllCredentials] = useState([]);
  const [sharedByMeRows, setSharedByMeRows] = useState([]);
  const [sharedWithMeRows, setSharedWithMeRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign('/');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Unable to load dashboard.');
      setAllCredentials(data.credentials || []);
      setSharedByMeRows(data.sharedByMe || []);
      setSharedWithMeRows(data.sharedWithMe || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);
  
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
      <NavigationBar 
        user={user} 
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
              {Object.keys(categories).map((cat, index) => (
                <CategoryCard 
                  key={cat} 
                  name={cat}
                  count={categoryCounts[cat] || 0}
                  palette={cardPalette[index % cardPalette.length]}
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
            activeTab={activeView}
            onRefresh={loadDashboard}
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
