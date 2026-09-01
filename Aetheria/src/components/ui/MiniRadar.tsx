'use client';

import React, { useState, useEffect, useRef } from 'react';
import { radarState } from '../../store/radarState';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../data/resumeData';
import { Map, X, Navigation } from 'lucide-react';
import { StatueKey } from '../../types/scene';

interface LandmarkDef {
  id: string;
  nameUk: string;
  nameEn: string;
  shortUk: string;
  shortEn: string;
  type: 'project' | 'statue' | 'secret';
  modalKey?: StatueKey;
  projectId?: string;
  x: number;
  z: number;
  color: string;
}

const LANDMARKS: LandmarkDef[] = [
  {
    id: 'forma',
    nameUk: 'Forma-3D (3D-редактор)',
    nameEn: 'Forma-3D (Spatial)',
    shortUk: 'Forma-3D',
    shortEn: 'Forma-3D',
    type: 'project',
    projectId: 'forma-3d',
    x: 0,
    z: -16,
    color: '#34d399'
  },
  {
    id: 'terrascope',
    nameUk: 'TerraScope (Геоаналітика)',
    nameEn: 'TerraScope (GIS)',
    shortUk: 'TerraScope',
    shortEn: 'TerraScope',
    type: 'project',
    projectId: 'terrascope',
    x: -16,
    z: -8.5,
    color: '#60a5fa'
  },
  {
    id: 'lumina',
    nameUk: 'Lumina (LMS-платформа)',
    nameEn: 'Lumina (LMS)',
    shortUk: 'Lumina',
    shortEn: 'Lumina',
    type: 'project',
    projectId: 'lumina',
    x: 16,
    z: -8,
    color: '#fb7185'
  },
  {
    id: 'bio',
    nameUk: 'Біографія (Статуя)',
    nameEn: 'Biography (Statue)',
    shortUk: 'Біографія',
    shortEn: 'Bio',
    type: 'statue',
    modalKey: 'bio',
    x: -6,
    z: -6,
    color: '#fbbf24'
  },
  {
    id: 'skills',
    nameUk: 'Навички (Вівтар знань)',
    nameEn: 'Skills (Altar)',
    shortUk: 'Навички',
    shortEn: 'Skills',
    type: 'statue',
    modalKey: 'skills',
    x: 2.5,
    z: 10,
    color: '#c084fc'
  },
  {
    id: 'contacts',
    nameUk: 'Контакти (Статуя зв’язку)',
    nameEn: 'Contacts (Statue)',
    shortUk: 'Контакти',
    shortEn: 'Contacts',
    type: 'statue',
    modalKey: 'contacts',
    x: 7,
    z: -6,
    color: '#38bdf8'
  },
  {
    id: 'secret',
    nameUk: 'Секретна могила (Пасхалка)',
    nameEn: 'Secret Grave Pit (Easter Egg)',
    shortUk: 'Секрет',
    shortEn: 'Secret',
    type: 'secret',
    x: 14,
    z: 18,
    color: '#a855f7'
  }
];

const RADAR_RADIUS_PX = 62;
const RADAR_USABLE_RADIUS = 44;
const ISLAND_SPAN = 22; // World coordinate extent [-22, 22]

export default function MiniRadar(): React.ReactElement | null {
  const {
    language,
    viewMode,
    isInitialWelcomeOpen,
    activeModal,
    selectedProject,
    setActiveModal,
    setSelectedProject,
    isIntroPlaying
  } = useGameStore();

  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [hoveredLandmark, setHoveredLandmark] = useState<LandmarkDef | null>(null);

  const playerRadarRef = useRef<HTMLDivElement>(null);
  const tacticalPlayerRef = useRef<HTMLDivElement>(null);

  // 60 FPS zero-allocation animation loop synchronizing live player position and view direction
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const px = radarState.x;
      const pz = radarState.z;
      const yaw = radarState.yaw;

      // Heading angle in degrees (North = 0°, East = 90°, South = 180°, West = -90°)
      const headingDeg = (-yaw * 180) / Math.PI;

      // 1. Synchronize Mini-Radar Player Position and Vision Cone
      if (playerRadarRef.current) {
        const clampedX = Math.max(-ISLAND_SPAN, Math.min(ISLAND_SPAN, px));
        const clampedZ = Math.max(-ISLAND_SPAN, Math.min(ISLAND_SPAN, pz));

        const screenX = RADAR_RADIUS_PX + (clampedX / ISLAND_SPAN) * RADAR_USABLE_RADIUS;
        const screenZ = RADAR_RADIUS_PX + (clampedZ / ISLAND_SPAN) * RADAR_USABLE_RADIUS;

        playerRadarRef.current.style.transform = `translate(${screenX}px, ${screenZ}px) translate(-50%, -50%) rotate(${headingDeg}deg)`;
      }

      // 2. Synchronize Expanded Tactical Map Player Position
      if (tacticalPlayerRef.current) {
        const clampedX = Math.max(-ISLAND_SPAN, Math.min(ISLAND_SPAN, px));
        const clampedZ = Math.max(-ISLAND_SPAN, Math.min(ISLAND_SPAN, pz));

        const mapX = 50 + (clampedX / ISLAND_SPAN) * 44;
        const mapY = 50 + (clampedZ / ISLAND_SPAN) * 44;

        tacticalPlayerRef.current.style.left = `${mapX}%`;
        tacticalPlayerRef.current.style.top = `${mapY}%`;
        tacticalPlayerRef.current.style.transform = `translate(-50%, -50%) rotate(${headingDeg}deg)`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard shortcut: Press 'M' to toggle tactical island map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (activeModal || selectedProject || isInitialWelcomeOpen) return;
      if (e.code === 'KeyM') {
        setIsMapExpanded((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, selectedProject, isInitialWelcomeOpen]);

  if (viewMode !== '3d' || isInitialWelcomeOpen) return null;

  return (
    <>
      {/* ── Circular Glass Mini-Radar (Bottom-Right HUD) ── */}
      <div className={`mini-radar-wrapper ${isIntroPlaying ? 'hud-hidden-during-intro' : ''}`}>
        <div
          className="mini-radar-housing glass-panel"
          onClick={() => setIsMapExpanded(true)}
          title={language === 'uk' ? 'Натисніть або [M] для тактичної карти' : 'Click or press [M] for tactical map'}
        >
          {/* Island Schematic Background on Radar */}
          <div className="radar-island-contour" />
          <div className="radar-path-ns" />
          <div className="radar-path-ew" />

          {/* Concentric Distance Rings & Crosshair */}
          <div className="radar-grid-ring r-inner" />
          <div className="radar-grid-ring r-outer" />
          <div className="radar-crosshair h" />
          <div className="radar-crosshair v" />

          {/* Fixed Cardinal Compass Dial (True Geographic Orientation) */}
          <div className="radar-compass-dial">
            <span className="cardinal-point north">N</span>
            <span className="cardinal-point east">E</span>
            <span className="cardinal-point south">S</span>
            <span className="cardinal-point west">W</span>
          </div>

          {/* True Landmark Blips (Fixed at Authentic Island Coordinates) */}
          <div className="radar-blips-layer">
            {LANDMARKS.map((lm) => {
              const blipX = RADAR_RADIUS_PX + (lm.x / ISLAND_SPAN) * RADAR_USABLE_RADIUS;
              const blipY = RADAR_RADIUS_PX + (lm.z / ISLAND_SPAN) * RADAR_USABLE_RADIUS;

              return (
                <div
                  key={lm.id}
                  className="radar-landmark-blip"
                  style={{
                    left: `${blipX}px`,
                    top: `${blipY}px`,
                    backgroundColor: lm.color,
                    boxShadow: `0 0 8px ${lm.color}`
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredLandmark(lm);
                  }}
                  onMouseLeave={() => setHoveredLandmark(null)}
                />
              );
            })}
          </div>

          {/* Live Dynamic Player Marker with Heading Direction Cone */}
          <div ref={playerRadarRef} className="radar-player-pin">
            <div className="radar-player-cone" />
            <div className="radar-player-dot" />
          </div>
        </div>

        {/* Centered Map Action Button below Radar */}
        <div className="radar-action-container">
          {hoveredLandmark ? (
            <div className="radar-hover-pill glass-panel" style={{ borderColor: hoveredLandmark.color }}>
              <span className="radar-hover-dot" style={{ backgroundColor: hoveredLandmark.color }} />
              <span className="radar-hover-title">
                {language === 'uk' ? hoveredLandmark.shortUk : hoveredLandmark.shortEn}
              </span>
            </div>
          ) : (
            <button
              className="radar-map-btn glass-panel"
              onClick={() => setIsMapExpanded(true)}
              title={language === 'uk' ? 'Відкрити тактичну карту острова [M]' : 'Open tactical map [M]'}
            >
              <Map size={13} className="radar-map-btn-icon" />
              <span>{language === 'uk' ? 'Карта [M]' : 'Map [M]'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tactical Island Map Modal (Expanded Map on [M] or Radar Click) ── */}
      {isMapExpanded && (
        <div className="tactical-map-backdrop" onClick={() => setIsMapExpanded(false)}>
          <div className="tactical-map-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tactical-map-header">
              <div className="tactical-map-title-group">
                <Map size={20} className="tactical-map-icon" />
                <div>
                  <h3 className="tactical-map-title">
                    {language === 'uk' ? 'Тактична карта Aetheria' : 'Aetheria Tactical Island Map'}
                  </h3>
                  <span className="tactical-map-subtitle">
                    {language === 'uk' ? 'Клікніть на маркер для перегляду деталей' : 'Click any landmark to inspect details'}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsMapExpanded(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Island Geometric Map Container (True 1:1 Aspect Ratio) */}
            <div className="tactical-map-canvas-container">
              {/* Outer Sea / Abyss */}
              <div className="tactical-map-ocean-ring" />

              {/* Stone Fortress Island Perimeter */}
              <div className="tactical-map-island-body">
                {/* Cobblestone paths */}
                <div className="tactical-path-main-ns" />
                <div className="tactical-path-fork-w" />
                <div className="tactical-path-fork-e" />
                <div className="tactical-central-hub" />
              </div>

              {/* Compass Rose (North Indicator) */}
              <div className="tactical-compass-rose">
                <Navigation size={12} className="tactical-compass-arrow" />
                <span>N</span>
              </div>

              {/* Interactive Landmark Pins */}
              {LANDMARKS.map((lm) => {
                // Map island coordinates [-22, 22] to 1:1 container % [6% to 94%]
                const mapLeft = 50 + (lm.x / ISLAND_SPAN) * 44;
                const mapTop = 50 + (lm.z / ISLAND_SPAN) * 44;

                return (
                  <div
                    key={lm.id}
                    className="tactical-pin-wrapper"
                    style={{ left: `${mapLeft}%`, top: `${mapTop}%` }}
                    onClick={() => {
                      setIsMapExpanded(false);
                      if (lm.projectId) {
                        setSelectedProject(lm.projectId);
                      } else if (lm.modalKey) {
                        setActiveModal(lm.modalKey);
                      }
                    }}
                  >
                    <div
                      className="tactical-pin-gem"
                      style={{ backgroundColor: lm.color, boxShadow: `0 0 16px ${lm.color}` }}
                    >
                      <div className="tactical-pin-gem-inner" />
                    </div>
                    <div className="tactical-pin-pill">
                      <span>{language === 'uk' ? lm.shortUk : lm.shortEn}</span>
                    </div>
                  </div>
                );
              })}

              {/* Live Player Position Pin with Accurate Heading Direction */}
              <div ref={tacticalPlayerRef} className="tactical-player-pin">
                <div className="tactical-player-arrow" />
                <div className="tactical-player-dot" />
              </div>
            </div>

            {/* Quick Navigation Chips Legend */}
            <div className="tactical-map-legend">
              <span className="legend-title">
                {language === 'uk' ? 'Швидкий перехід до локацій:' : 'Quick Landmark Navigation:'}
              </span>
              <div className="legend-items-row">
                {LANDMARKS.filter((l) => l.type !== 'secret').map((lm) => (
                  <button
                    key={lm.id}
                    className="legend-chip glass-panel"
                    onClick={() => {
                      setIsMapExpanded(false);
                      if (lm.projectId) {
                        setSelectedProject(lm.projectId);
                      } else if (lm.modalKey) {
                        setActiveModal(lm.modalKey);
                      }
                    }}
                  >
                    <span className="legend-chip-dot" style={{ backgroundColor: lm.color }} />
                    <span>{language === 'uk' ? lm.nameUk : lm.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
