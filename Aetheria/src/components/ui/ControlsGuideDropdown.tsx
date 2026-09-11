'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import {
  HelpCircle,
  ChevronDown,
  Keyboard,
  MousePointer,
  Smartphone,
  Gamepad2,
  ArrowUp,
  Move,
  Maximize2,
  Map,
  Radio,
  RotateCcw,
  X
} from 'lucide-react';

export default function ControlsGuideDropdown(): React.ReactElement {
  const { language, triggerIntroSwoop } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'touch' | 'keyboard'>('keyboard');
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect touch device / mobile screen on mount to default to touch tab
  useEffect(() => {
    const checkTouch = () => {
      const isTouch = 
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        window.innerWidth <= 900;
      
      if (isTouch) {
        setActiveTab('touch');
      }
    };
    checkTouch();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Keyboard shortcut [H] to toggle controls guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'KeyH') {
        setIsOpen((prev) => !prev);
      } else if (e.code === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isUk = language === 'uk';

  return (
    <div className="controls-dropdown-wrapper" ref={containerRef}>
      {/* Toggle Button in Top Bar */}
      <button
        className={`nav-shortcut-btn controls-guide-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={isUk ? 'Інструкція з керування [H]' : 'Controls guide [H]'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <HelpCircle size={15} className="controls-guide-icon" aria-hidden="true" />
        <span>{isUk ? 'Керування' : 'Controls'}</span>
        <ChevronDown size={13} className={`dropdown-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {/* Expandable Glass Dropdown Menu */}
      {isOpen && (
        <div className="controls-dropdown-menu glass-panel" role="dialog" aria-label={isUk ? 'Інструкція з керування' : 'Controls guide'}>
          {/* Header */}
          <div className="controls-menu-header">
            <div className="controls-menu-title-group">
              {activeTab === 'touch' ? (
                <Smartphone size={16} className="controls-header-icon" />
              ) : (
                <Keyboard size={16} className="controls-header-icon" />
              )}
              <h4 className="controls-menu-title">
                {activeTab === 'touch'
                  ? (isUk ? 'Сенсорне керування' : 'Touch Controls')
                  : (isUk ? 'Керування та гарячі клавіші' : 'Controls & Shortcuts')}
              </h4>
            </div>
            <button className="controls-menu-close" onClick={() => setIsOpen(false)} aria-label={isUk ? 'Закрити' : 'Close'}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          {/* Tab Switcher: Touch / Keyboard */}
          <div className="controls-mode-tabs">
            <button
              className={`controls-tab-btn ${activeTab === 'touch' ? 'active' : ''}`}
              onClick={() => setActiveTab('touch')}
            >
              <Smartphone size={12} />
              <span>{isUk ? 'Сенсор' : 'Touch'}</span>
            </button>
            <button
              className={`controls-tab-btn ${activeTab === 'keyboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('keyboard')}
            >
              <Keyboard size={12} />
              <span>{isUk ? 'Клавіатура' : 'Keyboard'}</span>
            </button>
          </div>

          {/* Tab 1: Mobile Touch Controls */}
          {activeTab === 'touch' && (
            <div className="controls-categories-list">
              {/* 1. Movement */}
              <div className="controls-category-section">
                <span className="controls-category-name">
                  {isUk ? 'Рух та стрибок' : 'Movement & Jump'}
                </span>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <span className="controls-touch-badge">
                      <Gamepad2 size={12} />
                      {isUk ? 'Стік зліва' : 'Left Stick'}
                    </span>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Рух та біг (відхилення = швидкість)' : 'Move & sprint (tilt further)'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <span className="controls-touch-badge">
                      <ArrowUp size={12} />
                      {isUk ? 'Кнопка [↑]' : 'Jump [↑]'}
                    </span>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Стрибок персонажа' : 'Jump onto obstacles'}
                  </span>
                </div>
              </div>

              {/* 2. Camera & Zoom */}
              <div className="controls-category-section">
                <span className="controls-category-name">
                  {isUk ? 'Огляд та камера' : 'Camera & Orbit'}
                </span>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <span className="controls-touch-badge">
                      <Move size={12} />
                      {isUk ? 'Свайп справа' : 'Right Swipe'}
                    </span>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Обертання камери на 360°' : '360° Camera orbit'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <span className="controls-touch-badge">
                      <Maximize2 size={12} />
                      {isUk ? 'Пінч 2 пальці' : '2-Finger Pinch'}
                    </span>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Зум камери (наближення)' : 'Zoom in / out'}
                  </span>
                </div>
              </div>

              {/* 3. Interaction & Map */}
              <div className="controls-category-section">
                <span className="controls-category-name">
                  {isUk ? 'Взаємодія та карта' : 'Actions & Map'}
                </span>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <kbd className="ctrl-key accent">E</kbd>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Вхід у портали та відкриття резюме' : 'Enter portals & inspect exhibits'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <span className="controls-touch-badge">
                      <Map size={12} />
                      {isUk ? 'Кнопка під радаром' : 'Radar Button'}
                    </span>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Тактична карта острова' : 'Tactical island map'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Desktop Keyboard & Mouse Controls */}
          {activeTab === 'keyboard' && (
            <div className="controls-categories-list">
              {/* 1. Movement */}
              <div className="controls-category-section">
                <span className="controls-category-name">
                  {isUk ? 'Переміщення' : 'Movement'}
                </span>
                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <kbd className="ctrl-key">W</kbd>
                    <kbd className="ctrl-key">A</kbd>
                    <kbd className="ctrl-key">S</kbd>
                    <kbd className="ctrl-key">D</kbd>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Рух персонажа' : 'Move character'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <kbd className="ctrl-key">Shift</kbd>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Спринт (швидкий біг)' : 'Sprint (run faster)'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <kbd className="ctrl-key wide">{isUk ? 'Пробіл' : 'Space'}</kbd>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Стрибок' : 'Jump'}
                  </span>
                </div>
              </div>

              {/* 2. Camera */}
              <div className="controls-category-section">
                <span className="controls-category-name">
                  {isUk ? 'Огляд та камера' : 'Camera & Orbit'}
                </span>
                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <MousePointer size={13} className="controls-inline-icon" />
                    <span className="controls-mouse-badge">
                      {isUk ? 'ПКМ / ЛКМ + Рух' : 'RMB / LMB + Drag'}
                    </span>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Обертання камери на 360°' : '360° Camera orbit'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <span className="controls-mouse-badge">
                      {isUk ? 'Коліщатко' : 'Mouse Wheel'}
                    </span>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Зум камери (наближення)' : 'Zoom in / out'}
                  </span>
                </div>
              </div>

              {/* 3. Actions & Hotkeys */}
              <div className="controls-category-section">
                <span className="controls-category-name">
                  {isUk ? 'Інтерактивність та меню' : 'Actions & Menus'}
                </span>
                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <kbd className="ctrl-key accent">E</kbd>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Взаємодія з порталами та статуями' : 'Interact with portals & shrines'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <kbd className="ctrl-key">M</kbd>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Тактична карта острова' : 'Tactical island map'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <kbd className="ctrl-key">H</kbd>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Згорнути / розгорнути підказку' : 'Toggle this guide'}
                  </span>
                </div>

                <div className="controls-item-row">
                  <div className="controls-keys-group">
                    <kbd className="ctrl-key">Esc</kbd>
                  </div>
                  <span className="controls-action-desc">
                    {isUk ? 'Закрити активне вікно' : 'Close active modal'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Replay the cinematic intro flight */}
          <button
            className="controls-replay-btn"
            onClick={() => {
              triggerIntroSwoop();
              setIsOpen(false);
            }}
          >
            <RotateCcw size={12} />
            <span>{isUk ? 'Повторити кінематографічне інтро' : 'Replay cinematic intro'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

