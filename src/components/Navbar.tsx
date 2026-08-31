'use client';

import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-main)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div className="container flex items-center justify-between" style={{ height: '70px' }}>
        {/* Brand Logo */}
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Drift"
            style={{
              height: '150px',
              maxHeight: '170px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
      </div>
    </header>
  );
};
