'use client';

import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { translations, developerProfiles } from '../../data/resumeData';
import { Compass, FileText, Globe, ArrowRight, Sun, Moon, Sparkles } from 'lucide-react';

export default function WelcomeModal(): React.ReactElement | null {
  const {
    isInitialWelcomeOpen,
    setInitialWelcomeOpen,
    language,
    setLanguage,
    setViewMode,
    theme,
    toggleTheme
  } = useGameStore();

  if (!isInitialWelcomeOpen) return null;

  const t = translations[language].welcome;
  const profile = developerProfiles[language];

  const handleSelect3D = () => {
    setViewMode('3d');
    setInitialWelcomeOpen(false);
  };

  const handleSelectClassic = () => {
    setViewMode('classic');
    setInitialWelcomeOpen(false);
  };

  return (
    <div className="welcome-modal-backdrop">
      <div className="welcome-modal-card obsidian-modal glass-panel">
        {/* Ambient Top Glow Line */}
        <div className="modal-accent-line multi-gradient" />

        {/* Language & Theme selector in top corner */}
        <div className="welcome-lang-bar">
          <div className="welcome-lang-label">
            <Globe size={14} />
            <span>{t.selectLanguage}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="nav-shortcut-btn theme-toggle-btn mini"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div className="lang-toggle-group">
              <button
                className={`lang-btn ${language === 'uk' ? 'active' : ''}`}
                onClick={() => setLanguage('uk')}
              >
                UA
              </button>
              <button
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Welcome Header */}
        <div className="welcome-header">
          <div className="welcome-brand-badge">
            <div className="brand-dot" />
            <span>{profile.name} • {profile.role}</span>
          </div>
          <h1 className="welcome-title">{t.title}</h1>
          <p className="welcome-subtitle">{t.subtitle}</p>
        </div>

        <p className="welcome-choose-prompt">{t.chooseMode}</p>

        {/* Mode Selector Cards */}
        <div className="welcome-cards-grid">
          {/* 3D World Card */}
          <div className="mode-selection-card primary" onClick={handleSelect3D}>
            <div className="mode-card-icon-box gold">
              <Compass size={24} />
            </div>
            <div className="mode-card-body">
              <div className="mode-card-tag">Interactive 3D Engine</div>
              <h3 className="mode-card-title">{t.mode3DTitle}</h3>
              <p className="mode-card-desc">{t.mode3DDesc}</p>
            </div>
            <button className="mode-card-btn primary">
              <span>{t.mode3DBtn}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Classic Resume Card */}
          <div className="mode-selection-card secondary" onClick={handleSelectClassic}>
            <div className="mode-card-icon-box">
              <FileText size={24} />
            </div>
            <div className="mode-card-body">
              <div className="mode-card-tag">Fast & Structured</div>
              <h3 className="mode-card-title">{t.modeClassicTitle}</h3>
              <p className="mode-card-desc">{t.modeClassicDesc}</p>
            </div>
            <button className="mode-card-btn secondary">
              <span>{t.modeClassicBtn}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

