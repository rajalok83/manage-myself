'use client';

import { useEffect, useState } from 'react';

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
    <>
      <style>{'@keyframes app-spin { to { transform: rotate(360deg); } } @keyframes app-spin-reverse { to { transform: rotate(-360deg); } }'}</style>
      <div role="status" aria-label="Loading" style={overlayStyle}>
        <div style={spinnerStyle}>
          <span aria-hidden="true" style={lockStyle}>🔒</span>
        </div>
      </div>
    </>
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

const spinnerStyle = {
  width: '74px',
  height: '74px',
  display: 'grid',
  placeItems: 'center',
  border: '6px solid #fbbf24',
  borderTopColor: '#ec4899',
  borderRightColor: '#8b5cf6',
  borderRadius: '50%',
  animation: 'app-spin 0.9s linear infinite',
  background: 'rgba(255, 255, 255, 0.9)',
  boxShadow: '0 10px 28px rgba(37, 99, 235, 0.2)'
};

const lockStyle = {
  fontSize: '30px',
  lineHeight: 1,
  animation: 'app-spin-reverse 0.9s linear infinite'
};
