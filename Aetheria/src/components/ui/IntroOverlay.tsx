'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { Compass, FileText } from 'lucide-react';

type IntroStage = 'intro' | 'card' | 'hidden';

/**
 * IntroOverlay
 *
 * DOM layer for the cinematic first-visit experience:
 * - While `isIntroPlaying`: brand title block over the flying camera
 *   (pure CSS animation — zero WebGL cost) plus a skip hint.
 * - On landing (or instantly for repeat visits): a compact, non-blocking
 *   mode card ("explore the island" / "classic resume") that stays on screen
 *   until the visitor picks a mode.
 * Skipping is handled by CharacterController (any key/click); this overlay
 * only reflects store state.
 */
export default function IntroOverlay(): React.ReactElement | null {
  const isIntroPlaying = useGameStore((s) => s.isIntroPlaying);
  const isSceneLoaded = useGameStore((s) => s.isSceneLoaded);
  const language = useGameStore((s) => s.language);
  const viewMode = useGameStore((s) => s.viewMode);
  const setViewMode = useGameStore((s) => s.setViewMode);
  const [stage, setStage] = useState<IntroStage>('hidden');
  const [leaving, setLeaving] = useState(false);
  // The mode card may appear at most once per page session — without this
  // guard the "returning visitor" effect re-fires after every dismissal
  // and the card pops back up forever.
  const cardShownOnce = useRef(false);

  // Flight started (first visit or manual replay)
  useEffect(() => {
    if (isIntroPlaying) {
      setLeaving(false);
      setStage('intro');
    }
  }, [isIntroPlaying]);

  // Flight ended (landed or skipped) → fade the titles. The mode card is
  // offered only when it hasn't been shown this session (first visit);
  // after a manual replay the player already picked their mode — return
  // straight to gameplay.
  useEffect(() => {
    if (stage === 'intro' && !isIntroPlaying) {
      setLeaving(true);
      const t = window.setTimeout(() => {
        setLeaving(false);
        if (!cardShownOnce.current) {
          cardShownOnce.current = true;
          setStage('card');
        } else {
          setStage('hidden');
        }
      }, 500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isIntroPlaying, stage]);

  // Returning visitor (no flight): show the card once, only in the 3D view
  useEffect(() => {
    if (stage === 'hidden' && !cardShownOnce.current && !isIntroPlaying && isSceneLoaded && viewMode === '3d') {
      try {
        if (localStorage.getItem('aetheria_intro_seen') === '1') {
          cardShownOnce.current = true;
          const t = window.setTimeout(() => setStage('card'), 600);
          return () => window.clearTimeout(t);
        }
      } catch (_) {}
    }
    return undefined;
  }, [stage, isIntroPlaying, isSceneLoaded, viewMode]);

  const dismissCard = () => {
    setStage('hidden');
  };

  if (stage === 'hidden') return null;

  const profile = developerProfiles[language];
  const t = translations[language].welcome;
  const skipHint = language === 'uk'
    ? 'Натисніть будь-що, щоб пропустити'
    : 'Press anything to skip';
  const hereLabel = language === 'uk' ? 'Ви на острові' : 'You are on the island';

  // The mode card belongs to the 3D island only — never overlay the classic CV
  if (stage === 'card' && viewMode !== '3d') return null;

  if (stage === 'intro') {
    return (
      <div className={`intro-overlay${leaving ? ' leaving' : ''}`}>
        <div className="intro-title-block">
          <h1 className="intro-title">AETHERIA</h1>
          <p className="intro-subtitle">
            {profile.name} · {profile.role}
          </p>
        </div>
        <p className="intro-skip-hint">{skipHint}</p>
      </div>
    );
  }

  return (
    <div className="intro-overlay">
      <div className="intro-mode-card glass-panel" role="dialog" aria-label={t.chooseMode}>
        <div className="intro-mode-here">
          <span className="intro-mode-dot" />
          {hereLabel}
        </div>
        <p className="intro-mode-text">{t.chooseMode}</p>
        <div className="intro-mode-actions">
          <button className="intro-mode-btn secondary" onClick={() => { setViewMode('classic'); dismissCard(); }}>
            <FileText size={15} />
            <span>{t.modeClassicBtn}</span>
          </button>
          <button className="intro-mode-btn primary" onClick={dismissCard} autoFocus>
            <Compass size={15} />
            <span>{language === 'uk' ? 'Дослідити острів' : 'Explore the island'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
