'use client';

import Link from 'next/link';

export default function CategoryCard({ name, count = 0, palette = { background: '#f7fafc', accent: '#4a5568', border: '#e2e8f0' }, onAddClick }) {
  const href = `/category/${encodeURIComponent(name)}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 14px',
        border: `1px solid ${palette.border}`,
        borderRadius: '18px',
        background: `linear-gradient(135deg, ${palette.background} 0%, #ffffff 100%)`,
        textDecoration: 'none',
        color: '#2d3748',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)',
        minHeight: '120px',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 10px rgba(15, 23, 42, 0.06)';
      }}
    >
      <Link href={href} style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        color: 'inherit',
        textDecoration: 'none'
      }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: 'clamp(20px, 3.5vw, 16px)', 
          fontWeight: '900',
          textAlign: 'center',
          lineHeight: '1.2',
          color: '#1f2937'
        }}>
          {name}
        </h3>
        <div style={{
          fontSize: 'clamp(20px, 5vw, 28px)',
          fontWeight: '900',
          color: palette.accent,
          marginBottom: '6px',
          lineHeight: 1
        }}>
          {count}
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Add item to ${name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onAddClick) onAddClick(name);
        }}
        style={{
          position: 'absolute',
          left: '10px',
          bottom: '10px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: palette.accent,
          color: '#fff',
          fontSize: '22px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 6px 12px rgba(15, 23, 42, 0.12)'
        }}
      >
        +
      </button>
    </div>
  );
}
