'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import ControlsHUD from '../components/ui/ControlsHUD';
import BioModal from '../components/ui/BioModal';
import ContactsModal from '../components/ui/ContactsModal';
import SkillsModal from '../components/ui/SkillsModal';
import TeleportTransition from '../components/ui/TeleportTransition';
import LoadingScreen from '../components/ui/LoadingScreen';

const IslandCanvas = dynamic(() => import('../components/3d/IslandCanvas'), {
  ssr: false,
  loading: () => <LoadingScreen />
});

/**
 * Main 3D Island Portfolio Page (Next.js 15 App Router).
 * Initializes the client-side 3D WebGL Canvas with Rapier physics,
 * floating controls HUD, and glassmorphic modals.
 */
export default function HomePage(): React.ReactElement {
  return (
    <main className="portfolio-app-container">
      {/* ── Client-Only 3D WebGL Canvas ── */}
      <IslandCanvas />

      {/* ── Glassmorphic UI & Modals Layer ── */}
      <ControlsHUD />
      <BioModal />
      <ContactsModal />
      <SkillsModal />
      <TeleportTransition />
    </main>
  );
}
