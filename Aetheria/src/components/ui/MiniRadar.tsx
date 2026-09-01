'use client';

import React, { useState, useEffect, useRef } from 'react';
import { radarState } from '../../store/radarState';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../data/resumeData';
import { Map, X, Compass, ExternalLink, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { StatueKey } from '../../types/scene';

interface LandmarkDef {
  id: string;
  nameUk: string;
  nameEn: string;
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
    nameUk: 'Forma-3D (Редактор)',
    nameEn: 'Forma-3D (Spatial)',
    type: 'project',
    projectId: 'forma-3d',
    x: 0,
    z: -16,
    color: '#34d399'
  },
  {
    id: 'terrascope',
    nameUk: 'TerraScope (Гео)',
    nameEn: 'TerraScope (GIS)',
    type: 'project',
    projectId: 'terrascope',
    x: -16,
    z: -8.5,
    color: '#60a5fa'
  },
  {
    id: 'lumina',
    nameUk: 'Lumina (LMS)',
    nameEn: 'Lumina (LMS)',
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
    type: 'statue',
    modalKey: 'bio',
    x: -6,
    z: -6,
    color: '#fbbf24'
  },
  {
    id: 'skills',
    nameUk: 'Навички (Вівтар)',
    nameEn: 'Skills (Altar)',
    type: 'statue',
    modalKey: 'skills',
    x: 2.5,
    z: 10,
    color: '#c084fc'
  },
  {
    id: 'contacts',
    nameUk: 'Контакти (Статуя)',
    nameEn: 'Contacts (Statue)',
    type: 'statue',
    modalKey: 'contacts',
    x: 7,
    z: -6,
    color: '#38bdf8'
  },
  {
    id: 'secret',
    nameUk: 'Секретна могила',
    nameEn: 'Secret Grave Pit',
    type: 'secret',
    x: 14,
    z: 18,
    color: '#a855f7'
  }
];

const RADAR_RADIUS_PX = 56;
const MAX_RADAR_DIST_METERS = 34;

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
  const [isMinimized, setIsMinimized] = useState(false);
  const [hoveredLandmark, setHoveredLandmark] = useState<LandmarkDef | null>(null);

  const compassRef = useRef<HTMLDivElement>(null);
  const blipsContainerRef = useRef<HTMLDivElement>(null);
  const blipElementsRef = useRef<(HTMLDivElement | null)[]>([]);

  // 60 FPS zero-allocation animation loop directly syncing CSS transforms
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const px = radarState.x;
      const pz = radarState.z;
      const yaw = radarState.yaw;

      // Rotate compass ring (opposite to player yaw so North stays true)
      if (compassRef.current) {
        compassRef.current.style.transform = `rotate(${(-yaw * 180) / Math.PI}deg)`;
      }

      // Position each blip on the radar
      const cosYaw = Math.cos(-yaw);
      const sinYaw = Math.sin(-yaw);

      for (let i = 0; i < LANDMARKS.length; i++) {
        const el = blipElementsRef.current[i];
        if (!el) continue;

        const lm = LANDMARKS[i];
        const dx = lm.x - px;
        const dz = lm.z - pz;

        // Rotate relative delta by camera yaw
        // In screen space: +X is right, -Z is up (screen -Y)
        const rotX = dx * cosYaw - dz * sinYaw;
        const rotZ = dx * sinYaw + dz * cosYaw;

        const dist = Math.hypot(dx, dz);
        const ratio = Math.min(1.0, dist / MAX_RADAR_DIST_METERS);
        const rPx = ratio * (RADAR_RADIUS_PX - 8);

        const angle = Math.atan2(rotZ, rotX);
        const screenX = RADAR_RADIUS_PX + Math.cos(angle) * rPx;
        const screenY = RADAR_RADIUS_PX + Math.sin(angle) * rPx;

        el.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
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
        {!isMinimized && (
          <div
            className="mini-radar-housing glass-panel"
            onClick={() => setIsMapExpanded(true)}
            title={language === 'uk' ? 'Натисніть або [M] для повної карти' : 'Click or press [M] for full map'}
          >
            {/* Concentric Distance Rings */}
            <div className="radar-grid-ring r-inner" />
            <div className="radar-grid-ring r-outer" />
            <div className="radar-crosshair h" />
            <div className="radar-crosshair v" />

            {/* Rotating Cardinal Compass Dial */}
            <div ref={compassRef} className="radar-compass-dial">
              <span className="cardinal-point north">N</span>
              <span className="cardinal-point east">E</span>
              <span className="cardinal-point south">S</span>
              <span className="cardinal-point west">W</span>
            </div>

            {/* Center Player Indicator with View Cone */}
            <div className="radar-player-center">
              <div className="radar-view-cone" />
              <div className="radar-player-blip" />
            </div>

            {/* Dynamic Landmark Blips */}
            <div ref={blipsContainerRef} className="radar-blips-layer">
              {LANDMARKS.map((lm, i) => (
                <div
                  key={lm.id}
                  ref={(el) => { blipElementsRef.current[i] = el; }}
                  className="radar-landmark-blip"
                  style={{ backgroundColor: lm.color, boxShadow: `0 0 8px ${lm.color}` }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredLandmark(lm);
                  }}
                  onMouseLeave={() => setHoveredLandmark(null)}
                />
              ))}
            </div>

            {/* Map Expand Badge */}
            <div className="radar-expand-badge">
              <span>M</span>
            </div>
          </div>
        )}

        {/* Hovered Target Tooltip or Minimize Toggle */}
        <div className="radar-bottom-controls">
          {hoveredLandmark ? (
            <div className="radar-hover-pill glass-panel" style={{ borderColor: hoveredLandmark.color }}>
              <span className="radar-hover-dot" style={{ backgroundColor: hoveredLandmark.color }} />
              <span className="radar-hover-title">
                {language === 'uk' ? hoveredLandmark.nameUk : hoveredLandmark.nameEn}
              </span>
            </div>
          ) : (
            <button
              className="radar-toggle-btn glass-panel"
              onClick={() => setIsMinimized((v) => !v)}
              title={isMinimized ? (language === 'uk' ? 'Відкрити радар' : 'Show radar') : (language === 'uk' ? 'Згорнути' : 'Minimize')}
            >
              <Compass size={12} />
              <span>{isMinimized ? (language === 'uk' ? 'Радар' : 'Radar') : 'M'}</span>
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
                <Map size={18} className="tactical-map-icon" />
                <h3 className="tactical-map-title">
                  {language === 'uk' ? 'Тактична карта Aetheria' : 'Aetheria Tactical Island Map'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsMapExpanded(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Island Schematic Grid View */}
            <div className="tactical-map-canvas-container">
              <div className="tactical-map-grid" />
              <div className="tactical-map-island-outline" />

              {/* Compass Rose */}
              <div className="tactical-compass-rose">
                <span>N</span>
              </div>

              {/* Interactive Landmark Pins */}
              {LANDMARKS.map((lm) => {
                // Map island coordinates [-20, 20] to container % [10% to 90%]
                const mapLeft = 50 + (lm.x / 25) * 40;
                const mapTop = 50 + (lm.z / 25) * 40;

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
                      className="tactical-pin-dot"
                      style={{ backgroundColor: lm.color, boxShadow: `0 0 14px ${lm.color}` }}
                    />
                    <div className="tactical-pin-label glass-panel">
                      <span>{language === 'uk' ? lm.nameUk : lm.nameEn}</span>
                    </div>
                  </div>
                );
              })}

              {/* Live Player Position Pin */}
              <div
                className="tactical-player-pin"
                style={{
                  left: `${50 + (radarState.x / 25) * 40}%`,
                  top: `${50 + (radarState.z / 25) * 40}%`
                }}
              >
                <div className="tactical-player-pulse" />
                <div className="tactical-player-core" />
              </div>
            </div>

            {/* Interactive Map Legend */}
            <div className="tactical-map-legend">
              <span className="legend-title">
                {language === 'uk' ? 'Точки інтересу (клікніть для деталей):' : 'Points of Interest (click to open):'}
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
