/**
 * @file page.js
 * @description Main application page component.
 * Mounts WebGL 3D Globe Canvas alongside dynamic UI overlays (Navbar, LayerPanel, DetailPanel, StatusBar).
 */

'use client';

import dynamic from 'next/dynamic';
import Navbar from '../components/ui/Navbar';
import LayerPanel from '../components/ui/LayerPanel';
import DetailPanel from '../components/ui/DetailPanel';
import StatusBar from '../components/ui/StatusBar';

// Dynamically import 3D Globe Canvas with SSR disabled for WebGL browser context
const Globe = dynamic(() => import('../components/globe/Globe'), { ssr: false });

import ErrorBoundary from '../components/globe/ErrorBoundary';

/**
 * Main GlobeScope Application Page component.
 * @returns {JSX.Element} Main viewport container mounting R3F canvas and cockpit UI overlays.
 */
export default function Home() {
  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <ErrorBoundary>
        <Globe />
      </ErrorBoundary>
      <Navbar />
      <LayerPanel />
      <DetailPanel />
      <StatusBar />
    </main>
  );
}
