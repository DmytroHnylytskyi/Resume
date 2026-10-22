'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { enableDayNightThemeSync } from '../store/dayNightState';
import ProjectModal from '../components/ui/ProjectModal';
import IntroOverlay from '../components/ui/IntroOverlay';
import ClassicLandingView from '../components/ui/ClassicLandingView';

/**
 * Весь 3D-режим — в одном ленивом чанке. Статический импорт LoadingScreen
 * тянул three.js через @react-three/drei в стартовый бандл классики, а
 * MiniRadar — islandScene.json и тактическую карту. Классика платила за
 * 3D, которое могло не открыться.
 */
const IslandExperience = dynamic(() => import('../components/3d/IslandExperience'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        zIndex: 99997,
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    />
  )
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
  // Granular Zustand subscriptions: whole-store subscription would re-render
  // the entire app tree (including the Canvas subtree reconcile and all HUD)
  // on any store change — e.g. every interactionPrompt edge when walking past
  // an NPC, every interactionPrompt edge. Pattern is the same as CharacterController.
  const viewMode = useGameStore((s) => s.viewMode);
  const theme = useGameStore((s) => s.theme);
  const language = useGameStore((s) => s.language);
  const isSceneLoaded = useGameStore((s) => s.isSceneLoaded);
  // Action reference is stable — selector never triggers a re-render.
  const setIntroPlaying = useGameStore((s) => s.setIntroPlaying);

  // Theme & language persistence: the pre-paint script in layout.tsx has
  // already set <html data-theme> (stored theme, else OS preference); sync
  // the store with it once on mount so React takes over, then persist every
  // change back to localStorage.
  React.useEffect(() => {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    const effective = htmlTheme === 'dark' || htmlTheme === 'light' ? htmlTheme : 'light';
    if (useGameStore.getState().theme !== effective) useGameStore.setState({ theme: effective });

    let effectiveLang: 'en' | 'uk' | null = null;
    // A shared ?lang= link wins over the visitor's stored choice — explicit
    // intent of the person who shared it beats remembered preference.
    try {
      const param = new URLSearchParams(window.location.search).get('lang');
      if (param === 'uk' || param === 'en') effectiveLang = param;
    } catch (_) {}
    if (!effectiveLang) {
      try {
        const storedLang = localStorage.getItem('aetheria_lang');
        if (storedLang === 'uk' || storedLang === 'en') effectiveLang = storedLang;
      } catch (_) {}
    }
    if (effectiveLang && useGameStore.getState().language !== effectiveLang) {
      useGameStore.setState({ language: effectiveLang });
    }

    // Direct mode check via URL (?mode=classic / ?mode=3d) or section hash
    try {
      const modeParam = new URLSearchParams(window.location.search).get('mode');
      const hash = window.location.hash;
      if (
        modeParam === 'classic' ||
        hash === '#resume' ||
        hash === '#classic' ||
        hash === '#projects' ||
        hash === '#about' ||
        hash === '#education' ||
        hash === '#skills' ||
        hash === '#certifications' ||
        hash === '#contacts'
      ) {
        useGameStore.setState({ viewMode: 'classic' });
      } else if (modeParam === '3d') {
        useGameStore.setState({ viewMode: '3d' });
      }
    } catch (_) {}
    // Arm the day/night → DOM-theme threshold only now: the store has
    // adopted the pre-paint html theme, hydration is complete, so the first
    // crossing (e.g. stored cycle sitting below the horizon) can safely
    // drive the store theme.
    enableDayNightThemeSync(effective === 'dark' ? 'dark' : 'light');
    // Runs once: hydration sync only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // Stale-closure guard: right after the hydration sync above, the first
    // render's effect still carries the pre-sync theme — skip that write.
    if (useGameStore.getState().theme !== theme) return;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('aetheria_theme', theme);
    } catch (_) {}
  }, [theme]);

  React.useEffect(() => {
    if (useGameStore.getState().language !== language) return;
    document.documentElement.setAttribute('lang', language);
    document.title = language === 'uk'
      ? 'Aetheria 3D — Портфоліо Дмитра Гнилицького'
      : 'Aetheria 3D — Portfolio of Dmytro Hnylytskyi';
    try {
      localStorage.setItem('aetheria_lang', language);
    } catch (_) {}
    // Reflect the language in the URL so a Ukrainian page can be shared as a
    // link; the default EN keeps a clean canonical URL without the parameter.
    try {
      const url = new URL(window.location.href);
      if (language === 'uk') {
        if (url.searchParams.get('lang') !== 'uk') {
          url.searchParams.set('lang', 'uk');
          window.history.replaceState(null, '', url);
        }
      } else if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        window.history.replaceState(null, '', url);
      }
    } catch (_) {}
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

    const pendingIntro = useGameStore.getState().pendingIntro;
    if (pendingIntro) {
      useGameStore.setState({ pendingIntro: false });
      if (!reducedMotion) setIntroPlaying(true);
    } else if (!seen && !reducedMotion) {
      setIntroPlaying(true);
    }
  }, [isSceneLoaded, setIntroPlaying]);

  return (
    <main className="portfolio-app-container" data-theme={theme}>
      {/* ── Cinematic intro titles + compact post-landing mode card ── */}
      <IntroOverlay />

      {/* ── Project Details Modal (Can open from both 3D & Classic) ── */}
      <ProjectModal />

      {/* ── VIEW MODE A: Classic Web Resume Landing ── */}
      {viewMode === 'classic' && <ClassicLandingView />}

      {/* ── VIEW MODE B: Interactive 3D WebGL Island (lazy chunk) ── */}
      {viewMode === '3d' && <IslandExperience />}
    </main>
  );
}
