'use client';

import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../data/resumeData';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen(): React.ReactElement | null {
  const { progress, active } = useProgress();
  const { language, isSceneLoaded, setSceneLoaded, viewMode } = useGameStore();
  const [displayProgress, setDisplayProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const t = translations[language].loading;

  useEffect(() => {
    setDisplayProgress((prev) => Math.max(prev, Math.round(progress)));
  }, [progress]);

  useEffect(() => {
    // If progress hits 100% or loading completes
    if (displayProgress >= 100 || !active) {
      const timer = setTimeout(() => {
        setFadeOut(true);
        const doneTimer = setTimeout(() => {
          setSceneLoaded(true);
        }, 500);
        return () => clearTimeout(doneTimer);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [displayProgress, active, setSceneLoaded]);

  // Don't show loading screen if already loaded or in classic view mode
  if (isSceneLoaded || viewMode === 'classic') return null;

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
