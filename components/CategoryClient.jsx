'use client';

import { useCallback, useEffect, useState } from 'react';
import CredentialRow from './CredentialRow';
import NavigationBar from './NavigationBar';
import SharedManagement from './SharedManagement';

export default function CategoryClient({ user, categoryName }) {
  const [credentials, setCredentials] = useState([]);
  const [sharedByMeCount, setSharedByMeCount] = useState(0);
  const [sharedWithMeCount, setSharedWithMeCount] = useState(0);
  const [sharedByMeRows, setSharedByMeRows] = useState([]);
  const [sharedWithMeRows, setSharedWithMeRows] = useState([]);
  const [activeView, setActiveView] = useState('vault');
  const [error, setError] = useState('');

  const loadCategory = useCallback(async () => {
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
  }, [categoryName]);

  useEffect(() => {
    let cancelled = false;
    loadCategory().catch((loadError) => {
      if (!cancelled) setError(loadError.message);
    });
    return () => { cancelled = true; };
  }, [loadCategory]);

  return (
    <>
      <NavigationBar
        user={user}
        activeView={activeView}
        onViewChange={setActiveView}
        sharedByMeCount={sharedByMeCount}
        sharedWithMeCount={sharedWithMeCount}
      />
      <main style={{ padding: '76px 5px 5px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
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
          />
        )}
      </main>
    </>
  );
}