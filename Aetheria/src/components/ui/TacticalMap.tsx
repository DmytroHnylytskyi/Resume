'use client';

/**
 * TacticalMap — пересобранная тактическая карта аванпоста.
 *
 * Что изменилось относительно старой версии:
 *  - позиции пинов больше не захардкожены: все шесть crew берутся из
 *    tacticalLandmarks.ts (NPC_POSITIONS);
 *  - фон — не абстрактный крест, а схема реальной карты, нарисованная из
 *    islandScene.json: плиты по ярусам, крупные модули, тоннели, солнечное
 *    поле. После `importGameMap.mjs` схема обновляется сама;
 *  - подписи не налезают: имя показывается только у наведённого/выбранного
 *    пина и у следующего сектора; полный список с ролями и статусами живёт
 *    в боковой легенде;
 *  - у пинов номера обхода; следующий сектор пульсирует.
 *  - шаттл на карту не выводится: ни пином, ни силуэтом на схеме — это
 *    декорация стартовой площадки, а не точка маршрута экипажа.
 *
 * Карта — DOM/CSS-слой поверх canvas: canvas рисуется один раз (1k объектов,
 * без анимации), пины и легенда остаются доступными кнопками.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import styles from './TacticalMap.module.css';
import rawIslandSceneData from '../../data/islandScene.json';
import type { IslandSceneData } from '../../types/scene';
import { MODEL_BOUNDS } from '../../data/modelBounds.generated';
import {
  CREW_LANDMARKS,
  ISLAND_SPAN,
  TACTICAL_MAP_SPREAD_PERCENT,
  TacticalLandmark,
  worldToMapPercent
} from '../../data/tacticalLandmarks';
import type { ZoneId } from '../../data/zones';
import type { NPCId } from '../../types/store';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

// Крупные объёмы, которые имеет смысл показывать на схеме. Мелочь (лампы,
// камни, отдельные ящики) в тактическом масштабе только зашумила бы карту.
const MAJOR_PROP_PARTS = [
  'basemodule',
  'roofmodule',
  'tunnel',
  'cargodepot',
  'drill_structure',
  'structure_',
  'windturbine',
  'basemodule_garage',
  'landingpad',
  'containers_',
  'cargo_a_stacked',
  'cargo_b_stacked',
  'spacetruck',
  'solarpanel'
];

function isMajorProp(filename: string): boolean {
  const lower = filename.toLowerCase();
  return MAJOR_PROP_PARTS.some((part) => lower.includes(part));
}

function scaleOf(scale: number | [number, number, number]): number {
  return Array.isArray(scale) ? scale[0] : scale || 1;
}

interface TacticalMapProps {
  landmarks: TacticalLandmark[];
  metCrew: Set<NPCId>;
  nextZoneId: ZoneId | null;
  language: 'en' | 'uk';
  materialsOpened: number;
  materialsTotal: number;
  playerPinRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (landmark: TacticalLandmark) => void;
  onClose: () => void;
}

function drawBaseMap(canvas: HTMLCanvasElement): void {
  const size = 900;
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const center = size / 2;
  const spreadPx = (TACTICAL_MAP_SPREAD_PERCENT / 100) * size;
  const px = (x: number): number => center + (x / ISLAND_SPAN) * spreadPx;
  const py = (z: number): number => center + (z / ISLAND_SPAN) * spreadPx;
  const scale = spreadPx / ISLAND_SPAN;

  // Фон и мягкая виньетка.
  const bg = ctx.createRadialGradient(center, center, 0, center, center, size * 0.72);
  bg.addColorStop(0, '#081724');
  bg.addColorStop(0.55, '#040d16');
  bg.addColorStop(1, '#02050a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Сетка 10 м и оси.
  ctx.lineWidth = 1;
  for (let w = -ISLAND_SPAN; w <= ISLAND_SPAN; w += 10) {
    const gx = px(w);
    const gy = py(w);
    const major = w === 0;
    ctx.strokeStyle = major ? 'rgba(56,189,248,0.22)' : 'rgba(56,189,248,0.07)';
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(size, gy);
    ctx.stroke();
  }

  // Внешняя граница платформы: карта живёт в ±ISLAND_SPAN, рисуем рамку
  // чуть шире габарита плит.
  const frame = 0.06 * size;
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = 'rgba(56,189,248,0.18)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(frame, frame, size - frame * 2, size - frame * 2);
  ctx.setLineDash([]);

  // ── Плиты по ярусам ──
  const terrain = islandSceneData.placedObjects
    .filter((o) => (o.modelPath.split('/').pop() || '').toLowerCase().startsWith('terrain_'))
    .sort((a, b) => a.position[1] - b.position[1]);

  for (const o of terrain) {
    const filename = o.modelPath.split('/').pop() || '';
    const b = MODEL_BOUNDS[filename];
    if (!b) continue;
    const fs = scaleOf(o.scale);
    const w = b.size[0] * fs * scale;
    const h = b.size[2] * fs * scale;
    const y = o.position[1];
    const level = y <= 0 ? 0 : y <= 1 ? 1 : 2;

    ctx.save();
    ctx.translate(px(o.position[0]), py(o.position[2]));
    ctx.rotate(-o.rotation[1]);
    ctx.fillStyle =
      filename.startsWith('terrain_mining')
        ? 'rgba(48,32,24,0.75)'
        : level === 2
          ? 'rgba(36,88,108,0.72)'
          : level === 1
            ? 'rgba(24,58,76,0.68)'
            : 'rgba(16,38,52,0.62)';
    ctx.strokeStyle =
      level === 2 ? 'rgba(94,234,212,0.16)' : 'rgba(56,189,248,0.09)';
    ctx.lineWidth = 0.8;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // ── Крупные модули ──
  const props = islandSceneData.placedObjects
    .filter((o) => {
      const filename = (o.modelPath.split('/').pop() || '').toLowerCase();
      return !filename.startsWith('npc_') && isMajorProp(filename);
    })
    .sort((a, b) => a.position[1] - b.position[1]);

  for (const o of props) {
    const filename = o.modelPath.split('/').pop() || '';
    const b = MODEL_BOUNDS[filename];
    if (!b) continue;
    const fs = scaleOf(o.scale);
    const w = b.size[0] * fs * scale;
    const h = b.size[2] * fs * scale;
    const lower = filename.toLowerCase();
    const isSolar = lower.includes('solarpanel');
    const isIndustrial = lower.includes('drill') || lower.includes('windturbine');
    const isCargo = lower.includes('container') || lower.includes('cargo') || lower.includes('cargodepot');

    ctx.save();
    ctx.translate(px(o.position[0]), py(o.position[2]));
    ctx.rotate(-o.rotation[1]);
    ctx.fillStyle = isSolar
      ? 'rgba(56,189,248,0.20)'
      : isIndustrial
        ? 'rgba(251,191,36,0.16)'
        : isCargo
          ? 'rgba(251,113,133,0.14)'
          : 'rgba(148,197,255,0.15)';
    ctx.strokeStyle = isSolar
      ? 'rgba(125,211,252,0.45)'
      : isIndustrial
        ? 'rgba(251,191,36,0.38)'
        : 'rgba(186,230,253,0.28)';
    ctx.lineWidth = 0.9;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // ── Маршрут обхода экипажа ──
  const route = [...CREW_LANDMARKS].sort((a, b) => a.order - b.order);
  if (route.length > 1) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(251,191,36,0.42)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    route.forEach((lm, i) => {
      const x = px(lm.x);
      const y = py(lm.z);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // Маленький маркер спавна: точка «вы здесь» в начале координат палубы.
  const spawn = islandSceneData.spawnPoint;
  ctx.save();
  ctx.strokeStyle = 'rgba(226,232,240,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(px(spawn[0]), py(spawn[2]), 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px(spawn[0]) - 7, py(spawn[2]));
  ctx.lineTo(px(spawn[0]) + 7, py(spawn[2]));
  ctx.moveTo(px(spawn[0]), py(spawn[2]) - 7);
  ctx.lineTo(px(spawn[0]), py(spawn[2]) + 7);
  ctx.stroke();
  ctx.restore();
}

export default function TacticalMap({
  landmarks,
  metCrew,
  nextZoneId,
  language,
  materialsOpened,
  materialsTotal,
  playerPinRef,
  onSelect,
  onClose
}: TacticalMapProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isUk = language === 'uk';

  useEffect(() => {
    if (canvasRef.current) drawBaseMap(canvasRef.current);
  }, []);

  const rows = useMemo(
    () => [...landmarks].sort((a, b) => a.order - b.order),
    [landmarks]
  );

  const metCount = metCrew.size;
  const crewTotal = CREW_LANDMARKS.length;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={isUk ? 'Тактична карта аванпосту Aetheria' : 'Aetheria Outpost Tactical Map'}
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <MapIcon size={20} className={styles.headerIcon} />
            <div>
              <h3 className={styles.title}>
                {isUk ? 'Тактична карта аванпосту Aetheria' : 'Aetheria Outpost Tactical Map'}
              </h3>
              <span className={styles.subtitle}>
                {isUk
                  ? `Екіпаж ${metCount}/${crewTotal} · матеріалів ${materialsOpened}/${materialsTotal}`
                  : `Crew ${metCount}/${crewTotal} · materials ${materialsOpened}/${materialsTotal}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={isUk ? 'Закрити карту' : 'Close map'}
          >
            <X size={18} />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.mapPanel}>
            <canvas ref={canvasRef} className={styles.mapCanvas} aria-hidden="true" />
            <div className={styles.pinLayer}>
              {landmarks.map((lm) => {
                const { left, top } = worldToMapPercent(lm.x, lm.z);
                const isNext = lm.zoneId === nextZoneId;
                const met = metCrew.has(lm.crewId);
                const label = lm.name[isUk ? 'uk' : 'en'];
                const sector = lm.sector[isUk ? 'uk' : 'en'];
                return (
                  <button
                    key={lm.id}
                    type="button"
                    className={[
                      styles.pin,
                      met ? styles.pinMet : styles.pinUnmet,
                      isNext ? styles.pinNext : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={
                      {
                        left: `${left}%`,
                        top: `${top}%`,
                        '--pin-color': lm.color
                      } as React.CSSProperties
                    }
                    onClick={() => onSelect(lm)}
                    aria-label={`${label} — ${sector}`}
                    title={`${label} · ${sector}`}
                  >
                    {lm.order}
                    <span className={styles.pinLabel}>{label}</span>
                  </button>
                );
              })}
              <div
                ref={playerPinRef}
                className={styles.playerPin}
                style={{ left: '50%', top: '50%' }}
                aria-hidden="true"
              >
                <span className={styles.playerArrow} />
                <span className={styles.playerDot} />
              </div>
            </div>
            <div className={styles.compass} aria-hidden="true">
              <span className={styles.compassArrow}>↑</span>
              <span>N</span>
            </div>
            <span className={styles.mapCaption}>
              {isUk ? 'СХЕМА · РЕАЛЬНА КАРТА' : 'LIVE SCHEMATIC'}
            </span>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.stats}>
              <span className={styles.stat}>
                {isUk ? 'Екіпаж' : 'Crew'}&nbsp;<strong>{metCount}/{crewTotal}</strong>
              </span>
              <span className={styles.stat}>
                {isUk ? 'Матеріали' : 'Materials'}&nbsp;<strong>{materialsOpened}/{materialsTotal}</strong>
              </span>
            </div>

            <div className={styles.crewList}>
              {rows.map((lm) => {
                const isNext = lm.zoneId === nextZoneId;
                const met = metCrew.has(lm.crewId);
                const status = isNext
                  ? isUk
                    ? 'ДАЛІ'
                    : 'NEXT'
                  : met
                    ? isUk
                      ? 'ПРОЙДЕНО'
                      : 'VISITED'
                    : isUk
                      ? 'НЕ ЗНАЙОМІ'
                      : 'UNMET';
                return (
                  <button
                    key={lm.id}
                    type="button"
                    className={[
                      styles.row,
                      !met ? styles.rowUnmet : '',
                      isNext ? styles.rowNext : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ '--pin-color': lm.color } as React.CSSProperties}
                    onClick={() => onSelect(lm)}
                  >
                    <span className={styles.rowNum}>{lm.order}</span>
                    <span className={styles.rowText}>
                      <span className={styles.rowName}>{lm.name[isUk ? 'uk' : 'en']}</span>
                      <span className={styles.rowSector}>{lm.sector[isUk ? 'uk' : 'en']}</span>
                    </span>
                    <span
                      className={[
                        styles.rowStatus,
                        isNext ? styles.rowStatusNext : '',
                        met ? styles.rowStatusMet : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className={styles.hint}>
              {isUk
                ? 'Клік по піну або рядку відкриває досьє / проєкт. Наведіть на пін, щоб побачити ім’я.'
                : 'Click a pin or a row to open the dossier / project. Hover a pin for its name.'}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
