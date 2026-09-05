import { getSessionUser } from '../lib/turso';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  if (await getSessionUser()) redirect('/dashboard');

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7fafc', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '450px', width: '100%', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', color: '#2d3748', marginBottom: '10px', marginTop: 0 }}>Manage Myself</h1>
        <p style={{ color: '#718096', fontSize: '15px', marginBottom: '30px', lineHeight: '1.5' }}>
          Secure runtime encrypted credential data storage spaces. Zero password persistence inside plaintext data frames.
        </p>
        
        <a 
          href="/api/auth/signin"
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
