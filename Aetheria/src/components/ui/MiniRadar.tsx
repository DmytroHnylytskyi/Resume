'use client';

import React, { useState, useEffect, useRef } from 'react';
import { radarState } from '../../store/radarState';
import { useGameStore } from '../../store/useGameStore';
import { Map, X, Navigation } from 'lucide-react';
import { StatueKey, IslandSceneData } from '../../types/scene';
import rawIslandSceneData from '../../data/islandScene.json';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

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
    id: 'commander',
    nameUk: 'Командир Валерія (Біографія)',
    nameEn: 'Commander Valeria (Bio)',
    shortUk: 'Командир',
    shortEn: 'Commander',
    type: 'statue',
    modalKey: 'bio',
    x: 1.5,
    z: 5.0,
    color: '#fbbf24'
  },
  {
    id: 'chief_engineer',
    nameUk: 'Головний інженер Векс (Стек)',
    nameEn: 'Chief Engineer Vex (Skills)',
    shortUk: 'Інженер',
    shortEn: 'Engineer',
    type: 'statue',
    modalKey: 'skills',
    x: -2.2,
    z: 3.8,
    color: '#c084fc'
  },
  {
    id: 'comms_officer',
    nameUk: "Офіцер зв'язку Тайра (Контакти)",
    nameEn: 'Comms Officer Tayra (Contacts)',
    shortUk: "Зв'язок",
    shortEn: 'Comms',
    type: 'statue',
    modalKey: 'contacts',
    x: -1.0,
    z: -4.5,
    color: '#38bdf8'
  },
  {
    id: 'forma',
    nameUk: 'Forma-3D (UI-Архітектор Нова)',
    nameEn: 'Forma-3D (UI Architect Nova)',
    shortUk: 'Forma-3D',
    shortEn: 'Forma-3D',
    type: 'project',
    projectId: 'forma',
    x: 1.2,
    z: -0.5,
    color: '#34d399'
  },
  {
    id: 'terrascope',
    nameUk: 'TerraScope (Геодата Оріон)',
    nameEn: 'TerraScope (Geodata Orion)',
    shortUk: 'TerraScope',
    shortEn: 'TerraScope',
    type: 'project',
    projectId: 'terrascope',
    x: 2.2,
    z: 3.0,
    color: '#60a5fa'
  },
  {
    id: 'lumina',
    nameUk: 'Lumina (Фотоніка Ліра)',
    nameEn: 'Lumina (Photonics Lyra)',
    shortUk: 'Lumina',
    shortEn: 'Lumina',
    type: 'project',
    projectId: 'lumina',
    x: -5.5,
    z: -7.0,
    color: '#fb7185'
  },
  {
    id: 'shuttle',
    nameUk: 'Шатл Lander-A (Ангар)',
    nameEn: 'Shuttle Lander-A (Hangar)',
    shortUk: 'Шатл',
    shortEn: 'Shuttle',
    type: 'secret',
    x: 0.98,
    z: -7.13,
    color: '#f59e0b'
  },
  {
    id: 'drill',
    nameUk: 'Глибинний бур (Пасхалка)',
    nameEn: 'Deep Core Mining Drill (Easter Egg)',
    shortUk: 'Бур',
    shortEn: 'Mining Drill',
    type: 'secret',
    x: 0.0,
    z: 0.0,
    color: '#a855f7'
  }
];

const RADAR_RADIUS_PX = 62;
const RADAR_USABLE_RADIUS = 44;
const ISLAND_SPAN = 13; // World coordinate extent matching space outpost geometry
const TACTICAL_MAP_SPREAD_PERCENT = 44;

export default function MiniRadar(): React.ReactElement | null {
  const {
    language,
    viewMode,
    isInitialWelcomeOpen,
    activeModal,
    selectedProject,
    setActiveModal,
    setSelectedProject,
    isTacticalMapOpen,
    setTacticalMapOpen
  } = useGameStore();

  const [hoveredLandmark, setHoveredLandmark] = useState<LandmarkDef | null>(null);

  const dynamicLandmarks = React.useMemo(() => {
    return LANDMARKS.map((lm) => {
      const modelSubstr = `npc_${lm.id.toLowerCase()}`;
      const placed = islandSceneData.placedObjects?.find((p) => p.modelPath.toLowerCase().includes(modelSubstr));
      if (placed) {
        return {
          ...lm,
          x: placed.position[0],
          z: placed.position[2]
        };
      }
      return lm;
    });
  }, []);

  const openLandmark = (lm: LandmarkDef) => {
    if (lm.projectId) {
      setSelectedProject(lm.projectId);
    } else if (lm.modalKey) {
      setActiveModal(lm.modalKey);
    }
  };

  const playerRadarRef = useRef<HTMLDivElement>(null);
  const tacticalPlayerRef = useRef<HTMLDivElement>(null);

  // 60 FPS zero-allocation animation loop synchronizing live player position and view direction
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const px = radarState.x;
      const pz = radarState.z;
      const yaw = radarState.yaw;

      // Heading angle in degrees
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

        const mapX = 50 + (clampedX / ISLAND_SPAN) * TACTICAL_MAP_SPREAD_PERCENT;
        const mapY = 50 + (clampedZ / ISLAND_SPAN) * TACTICAL_MAP_SPREAD_PERCENT;

        tacticalPlayerRef.current.style.left = `${mapX}%`;
        tacticalPlayerRef.current.style.top = `${mapY}%`;
        tacticalPlayerRef.current.style.transform = `translate(-50%, -50%) rotate(${headingDeg}deg)`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard shortcut: Press 'M' to toggle tactical outpost map, 'Esc' to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isInitialWelcomeOpen) return;

      if (e.code === 'KeyM') {
        if (activeModal || selectedProject) return;
        setTacticalMapOpen(!isTacticalMapOpen);
      } else if (e.code === 'Escape' && isTacticalMapOpen) {
        if (activeModal || selectedProject) return;
        setTacticalMapOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, selectedProject, isInitialWelcomeOpen, isTacticalMapOpen, setTacticalMapOpen]);

  if (viewMode !== '3d' || isInitialWelcomeOpen) return null;

  return (
    <>
      {/* ── Circular Glass Mini-Radar (Bottom-Right HUD) ── */}
      <div className="mini-radar-wrapper">
        <div
          className="mini-radar-housing glass-panel"
          onClick={() => setTacticalMapOpen(true)}
          title={language === 'uk' ? 'Натисніть або [M] для тактичної карти' : 'Click or press [M] for tactical map'}
        >
          {/* Outpost Schematic Background on Radar */}
          <div className="radar-island-contour" />
          <div className="radar-path-ns" />
          <div className="radar-path-ew" />

          {/* Concentric Distance Rings & Crosshair */}
          <div className="radar-grid-ring r-inner" />
          <div className="radar-grid-ring r-outer" />
          <div className="radar-crosshair h" />
          <div className="radar-crosshair v" />

          {/* Fixed Cardinal Compass Dial */}
          <div className="radar-compass-dial">
            <span className="cardinal-point north">N</span>
            <span className="cardinal-point east">E</span>
            <span className="cardinal-point south">S</span>
            <span className="cardinal-point west">W</span>
          </div>

          {/* Landmark Blips */}
          <div className="radar-blips-layer">
            {dynamicLandmarks.map((lm) => {
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

        {/* Action Button below Radar */}
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
              onClick={() => setTacticalMapOpen(true)}
              title={language === 'uk' ? 'Відкрити тактичну карту аванпосту [M]' : 'Open tactical map [M]'}
            >
              <Map size={13} className="radar-map-btn-icon" />
              <span>{language === 'uk' ? 'Карта [M]' : 'Map [M]'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tactical Outpost Map Modal (Expanded Map on [M] or Radar Click) ── */}
      {isTacticalMapOpen && (
        <div className="tactical-map-backdrop" onClick={() => setTacticalMapOpen(false)}>
          <div className="tactical-map-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tactical-map-header">
              <div className="tactical-map-title-group">
                <Map size={20} className="tactical-map-icon" />
                <div>
                  <h3 className="tactical-map-title">
                    {language === 'uk' ? 'Тактична карта аванпосту Aetheria' : 'Aetheria Outpost Tactical Map'}
                  </h3>
                  <span className="tactical-map-subtitle">
                    {language === 'uk'
                      ? 'Клікніть на станцію або члена екіпажу для перегляду'
                      : 'Click any crew station or landmark to inspect'}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setTacticalMapOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Geometric Map Container */}
            <div className="tactical-map-canvas-container">
              {/* Space Background */}
              <div className="tactical-map-ocean-ring" />

              {/* Space Outpost Base Perimeter */}
              <div className="tactical-map-island-body">
                {/* Outpost corridors and platforms */}
                <div className="tactical-path-main-ns" />
                <div className="tactical-path-fork-w" />
                <div className="tactical-path-fork-e" />
                <div className="tactical-central-hub" />
              </div>

              {/* Compass Rose */}
              <div className="tactical-compass-rose">
                <Navigation size={12} className="tactical-compass-arrow" />
                <span>N</span>
              </div>

              {/* Interactive Landmark Pins */}
              {dynamicLandmarks.map((lm) => {
                const mapLeft = 50 + (lm.x / ISLAND_SPAN) * TACTICAL_MAP_SPREAD_PERCENT;
                const mapTop = 50 + (lm.z / ISLAND_SPAN) * TACTICAL_MAP_SPREAD_PERCENT;

                return (
                  <div
                    key={lm.id}
                    className="tactical-pin-wrapper"
                    style={{ left: `${mapLeft}%`, top: `${mapTop}%` }}
                    onClick={() => openLandmark(lm)}
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

              {/* Live Player Position Pin */}
              <div ref={tacticalPlayerRef} className="tactical-player-pin">
                <div className="tactical-player-arrow" />
                <div className="tactical-player-dot" />
              </div>
            </div>

            {/* Quick Navigation Chips Legend */}
            <div className="tactical-map-legend">
              <span className="legend-title">
                {language === 'uk' ? 'Швидкий перехід до станцій екіпажу:' : 'Quick Crew Station Navigation:'}
              </span>
              <div className="legend-items-row">
                {LANDMARKS.filter((l) => l.type !== 'secret').map((lm) => (
                  <button
                    key={lm.id}
                    className="legend-chip glass-panel"
                    onClick={() => openLandmark(lm)}
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
