'use client';

import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { sound } from '../../utils/audio';
import {
  Volume2,
  VolumeX,
  Compass,
  RotateCcw,
  Sparkles,
  User,
  Share2,
  Award,
  Zap,
  MousePointer
} from 'lucide-react';

export default function ControlsHUD(): React.ReactElement {
  const {
    isAudioMuted,
    toggleAudio,
    setActiveModal,
    isRespawning,
    toastMessage,
    interactionPrompt,
    cameraMode,
    toggleCameraMode
  } = useGameStore();

  const handleAudioToggle = () => {
    toggleAudio();
    sound.setMuted(!isAudioMuted);
  };

  return (
    <>
      {/* ── Top Glass Navigation Bar ── */}
      <header className="island-top-bar glass-panel">
        <div className="brand-badge">
          <div className="brand-dot" />
          <span className="brand-name">Гнилицький Дмитро</span>
          <span className="brand-tag">Aetheria 3D</span>
        </div>

        {/* Quick Nav Shortcut Buttons */}
        <div className="top-nav-shortcuts">
          <button
            className="nav-shortcut-btn"
            onClick={() => setActiveModal('bio')}
            title="Про мене & Резюме"
          >
            <User size={15} />
            <span>Про мене</span>
          </button>

          <button
            className="nav-shortcut-btn"
            onClick={() => setActiveModal('contacts')}
            title="Контакти & Соцмережі"
          >
            <Share2 size={15} />
            <span>Контакти</span>
          </button>

          <button
            className="nav-shortcut-btn"
            onClick={() => setActiveModal('skills')}
            title="Стек технологій"
          >
            <Award size={15} />
            <span>Навички</span>
          </button>

          <button
            className={`nav-shortcut-btn ${cameraMode === 'bird_eye' ? 'active' : ''}`}
            onClick={toggleCameraMode}
            title="Перемкнути між видом від 3-ї особи та оглядом всього острова з висоти"
          >
            <Compass size={15} />
            <span>{cameraMode === 'bird_eye' ? 'Вигляд Гравця' : 'Огляд Карти'}</span>
          </button>
        </div>

        {/* Top Right Controls: Audio Toggle */}
        <div className="top-bar-right">
          <button
            className={`audio-toggle-btn ${isAudioMuted ? 'muted' : ''}`}
            onClick={handleAudioToggle}
            title={isAudioMuted ? 'Увімкнути 3D звук' : 'Вимкнути 3D звук'}
          >
            {isAudioMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span className="audio-label">{isAudioMuted ? 'Muted' : '3D Sound'}</span>
          </button>
        </div>
      </header>

      {/* ── Bottom Floating Controls HUD ── */}
      <div className="bottom-controls-guide glass-panel">
        <div className="control-key-item">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>
          <span>Рух</span>
        </div>
        <div className="hud-divider" />
        <div className="control-key-item">
          <kbd>🖱️</kbd>
          <span>Огляд 360°</span>
        </div>
        <div className="hud-divider" />
        <div className="control-key-item">
          <kbd>Shift</kbd>
          <span>Біг</span>
        </div>
        <div className="hud-divider" />
        <div className="control-key-item">
          <kbd>Пробіл</kbd>
          <span>Стрибок</span>
        </div>
        <div className="hud-divider" />
        <div className="control-key-item">
          <kbd>E</kbd>
          <span>Дія</span>
        </div>
        <div className="hud-divider" />
        <div className="control-key-item">
          <kbd>Esc</kbd>
          <span>Курсор</span>
        </div>
      </div>

      {/* ── Proximity Active Prompt Bar ── */}
      {interactionPrompt && (
        <div
          className="bottom-interaction-prompt glass-panel"
          onClick={interactionPrompt.action}
          style={{ cursor: 'pointer' }}
        >
          <div className="prompt-key-badge">E</div>
          <div className="prompt-text-group">
            <span className="prompt-action-label">Натисніть E або клікніть:</span>
            <span className="prompt-target-title">{interactionPrompt.title}</span>
          </div>
          <Zap size={16} className="prompt-zap-icon" />
        </div>
      )}

      {/* ── Void Fall Respawn Fade Screen ── */}
      {isRespawning && (
        <div className="void-respawn-overlay">
          <div className="respawn-content">
            <RotateCcw size={32} className="spin-respawn" />
            <span>Повернення на острів...</span>
          </div>
        </div>
      )}

      {/* ── Toast Notification Banner ── */}
      {toastMessage && (
        <div className="island-toast glass-panel">
          <Sparkles size={16} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
