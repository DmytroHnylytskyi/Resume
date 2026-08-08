/**
 * @file ErrorBoundary.jsx
 * @description React ErrorBoundary component protecting WebGL 3D Canvas rendering context.
 * Catches WebGL initialization crashes or rendering exceptions gracefully.
 */

'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WebGL 3D Context Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: '#fff',
          gap: '16px',
          padding: '24px'
        }}>
          <AlertTriangle size={48} color="var(--danger)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>3D WebGL Context Interrupted</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center', fontSize: '0.9rem' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred in the WebGL graphics pipeline.'}
          </p>
          <button
            className="btn-primary"
            onClick={this.handleReload}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}
          >
            <RefreshCw size={16} /> Reload 3D Scene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
