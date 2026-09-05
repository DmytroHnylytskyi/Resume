'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { useGameStore } from '../store/useGameStore';
import ControlsHUD from '../components/ui/ControlsHUD';
import BioModal from '../components/ui/BioModal';
import ContactsModal from '../components/ui/ContactsModal';
import SkillsModal from '../components/ui/SkillsModal';
import ProjectModal from '../components/ui/ProjectModal';
import IntroOverlay from '../components/ui/IntroOverlay';
import LoadingScreen from '../components/ui/LoadingScreen';
import ClassicLandingView from '../components/ui/ClassicLandingView';
import MiniRadar from '../components/ui/MiniRadar';
import MobileTouchControls from '../components/ui/MobileTouchControls';
import LandscapeOrientationGuard from '../components/ui/LandscapeOrientationGuard';

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
  const { viewMode, theme, language, isSceneLoaded, setIntroPlaying } = useGameStore();

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  React.useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.title = language === 'uk'
      ? 'Aetheria 3D — Портфоліо Дмитра Гнилицького'
      : 'Aetheria 3D — Portfolio of Dmytro Hnylytskyi';
  }, [language]);

  // Cinematic intro starts only AFTER the world has fully loaded — the loader
  // is never mixed with the flight. First visit only; respects reduced-motion.
  // Repeat visitors land straight on the island and can replay from the guide.
  React.useEffect(() => {
    if (!isSceneLoaded) return;
    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {}
    let seen = false;
    try {
      seen = localStorage.getItem('aetheria_intro_seen') === '1';
    } catch (_) {}
    if (!seen && !reducedMotion) setIntroPlaying(true);
  }, [isSceneLoaded, setIntroPlaying]);

  return (
    <main className="portfolio-app-container" data-theme={theme}>
      {/* ── Cinematic intro titles + compact post-landing mode card ── */}
      <IntroOverlay />

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

          {/* Enforce Landscape Orientation on Mobile */}
          <LandscapeOrientationGuard />

          {/* Mobile Virtual Joystick & Touch Camera Controls */}
          <MobileTouchControls />

          {/* Circular Glass Mini-Radar & Island Tactical Map */}
          <MiniRadar />

          {/* 3D Modal Windows */}
          <BioModal />
          <ContactsModal />
          <SkillsModal />
        </>
      )}
    </main>
  );
}
