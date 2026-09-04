'use client'; // Required for UI click processing

export default function LandingPage() {
  const handleOAuthDispatch = (e) => {
    // 1. Force the browser to kill all standard tracking event listeners
    e.preventDefault();
    
    console.log("🚀 FORCING HARD BREAK OUT: Assigning native window replacement location");
    
    // 2. FIXED: window.location.assign completely flushes your browser's history frame matrix.
    // This forces Chrome to treat the request as a physical domain escape command,
    // bypassing Opaque Response Blocking and forcing Google's login interface to render.
    window.location.assign('/api/auth/signin');
  };

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7fafc', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '450px', width: '100%', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', color: '#2d3748', marginBottom: '10px', marginTop: 0 }}>Manage Myself</h1>
        <p style={{ color: '#718096', fontSize: '15px', marginBottom: '30px', lineHeight: '1.5' }}>
          Secure runtime encrypted credential data storage spaces. Zero password persistence inside plaintext data frames.
        </p>
        
        <a 
          href="/api/auth/signin"
          onClick={handleOAuthDispatch}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            padding: '14px 24px', backgroundColor: '#4285F4', color: '#fff',
            borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px',
            transition: 'background-color 0.2s', width: '100%', boxSizing: 'border-box',
            cursor: 'pointer'
          }}
        >
          Sign In / Register with Google
        </a>
      </div>
    </main>
  );
}
