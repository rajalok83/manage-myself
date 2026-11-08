'use client';

import { useEffect, useState } from 'react';
import LoadingIndicator from './LoadingIndicator';

export default function LoadingViewport() {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    const handleLoading = (event) => {
      setActiveRequests((count) => Math.max(0, count + (event.detail?.active ? 1 : -1)));
    };
    window.addEventListener('app-loading', handleLoading);
    return () => window.removeEventListener('app-loading', handleLoading);
  }, []);

  if (activeRequests === 0) return null;

  return (
    <div role="status" aria-label="Loading" aria-busy="true" style={overlayStyle}>
      <LoadingIndicator />
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 600,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(255, 255, 255, 0.42)',
  cursor: 'wait'
};
