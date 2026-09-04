'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Smartphone, FileText, Maximize, RotateCcw, Info } from 'lucide-react';

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
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

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

      const ios =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      setIsIOS(ios);
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
    if (isIOS) {
      setShowIOSHint((prev) => !prev);
      return;
    }

    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {
            setShowIOSHint(true);
          });
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else {
          setShowIOSHint(true);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (_) {
      setShowIOSHint(true);
    }
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
          {/* Fullscreen Toggle / iOS Guidance Button */}
          <button
            className="orientation-btn secondary"
            onClick={handleToggleFullscreen}
            title={isUk ? 'Розгорнути на весь екран' : 'Toggle Fullscreen'}
          >
            {isIOS ? <Info size={16} /> : <Maximize size={16} />}
            <span>
              {isIOS
                ? isUk
                  ? 'Повний екран на iPhone'
                  : 'Fullscreen on iPhone'
                : isUk
                ? 'На весь екран'
                : 'Fullscreen Mode'}
            </span>
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

        {/* iOS Specific Fullscreen Guidance Card */}
        {showIOSHint && (
          <div className="ios-fullscreen-hint-box">
            <p className="ios-hint-title">
              {isUk ? '💡 Як прибрати рамки на iPhone:' : '💡 How to remove bars on iPhone:'}
            </p>
            <div className="ios-hint-item">
              <span className="ios-hint-num">1</span>
              <span>
                <strong>{isUk ? 'У Safari:' : 'In Safari:'}</strong>{' '}
                {isUk
                  ? 'натисніть «aA» зліва в адресному рядку ➔ «Сховати панель інструментів».'
                  : 'tap «aA» in the address bar ➔ «Hide Toolbar».'}
              </span>
            </div>
            <div className="ios-hint-item">
              <span className="ios-hint-num">2</span>
              <span>
                <strong>{isUk ? 'Без рамок (PWA):' : 'Border-free (PWA):'}</strong>{' '}
                {isUk
                  ? 'натисніть «Поділитися» ➔ «На початковий екран» (запуск як додаток).'
                  : 'tap «Share» ➔ «Add to Home Screen» (launches as native app).'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
