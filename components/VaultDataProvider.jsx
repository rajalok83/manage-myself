'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const VaultDataContext = createContext(null);

export function VaultDataProvider({ children }) {
  const [snapshots, setSnapshots] = useState({});
  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;

  const getDashboardSnapshot = useCallback(
    (userId) => snapshotsRef.current[String(userId)] || null,
    []
  );

  const setDashboardSnapshot = useCallback((userId, data) => {
    const key = String(userId);
    setSnapshots((current) => {
      const previous = current[key];
      const next = {
        credentials: data.credentials || [],
        sharedByMe: data.sharedByMe || [],
        sharedWithMe: data.sharedWithMe || []
      };
      if (JSON.stringify(previous) === JSON.stringify(next)) return current;
      return { ...current, [key]: next };
    });
  }, []);

  const getCategorySnapshot = useCallback((userId, categoryName) => {
    const snapshot = snapshotsRef.current[String(userId)];
    if (!snapshot) return null;
    return {
      credentials: snapshot.credentials.filter((item) => item.category === categoryName),
      sharedByMeCount: snapshot.sharedByMe.reduce(
        (count, item) => count + (item.shared_with?.length || 0),
        0
      ),
      sharedByMe: snapshot.sharedByMe,
      sharedWithMe: snapshot.sharedWithMe
    };
  }, []);

  const setCategorySnapshot = useCallback((userId, categoryName, categoryData, shareData) => {
    const key = String(userId);
    setSnapshots((current) => {
      const previous = current[key] || { credentials: [], sharedByMe: [], sharedWithMe: [] };
      const next = {
        credentials: [
          ...previous.credentials.filter((item) => item.category !== categoryName),
          ...(categoryData.credentials || [])
        ],
        sharedByMe: shareData.sharedByMe || [],
        sharedWithMe: shareData.sharedWithMe || []
      };
      if (JSON.stringify(previous) === JSON.stringify(next)) return current;
      return { ...current, [key]: next };
    });
  }, []);

  const value = useMemo(() => ({
    getDashboardSnapshot,
    setDashboardSnapshot,
    getCategorySnapshot,
    setCategorySnapshot
  }), [getDashboardSnapshot, setDashboardSnapshot, getCategorySnapshot, setCategorySnapshot]);

  return <VaultDataContext.Provider value={value}>{children}</VaultDataContext.Provider>;
}

export function useVaultData() {
  const context = useContext(VaultDataContext);
  if (!context) throw new Error('useVaultData must be used within a VaultDataProvider.');
  return context;
}
