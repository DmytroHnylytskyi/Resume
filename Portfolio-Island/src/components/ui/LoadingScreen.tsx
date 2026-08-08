'use client';

import React from 'react';
import { useProgress } from '@react-three/drei';
import { Compass } from 'lucide-react';

export default function LoadingScreen(): React.ReactElement | null {
  const { active, progress, item } = useProgress();

  if (!active && progress >= 100) return null;

  return (
    <div className="loading-overlay-screen">
      <div className="loading-content-card glass-panel">
        <div className="loading-icon-ring">
          <Compass size={32} color="#38bdf8" className="loading-compass-spin" />
        </div>
        <h3 className="loading-title">Завантаження 3D Острова...</h3>
        <p className="loading-subtitle">
          Генерація летального архіпелагу, фізики Rapier 3D та небесного середовища
        </p>

        <div className="loading-bar-track">
          <div
            className="loading-bar-fill"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>

        <div className="loading-meta-info">
          <span>Ресурси світу</span>
          <span className="loading-percent">{Math.round(progress)}%</span>
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
