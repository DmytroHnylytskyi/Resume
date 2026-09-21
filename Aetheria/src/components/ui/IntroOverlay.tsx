'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles } from '../../data/resumeData';

type IntroStage = 'intro' | 'hidden';

/**
 * IntroOverlay
 *
 * DOM layer for the cinematic flight experience:
 * - While `isIntroPlaying`: brand title block over the flying camera
 *   (pure CSS animation — zero WebGL cost) plus a skip hint.
 * - When flight ends or is skipped: smoothly fades out and lets player control character immediately.
 */
export default function IntroOverlay(): React.ReactElement | null {
  const isIntroPlaying = useGameStore((s) => s.isIntroPlaying);
  const isSceneLoaded = useGameStore((s) => s.isSceneLoaded);
  const viewMode = useGameStore((s) => s.viewMode);
  const language = useGameStore((s) => s.language);
  const [stage, setStage] = useState<IntroStage>('hidden');
  const [leaving, setLeaving] = useState(false);

  // Flight started - strictly require isSceneLoaded AND viewMode === '3d'
  useEffect(() => {
    if (isIntroPlaying && isSceneLoaded && viewMode === '3d') {
      setLeaving(false);
      setStage('intro');
    }
  }, [isIntroPlaying, isSceneLoaded, viewMode]);

  // Flight ended (landed, skipped, or left 3D mode)
  useEffect(() => {
    if (stage === 'intro' && (!isIntroPlaying || !isSceneLoaded || viewMode !== '3d')) {
      setLeaving(true);
      const t = window.setTimeout(() => {
        setLeaving(false);
        setStage('hidden');
      }, 500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isIntroPlaying, isSceneLoaded, viewMode, stage]);

  if (stage === 'hidden' || !isSceneLoaded || viewMode !== '3d') return null;

  const profile = developerProfiles[language];
  const skipHint = language === 'uk'
    ? 'Натисніть будь-що, щоб пропустити'
    : 'Press anything to skip';

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
