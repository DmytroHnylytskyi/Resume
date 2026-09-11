'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { User, Share2, Award, FileText, Sun, Moon, Sparkles } from 'lucide-react';
import ControlsGuideDropdown from './ControlsGuideDropdown';
import TimeOfDaySlider from './TimeOfDaySlider';

export default function ControlsHUD(): React.ReactElement {
  const {
    setActiveModal,
    interactionPrompt,
    easterEggToast,
    language,
    setLanguage,
    setViewMode,
    viewMode,
    theme,
    toggleTheme,
    isIntroPlaying,
    triggerIntroSwoop
  } = useGameStore();

  const profile = developerProfiles[language];
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(hasTouch);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const t = translations[language].nav;

  return (
    <>
      {/* ── Top Glass Navigation Bar ── */}
      <header className={`island-top-bar glass-panel ${isIntroPlaying ? 'hud-hidden-during-intro' : ''}`}>
        <div className="brand-badge">
          <div className="brand-dot" />
          <span className="brand-name">{profile.name}</span>
          <span className="brand-tag">{t.brandTag}</span>
        </div>

        {/* Quick Nav, Theme & Mode Controls */}
        <div className="top-nav-shortcuts">
          {/* Switch to Classic Resume */}
          <button
            className="nav-shortcut-btn mode-switch-btn"
            onClick={() => setViewMode(viewMode === '3d' ? 'classic' : '3d')}
            title={t.viewClassic}
            aria-label={t.viewClassic}
          >
            <FileText size={15} aria-hidden="true" />
            <span>{t.viewClassic}</span>
          </button>

          {/* Quick Modals */}
          <button className="nav-shortcut-btn" onClick={() => setActiveModal('bio')}>
            <User size={15} aria-hidden="true" />
            <span>{t.bio}</span>
          </button>

          <button className="nav-shortcut-btn" onClick={() => setActiveModal('skills')}>
            <Award size={15} aria-hidden="true" />
            <span>{t.skills}</span>
          </button>

          <button className="nav-shortcut-btn" onClick={() => setActiveModal('contacts')}>
            <Share2 size={15} aria-hidden="true" />
            <span>{t.contacts}</span>
          </button>

          {/* Expandable Controls Guide Dropdown */}
          <ControlsGuideDropdown />

          {/* Controls Cluster: Day/Night Slider + Language Switcher */}
          <div className="header-controls-cluster">
            {/* Continuous day/night cycle scrubber (replaces the old binary button) */}
            <TimeOfDaySlider />

            {/* Theme fallback button: shown only where the slider is hidden (≤640px) */}
            <button
              className="nav-shortcut-btn theme-toggle-btn slider-fallback-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? (language === 'uk' ? 'Світла тема' : 'Light Mode') : (language === 'uk' ? 'Темна тема' : 'Dark Mode')}
              aria-label={theme === 'dark' ? 'Toggle light mode' : 'Toggle dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            </button>

            <div className="lang-toggle-group mini">
              <button
                className={`lang-btn ${language === 'uk' ? 'active' : ''}`}
                onClick={() => setLanguage('uk')}
                title="Українська"
              >
                UA
              </button>
              <button
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
                title="English"
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Minimalist Clean Floating Interaction Pill ── */}
      {interactionPrompt && (
        <div className="minimal-interaction-pill-wrapper">
          <button
            className="minimal-interaction-pill glass-panel touch-friendly"
            onClick={interactionPrompt.action}
          >
            {isTouchDevice ? (
              <span className="interaction-touch-badge">
                <Sparkles size={14} aria-hidden="true" />
              </span>
            ) : (
              <kbd className="interaction-key">E</kbd>
            )}
            <span className="interaction-title">
              {isTouchDevice
                ? `${language === 'uk' ? 'Відкрити' : 'Open'}: ${interactionPrompt.title}`
                : interactionPrompt.title}
            </span>
          </button>
        </div>
      )}

      {/* ── Easter Egg Floating Toast (announced politely) ── */}
      {easterEggToast && (
        <div className="easter-egg-toast-wrapper" role="status" aria-live="polite">
          <div className="easter-egg-toast glass-panel">
            <div className="easter-egg-icon-box">
              <Sparkles size={20} className="easter-egg-sparkle-icon" aria-hidden="true" />
            </div>
            <div className="easter-egg-content">
              <h4 className="easter-egg-title">{easterEggToast.title}</h4>
              <p className="easter-egg-desc">{easterEggToast.text}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
