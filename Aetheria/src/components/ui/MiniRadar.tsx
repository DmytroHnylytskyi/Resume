'use client';

import React, { useState, useEffect, useRef } from 'react';
import { radarState } from '../../store/radarState';
import { useGameStore } from '../../store/useGameStore';
import { Map } from 'lucide-react';
import { StatueKey } from '../../types/scene';
import { MATERIAL_KEYS } from '../../types/store';
import { nearestUnmetZone } from '../../data/zones';
import {
  CREW_LANDMARKS,
  ISLAND_SPAN,
  TACTICAL_MAP_SPREAD_PERCENT,
  TacticalLandmark
} from '../../data/tacticalLandmarks';
import TacticalMap from './TacticalMap';

const RADAR_RADIUS_PX = 62;
const RADAR_USABLE_RADIUS = 44;
// Map radius as a percentage of the housing width. On mobile, CSS
// shrinks the housing to 74 px, while blips used to be computed in layout pixels
// of 124 px — they went off the edge and were clipped. Percentages scale with
// any housing size.
const RADAR_BLIP_SPREAD_PERCENT = (RADAR_USABLE_RADIUS / RADAR_RADIUS_PX) * 50;

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
    setTacticalMapOpen,
    activeDialogue,
    metCrew,
    openedMaterials
  } = useGameStore();

  const metSet = React.useMemo(() => new Set(metCrew), [metCrew]);
  const totalCrew = CREW_LANDMARKS.length;

  // The nearest unmet sector — its pin is highlighted as the next one.
  const nextZoneId = React.useMemo(
    () => nearestUnmetZone(radarState.x, radarState.z, metCrew),
    [metCrew, isTacticalMapOpen]
  );

  const [hoveredLandmark, setHoveredLandmark] = useState<TacticalLandmark | null>(null);

  const openLandmark = (lm: TacticalLandmark): void => {
    if (lm.targetType === 'project' && lm.targetKey) {
      setSelectedProject(lm.targetKey);
      setTacticalMapOpen(false);
    } else if (lm.targetType === 'modal' && lm.targetKey) {
      setActiveModal(lm.targetKey as StatueKey);
      setTacticalMapOpen(false);
    }
  };

  const playerRadarRef = useRef<HTMLDivElement>(null);
  const tacticalPlayerRef = useRef<HTMLDivElement>(null);

  // 60 FPS zero-allocation animation loop synchronizing live player position
  // and view direction on both the radar and the tactical map.
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const px = radarState.x;
      const pz = radarState.z;
      const yaw = radarState.yaw;

      const headingDeg = (-yaw * 180) / Math.PI;

      if (playerRadarRef.current) {
        const clampedX = Math.max(-ISLAND_SPAN, Math.min(ISLAND_SPAN, px));
        const clampedZ = Math.max(-ISLAND_SPAN, Math.min(ISLAND_SPAN, pz));

        const screenX = 50 + (clampedX / ISLAND_SPAN) * RADAR_BLIP_SPREAD_PERCENT;
        const screenZ = 50 + (clampedZ / ISLAND_SPAN) * RADAR_BLIP_SPREAD_PERCENT;

        playerRadarRef.current.style.left = `${screenX}%`;
        playerRadarRef.current.style.top = `${screenZ}%`;
        playerRadarRef.current.style.transform = `translate(-50%, -50%) rotate(${headingDeg}deg)`;
      }

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
        // A dialogue is also a reason not to open the map: two panels would stack
        // on top of each other, and it would be unclear which one is currently primary.
        if (activeModal || selectedProject || activeDialogue) return;
        setTacticalMapOpen(!isTacticalMapOpen);
      } else if (e.code === 'Escape' && isTacticalMapOpen) {
        if (activeModal || selectedProject) return;
        setTacticalMapOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeModal,
    selectedProject,
    activeDialogue,
    isInitialWelcomeOpen,
    isTacticalMapOpen,
    setTacticalMapOpen
  ]);

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
          <div className="radar-island-contour" />
          <div className="radar-path-ns" />
          <div className="radar-path-ew" />

          <div className="radar-grid-ring r-inner" />
          <div className="radar-grid-ring r-outer" />
          <div className="radar-crosshair h" />
          <div className="radar-crosshair v" />

          <div className="radar-compass-dial">
            <span className="cardinal-point north">N</span>
            <span className="cardinal-point east">E</span>
            <span className="cardinal-point south">S</span>
            <span className="cardinal-point west">W</span>
          </div>

          {/* Landmark Blips — actual map positions */}
          <div className="radar-blips-layer">
            {CREW_LANDMARKS.map((lm) => {
              const blipX = 50 + (lm.x / ISLAND_SPAN) * RADAR_BLIP_SPREAD_PERCENT;
              const blipY = 50 + (lm.z / ISLAND_SPAN) * RADAR_BLIP_SPREAD_PERCENT;
              const unmet = Boolean(lm.crewId && !metSet.has(lm.crewId));

              return (
                <div
                  key={lm.id}
                  className={`radar-landmark-blip${unmet ? ' unmet' : ''}`}
                  style={{
                    left: `${blipX}%`,
                    top: `${blipY}%`,
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

          <div ref={playerRadarRef} className="radar-player-pin">
            <div className="radar-player-cone" />
            <div className="radar-player-dot" />
          </div>
        </div>

        <div className="radar-action-container">
          {hoveredLandmark ? (
            <div className="radar-hover-pill glass-panel" style={{ borderColor: hoveredLandmark.color }}>
              <span className="radar-hover-dot" style={{ backgroundColor: hoveredLandmark.color }} />
              <span className="radar-hover-title">
                {hoveredLandmark.name[language === 'uk' ? 'uk' : 'en']}
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

      {isTacticalMapOpen && (
        <TacticalMap
          landmarks={CREW_LANDMARKS}
          metCrew={metSet}
          nextZoneId={nextZoneId}
          language={language}
          materialsOpened={openedMaterials.length}
          materialsTotal={MATERIAL_KEYS.length}
          playerPinRef={tacticalPlayerRef}
          onSelect={openLandmark}
          onClose={() => setTacticalMapOpen(false)}
        />
      )}
    </>
  );
}
