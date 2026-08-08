/**
 * @file StatusBar.jsx
 * @description Bottom Status Dock component.
 * Displays real-time system connection indicator, list of active layers, and current WebGL FPS rendering metric.
 */

'use client';

import React from 'react';
import useStore from '../../store/useStore';

/**
 * Bottom Status Dock component.
 * @returns {JSX.Element} Centered glassmorphism status pill dock.
 */
export default function StatusBar() {
  const { fps, layers, globeReady } = useStore();

  const activeLayers = Object.entries(layers)
    .filter(([_, state]) => state.enabled)
    .map(([key]) => key);

  return (
    <div className="glass-panel" style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      fontSize: '0.8rem',
      color: 'var(--text-secondary)',
      zIndex: 100,
      borderRadius: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: globeReady ? 'var(--success)' : 'var(--warning)',
          boxShadow: globeReady ? '0 0 8px var(--success)' : 'none'
        }} />
        <span>{globeReady ? 'System Online' : 'Initializing...'}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <span>Active Layers:</span>
        <span style={{ color: 'var(--text-primary)' }}>
          {activeLayers.length > 0 ? activeLayers.join(', ') : 'None'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <span>FPS:</span>
        <span style={{ 
          color: fps >= 50 ? 'var(--success)' : fps >= 30 ? 'var(--warning)' : 'var(--danger)' 
        }}>
          {fps}
        </span>
      </div>
    </div>
  );
}
