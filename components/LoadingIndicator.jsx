export default function LoadingIndicator({ size = 74 }) {
  const borderWidth = Math.max(2, Math.round(size * 0.08));

  return (
    <>
      <style>{'@keyframes loading-indicator-spin { to { transform: rotate(360deg); } } @keyframes loading-indicator-counter-spin { to { transform: rotate(-360deg); } }'}</style>
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          display: 'grid',
          placeItems: 'center',
          border: `${borderWidth}px solid #fbbf24`,
          borderTopColor: '#ec4899',
          borderRightColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'loading-indicator-spin 0.9s linear infinite',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 10px 28px rgba(37, 99, 235, 0.2)',
          flex: '0 0 auto'
        }}
      >
        <span
          style={{
            fontSize: Math.round(size * 0.4),
            lineHeight: 1,
            animation: 'loading-indicator-counter-spin 0.9s linear infinite'
          }}
        >
          🔒
        </span>
      </span>
    </>
  );
}
