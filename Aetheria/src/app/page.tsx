'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { useGameStore } from '../store/useGameStore';
import ControlsHUD from '../components/ui/ControlsHUD';
import BioModal from '../components/ui/BioModal';
import ContactsModal from '../components/ui/ContactsModal';
import SkillsModal from '../components/ui/SkillsModal';
import ProjectModal from '../components/ui/ProjectModal';
import WelcomeModal from '../components/ui/WelcomeModal';
import LoadingScreen from '../components/ui/LoadingScreen';
import ClassicLandingView from '../components/ui/ClassicLandingView';

const IslandCanvas = dynamic(() => import('../components/3d/IslandCanvas'), {
  ssr: false
});

/**
 * HomePage
 * 
 * Application root coordinator rendering dual-view experience:
 * - Interactive 3D WebGL Island (R3F, Rapier 3D, Skeletal FBX)
 * - Classic Responsive Document Resume
 * 
 * Reactively synchronizes `data-theme` and `document.title` on theme/locale switch.
 */
export default function HomePage(): React.ReactElement {
  const { viewMode, theme, language } = useGameStore();

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  React.useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.title = language === 'uk'
      ? 'Aetheria 3D — Портфоліо Дмитра Гнилицького'
      : 'Aetheria 3D — Portfolio of Dmytro Hnylytskyi';
  }, [language]);

  return (
    <main className="portfolio-app-container" data-theme={theme}>
      {/* ── Mode Selection Welcome Screen (First visit) ── */}
      <WelcomeModal />

      {/* ── Project Details Modal (Can open from both 3D & Classic) ── */}
      <ProjectModal />

      {/* ── VIEW MODE A: Classic Web Resume Landing ── */}
      {viewMode === 'classic' && <ClassicLandingView />}

      {/* ── VIEW MODE B: Interactive 3D WebGL Island ── */}
      {viewMode === '3d' && (
        <>
          {/* Preloader overlay while 3D assets load */}
          <LoadingScreen />

          {/* 3D Canvas */}
          <IslandCanvas />

          {/* HUD Top Navigation & Floating [E] Interaction Pill */}
          <ControlsHUD />

          {/* 3D Modal Windows */}
          <BioModal />
          <ContactsModal />
          <SkillsModal />
        </>
      )}
    </main>
  );
}
