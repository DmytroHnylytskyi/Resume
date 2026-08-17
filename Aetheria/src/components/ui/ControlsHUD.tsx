'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { User, Share2, Award, FileText, Sun, Moon } from 'lucide-react';

function FpsBadge(): React.ReactElement {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animId: number;
    const loop = (now: number) => {
      frameCount.current++;
      const elapsed = now - lastTime.current;
      if (elapsed >= 400) {
        setFps(Math.round((frameCount.current * 1000) / elapsed));
        frameCount.current = 0;
        lastTime.current = now;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'var(--badge-bg)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '20px',
        padding: '3px 9px',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        color: 'var(--text-primary)'
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'var(--text-primary)',
          opacity: 0.8
        }}
      />
      <span>{fps} FPS</span>
    </div>
  );
}

export default function ControlsHUD(): React.ReactElement {
  const {
    setActiveModal,
    interactionPrompt,
    language,
    setLanguage,
    setViewMode,
    viewMode,
    theme,
    toggleTheme
  } = useGameStore();

  const profile = developerProfiles[language];
  const t = translations[language].nav;

  return (
    <>
      {/* ── Top Glass Navigation Bar ── */}
      <header className="island-top-bar glass-panel">
        <div className="brand-badge">
          <div className="brand-dot" />
          <span className="brand-name">{profile.name}</span>
          <span className="brand-tag">{t.brandTag}</span>
          <FpsBadge />
        </div>

        {/* Quick Nav, Theme & Mode Controls */}
        <div className="top-nav-shortcuts">
          {/* Switch to Classic Resume */}
          <button
            className="nav-shortcut-btn mode-switch-btn"
            onClick={() => setViewMode(viewMode === '3d' ? 'classic' : '3d')}
            title={t.viewClassic}
          >
            <FileText size={15} />
            <span>{t.viewClassic}</span>
          </button>

          {/* Quick Modals */}
          <button className="nav-shortcut-btn" onClick={() => setActiveModal('bio')}>
            <User size={15} />
            <span>{t.bio}</span>
          </button>

          <button className="nav-shortcut-btn" onClick={() => setActiveModal('skills')}>
            <Award size={15} />
            <span>{t.skills}</span>
          </button>

          <button className="nav-shortcut-btn" onClick={() => setActiveModal('contacts')}>
            <Share2 size={15} />
            <span>{t.contacts}</span>
          </button>

          {/* Theme Toggle */}
          <button
            className="nav-shortcut-btn theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Language Switcher */}
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
      </header>

      {/* ── Minimalist Clean Floating Interaction Pill ── */}
      {interactionPrompt && (
        <div className="minimal-interaction-pill-wrapper">
          <div
            className="minimal-interaction-pill glass-panel"
            onClick={interactionPrompt.action}
          >
            <kbd className="interaction-key">E</kbd>
            <span className="interaction-title">{interactionPrompt.title}</span>
          </div>
        </div>
      )}
    </>
  );
}
