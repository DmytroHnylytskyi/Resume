/**
 * @file StatusBar.jsx
 * @description Bottom Status Dock component.
 * Displays real-time system connection indicator, list of active layers, and current WebGL FPS rendering metric.
 */

'use client';

import React, { useState, useEffect } from 'react';
import useStore from '../../store/useStore';

/**
 * Bottom Status Dock component.
 * @returns {JSX.Element|null} Centered glassmorphism status pill dock.
 */
export default function StatusBar() {
  const { fps, layers, globeReady, detailPanelOpen } = useStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const activeLayers = Object.entries(layers)
    .filter(([_, state]) => state.enabled)
    .map(([key]) => key);

  // When mobile inspection bottom sheet is active, hide StatusBar to prevent overlap
  if (isMobile && detailPanelOpen) {
    return null;
  }

  return (
    <div className="glass-panel" style={{
      position: 'fixed',
      bottom: 'max(14px, var(--sab))',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '6px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '12px' : '20px',
      fontSize: '0.78rem',
      color: 'var(--text-secondary)',
      zIndex: 80,
      borderRadius: '20px',
      maxWidth: 'calc(100vw - 28px)',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ 
          width: '7px', 
          height: '7px', 
          borderRadius: '50%', 
          background: globeReady ? 'var(--success)' : 'var(--warning)',
          boxShadow: globeReady ? '0 0 6px var(--success)' : 'none'
        }} />
        <span>{globeReady ? (isMobile ? 'Live' : 'System Online') : 'Init...'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="hide-on-mobile">Active Layers:</span>
        <span style={{ color: 'var(--text-primary)' }}>
          {isMobile ? `${activeLayers.length} Layers` : (activeLayers.length > 0 ? activeLayers.join(', ') : 'None')}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>FPS:</span>
        <span style={{ 
          fontWeight: 600,
          color: fps >= 50 ? 'var(--success)' : fps >= 30 ? 'var(--warning)' : 'var(--danger)' 
        }}>
          {fps}
        </span>
      </div>
    </div>
  );
}
