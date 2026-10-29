import React from 'react';

const Footer = () => {
  return (
    <footer
      style={{
        padding: '1.75rem',
        borderTop: '1px solid var(--glass-border-subtle)',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontSize: '0.8125rem',
        marginTop: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <span>© {new Date().getFullYear()} Walleto</span>
        <span>Shared expenses, made simpler.</span>
      </div>
    </footer>
  );
};

export default Footer;
