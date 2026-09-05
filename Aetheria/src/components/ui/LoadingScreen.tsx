'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useProgress } from '@react-three/drei';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../data/resumeData';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen(): React.ReactElement | null {
  const { progress, active, loaded, total } = useProgress();
  const { language, isSceneLoaded, setSceneLoaded, viewMode } = useGameStore();
  const [displayProgress, setDisplayProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [gone, setGone] = useState(false);
  const hasStartedRef = useRef(false);

  const t = translations[language].loading;

  // Track progress and ensure we notice when asset loading starts
  useEffect(() => {
    if (active || total > 0 || progress > 0) {
      hasStartedRef.current = true;
    }
    if (progress > 0) {
      setDisplayProgress((prev) => Math.max(prev, Math.round(progress)));
    }
  }, [progress, active, total]);

  // Actual completion detector: only finishes when assets are truly loaded.
  // The world is marked ready the MOMENT the fade-out begins — the loader
  // dissolves into the cinematic intro instead of holding it back.
  useEffect(() => {
    const isFinished =
      displayProgress >= 100 ||
      progress >= 100 ||
      (hasStartedRef.current && !active && total > 0 && loaded >= total);

    if (!isFinished) return;

    setDisplayProgress(100);
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setFadeOut(true);
        setSceneLoaded(true);
        timers.push(window.setTimeout(() => setGone(true), 650));
      }, 400)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [displayProgress, progress, active, loaded, total, setSceneLoaded]);

  // Safety fallback: if all assets were cached and queue was empty, mark loaded after 8s
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!isSceneLoaded) {
        setDisplayProgress(100);
        setFadeOut(true);
        setSceneLoaded(true);
        setTimeout(() => setGone(true), 650);
      }
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, [isSceneLoaded, setSceneLoaded]);

  // Keep rendering through the fade-out transition, then unmount
  if (gone || viewMode === 'classic') return null;

  return (
    <div className={`loading-screen-backdrop ${fadeOut ? 'fade-out' : ''}`}>
      <div className="loading-content glass-panel">
        <div className="loading-brand">
          <div className="brand-dot pulse" />
          <span className="loading-brand-title">AETHERIA 3D</span>
        </div>

        <div className="loading-spinner-wrapper">
          <Loader2 className="loading-spinner-icon" size={28} />
        </div>

        <div className="loading-text-group">
          <h2 className="loading-title">{t.title}</h2>
          <p className="loading-subtitle">{t.subtitle}</p>
        </div>

        {/* Progress Bar */}
        <div className="loading-bar-container">
          <div
            className="loading-bar-fill"
            style={{ width: `${Math.min(100, Math.max(12, displayProgress))}%` }}
          />
        </div>

        <div className="loading-progress-number">
          {Math.min(100, Math.max(12, displayProgress))}%
        </div>

        <p className="loading-tip">{t.tip}</p>
      </div>
    </div>
  );
}
