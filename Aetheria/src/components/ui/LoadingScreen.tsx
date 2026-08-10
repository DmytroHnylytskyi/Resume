'use client';

import React, { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { Compass } from 'lucide-react';

export default function LoadingScreen(): React.ReactElement | null {
  const { active, progress, item } = useProgress();
  const [isDone, setIsDone] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (active) {
      setHasStarted(true);
    }
  }, [active]);

  useEffect(() => {
    if (progress >= 100 || (hasStarted && !active)) {
      const timeout = setTimeout(() => {
        setIsDone(true);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [progress, active, hasStarted]);

  // Safety fallback: auto-dismiss after 2.5s maximum so user never gets blocked
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsDone(true);
    }, 2500);
    return () => clearTimeout(safetyTimer);
  }, []);

  if (isDone) return null;

  const displayProgress = Math.min(100, Math.round(progress || 0));

  return (
    <div
      className="loading-overlay-screen"
      style={{
        transition: 'opacity 0.4s ease-out',
        opacity: isDone ? 0 : 1,
        pointerEvents: isDone ? 'none' : 'auto'
      }}
    >
      <div className="loading-content-card glass-panel">
        <div className="loading-icon-ring">
          <Compass size={32} color="#38bdf8" className="loading-compass-spin" />
        </div>
        <h3 className="loading-title">Завантаження Aetheria 3D...</h3>
        <p className="loading-subtitle">
          Генерація летального архіпелагу, фізики Rapier 3D та небесного середовища
        </p>

        <div className="loading-bar-track">
          <div
            className="loading-bar-fill"
            style={{ width: `${Math.max(12, displayProgress)}%` }}
          />
        </div>

        <div className="loading-meta-info">
          <span>Ресурси світу</span>
          <span className="loading-percent">{displayProgress}%</span>
        </div>

        {item && (
          <div className="loading-current-file">
            <span>Файл:</span>
            <span>{item.split('/').pop()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
