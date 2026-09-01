'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { HelpCircle, ChevronDown, Keyboard, MousePointer, Sparkles, X } from 'lucide-react';

export default function ControlsGuideDropdown(): React.ReactElement {
  const { language } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      >
        <HelpCircle size={15} className="controls-guide-icon" />
        <span>{isUk ? 'Керування' : 'Controls'}</span>
        <ChevronDown size={13} className={`dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {/* Expandable Glass Dropdown Menu */}
      {isOpen && (
        <div className="controls-dropdown-menu glass-panel">
          {/* Header */}
          <div className="controls-menu-header">
            <div className="controls-menu-title-group">
              <Keyboard size={16} className="controls-header-icon" />
              <h4 className="controls-menu-title">
                {isUk ? 'Керування та гарячі клавіші' : 'Controls & Shortcuts'}
              </h4>
            </div>
            <button className="controls-menu-close" onClick={() => setIsOpen(false)}>
              <X size={14} />
            </button>
          </div>

          {/* Controls Categories */}
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

          {/* Footer Tip */}
          <div className="controls-menu-footer">
            <Sparkles size={13} className="controls-footer-sparkle" />
            <span className="controls-footer-text">
              {isUk
                ? 'Підказка: Ви також можете клікати на портали мишею.'
                : 'Tip: You can also click portals directly with mouse.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
