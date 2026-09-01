'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Smartphone, FileText, Maximize, RotateCcw } from 'lucide-react';

/**
 * LandscapeOrientationGuard
 * 
 * Enforces horizontal/landscape mode for mobile 3D gameplay.
 * Displays an animated rotation guide and quick-action buttons when held vertically,
 * ensuring optimal 16:9/20:9 dual-thumb ergonomics and preventing narrow FOV clipping.
 */
export default function LandscapeOrientationGuard(): React.ReactElement | null {
  const { viewMode, isInitialWelcomeOpen, language, setViewMode } = useGameStore();

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(hasTouch);

      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);

      const fullscreenActive = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(fullscreenActive);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleToggleFullscreen = () => {
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (_) {}
  };

  const handleSwitchToClassic = () => {
    setViewMode('classic');
  };

  // Only activate in 3D mode on touch devices in portrait orientation
  if (viewMode !== '3d' || isInitialWelcomeOpen || !isTouchDevice || !isPortrait) {
    return null;
  }

  const isUk = language === 'uk';

  return (
    <div className="orientation-guard-backdrop">
      <div className="orientation-guard-card glass-panel obsidian-modal">
        {/* Animated Rotating Smartphone Graphic */}
        <div className="orientation-animation-box">
          <div className="phone-rotate-animator">
            <Smartphone size={56} className="phone-anim-icon" />
          </div>
          <div className="rotate-arc-indicator">
            <RotateCcw size={22} className="rotate-arc-icon" />
          </div>
        </div>

        {/* Text Content */}
        <div className="orientation-text-content">
          <h2 className="orientation-title">
            {isUk ? 'Поверніть пристрій горизонтально' : 'Please Rotate Your Device'}
          </h2>
          <p className="orientation-desc">
            {isUk
              ? '3D-світ Aetheria оптимізовано для альбомної орієнтації та зручного керування двома руками.'
              : 'Aetheria 3D is designed for landscape orientation with dual-thumb controls.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="orientation-actions-group">
          {/* Optional Fullscreen Toggle */}
          <button
            className="orientation-btn secondary"
            onClick={handleToggleFullscreen}
            title={isUk ? 'Розгорнути на весь екран' : 'Toggle Fullscreen'}
          >
            <Maximize size={16} />
            <span>{isUk ? 'На весь екран' : 'Fullscreen Mode'}</span>
          </button>

          {/* Quick Fallback to Vertical Classic Resume */}
          <button
            className="orientation-btn primary"
            onClick={handleSwitchToClassic}
          >
            <FileText size={16} />
            <span>{isUk ? 'Читати вертикально як Резюме' : 'Read Vertically as Resume'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
