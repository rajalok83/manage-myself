import LoadingIndicator from './LoadingIndicator';

export default function PageLoading({ message = 'Loading your vault…', categories = [] }) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ maxWidth: '1200px', margin: '0 auto', padding: '76px 16px 16px', fontFamily: 'sans-serif' }}
    >
      <p style={messageStyle}>
        <LoadingIndicator size={30} />
        {message}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
        {categories.length > 0 ? categories.map((name) => (
          <div key={name} style={categoryCardStyle}>
            <strong style={{ color: '#1f2937' }}>{name}</strong>
            <span style={{ color: '#64748b', fontSize: '24px', fontWeight: 700 }}>…</span>
          </div>
        )) : [0, 1, 2, 3].map((item) => (
          <div key={item} aria-hidden="true" style={skeletonCardStyle} />
        ))}
      </div>
    </main>
  );
}

const messageStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  color: '#64748b',
  margin: '0 0 16px'
};

const categoryCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  minHeight: '120px',
  border: '1px solid #e2e8f0',
  borderRadius: '18px',
  background: '#fff'
};

const skeletonCardStyle = {
  height: '120px',
  border: '1px solid #e2e8f0',
  borderRadius: '18px',
  background: 'linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%)'
};
