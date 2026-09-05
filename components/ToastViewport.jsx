'use client';

import { useEffect, useState } from 'react';

export default function ToastViewport() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timeout;
    const handleToast = (event) => {
      setToast(event.detail);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setToast(null), 3600);
    };

    window.addEventListener('app-toast', handleToast);
    return () => {
      window.removeEventListener('app-toast', handleToast);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!toast) return null;

  return (
    <div role="status" style={{
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: 500,
      maxWidth: 'min(360px, calc(100vw - 40px))',
      padding: '12px 16px',
      borderRadius: '10px',
      background: toast.tone === 'success' ? '#166534' : '#991b1b',
      color: '#fff',
      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.2)',
      fontSize: '13px',
      fontWeight: '600'
    }}>
      {toast.message}
    </div>
  );
}