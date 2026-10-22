'use client';

/**
 * CrewMarkers — парящие маркеры над членами экипажа.
 *
 * Отвечает на вопрос «куда идти», не открывая карту: издалека видно, где стоит
 * человек и в каком он секторе. Цвет секторный из zones.ts, позиция — из общего
 * резолвера npcPlacements.ts (тот же ответ, что у физики и радара), так что
 * маркер физически не может висеть не над тем местом, где реально стоит NPC.
 *
 * Состояние читается из досье: непройденный сектор пульсирует и горит ярко,
 * пройденный успокаивается и тускнеет. Движение здесь — не украшение: глаз
 * цепляется за него раньше, чем за цвет, поэтому «где я ещё не был» видно
 * боковым зрением.
 *
 * Маркеры — спрайты, то есть всегда развёрнуты к камере, и пишутся с обычным
 * тестом глубины: за постройкой маркер честно скрывается, а не просвечивает
 * сквозь стену. Дальние сектора за рельефом показывает тактическая карта.
 *
 * Объектов в редакторе карты для этого не нужно ни одного — всё системное.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ZONES, ZONE_ORDER } from '../../data/zones';
import { NPC_POSITIONS } from '../../data/npcPlacements';
import { useGameStore } from '../../store/useGameStore';
import { NPCId } from '../../types/store';

// Персонаж 0.55 м (см. CrewNPCs), рост гуляет в пределах 0.53..0.58, поэтому
// фиксированная высота над ступнями подходит всем шестерым. Поднято чуть выше
// головы намеренно: маркер должен выходить из-за низких бортиков платформ.
const MARKER_HEIGHT = 1.0;
const MARKER_SIZE = 0.5;

// Второй слой, который не считается с глубиной. База плотная: командир и
// инженер стоят за платформами, и честный маркер оттуда просто не виден — а
// вопрос «куда идти» задаётся именно тогда, когда цель за постройкой. Слабый
// просвечивающий ободок — общепринятая игровая условность; основной, честно
// загораживаемый слой остаётся, поэтому в открытом поле виден он.
const GHOST_MIN_OPACITY = 0.3;
const GHOST_MAX_OPACITY = 0.55;

/** '#fbbf24' → 'rgba(251, 191, 36, a)' для заливок в canvas. */
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Круглый маячок, нарисованный сразу в цвете сектора.
 *
 * Форма прежняя — кольцо с мягким ядром; выросла только яркость. Почему не
 * tinted-спрайт, как раньше: материал умеет лишь умножать текстуру на цвет, а
 * для яркого маркера нужны независимые цвета — насыщенное кольцо сектора,
 * белое ядро и тёмная подложка. Поэтому на каждый из шести секторов рисуется
 * своя текстура 256² (это ~2 МБ на весь экипаж), зато маркер остаётся одним
 * draw call.
 *
 * Яркость держится на трёх слоях: широкое цветное свечение, толстое кольцо в
 * полную силу и белое ядро, которое остаётся белым при любом цвете сектора.
 * Тёмная подложка под кольцом нужна светлым днём: на выбеленной плите иначе
 * пропадает даже насыщенный цвет, а тёмный кант отделяет кольцо от фона.
 */
function makeMarkerTexture(hexColor: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const c = size / 2;

  // Свечение: широкий цветной ореол, из-за которого маркер видно боковым
  // зрением раньше, чем кольцо.
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, hexToRgba(hexColor, 0.62));
  glow.addColorStop(0.5, hexToRgba(hexColor, 0.22));
  glow.addColorStop(1, hexToRgba(hexColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Тёмная подложка чуть шире кольца: дневной контраст на светлых плитах.
  ctx.beginPath();
  ctx.arc(c, c, 72, 0, Math.PI * 2);
  ctx.lineWidth = 24;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.stroke();

  // Само кольцо — толстое и в полную силу цвета сектора.
  ctx.beginPath();
  ctx.arc(c, c, 72, 0, Math.PI * 2);
  ctx.lineWidth = 15;
  ctx.strokeStyle = hexColor;
  ctx.stroke();

  // Белое ядро с коротким свечением: главный источник «яркости», не
  // зависящий от цвета сектора.
  const core = ctx.createRadialGradient(c, c, 0, c, c, 24);
  core.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  core.addColorStop(0.35, 'rgba(255, 255, 255, 0.72)');
  core.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(c, c, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(c, c, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface MarkerRecord {
  zoneId: string;
  crewId: NPCId;
  position: [number, number, number];
  texture: THREE.CanvasTexture | null;
  material: THREE.SpriteMaterial;
  ghost: THREE.SpriteMaterial;
}

/**
 * Обычное смешивание, а не аддитивное.
 *
 * Аддитивный маркер на светлой поверхности исчезает: база стоит под солнцем, и
 * прибавка цвета к уже почти белому фрагменту платформы ничего не меняет —
 * проверено, кольцо читалось на тёмной земле и полностью пропадало на светлой
 * плите. Обычное смешивание даёт цветное кольцо и на светлом, и на тёмном;
 * мягкость берётся из альфы текстуры, а не из режима наложения.
 */
function makeSpriteMaterial(
  texture: THREE.CanvasTexture | null,
  opts: { depthTest: boolean; opacity: number }
): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map: texture || undefined,
    // Цвет уже запечён в текстуру (кольцо + подложка + ядро), поэтому материал
    // не тонирует её, а только показывает как есть.
    color: 0xffffff,
    transparent: true,
    opacity: opts.opacity,
    depthWrite: false,
    depthTest: opts.depthTest,
    // Маркер — интерфейс поверх мира, а не предмет в воздухе сектора:
    // дымка зоны не должна его приглушать.
    fog: false
  });
}

export default function CrewMarkers(): React.ReactElement {
  // По паре материалов и своей текстуре на человека: цвет секторный и запечён
  // в canvas, поэтому шесть маркеров остаются шестью draw call, а не несут
  // шейдерную возню с раскраской.
  const markers = useMemo<MarkerRecord[]>(
    () =>
      ZONE_ORDER.map((zoneId) => {
        const zone = ZONES[zoneId];
        const pos = NPC_POSITIONS.get(zone.crewId) ?? zone.position;
        const texture = makeMarkerTexture(zone.hexColor);
        return {
          zoneId,
          crewId: zone.crewId,
          position: [pos[0], pos[1] + MARKER_HEIGHT, pos[2]] as [number, number, number],
          texture,
          material: makeSpriteMaterial(texture, { depthTest: true, opacity: 1 }),
          ghost: makeSpriteMaterial(texture, { depthTest: false, opacity: 0 })
        };
      }),
    []
  );

  useEffect(
    () => () =>
      markers.forEach((m) => {
        m.material.dispose();
        m.ghost.dispose();
        m.texture?.dispose();
      }),
    [markers]
  );

  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const ghosts = useRef<(THREE.Sprite | null)[]>([]);
  const elapsed = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    elapsed.current += delta;
    const t = elapsed.current;
    // Досье читаем через getState(): подписка на metCrew ре-рендерила бы поддерево
    // сцены при каждом знакомстве, а меняются здесь только прозрачность и размер.
    const met = useGameStore.getState().metCrew;

    markers.forEach((m, i) => {
      const sprite = sprites.current[i];
      const ghost = ghosts.current[i];
      if (!sprite && !ghost) return;

      const isMet = met.includes(m.crewId);
      // Непройденный сектор дышит вдвое быстрее и глубже пройденного.
      const pulse = 0.5 + 0.5 * Math.sin(t * (isMet ? 0.9 : 2.6) + i);
      const bob = m.position[1] + Math.sin(t * 1.1 + i) * 0.06;
      const scale = MARKER_SIZE * (isMet ? 0.86 : 0.98 + 0.14 * pulse);

      m.material.opacity = isMet ? 0.52 + 0.10 * pulse : 0.94 + 0.06 * pulse;
      sprite?.scale.set(scale, scale, 1);
      if (sprite) sprite.position.y = bob;

      // Просвечивающий слой тише основного и почти не дышит: он подсказка, а не
      // второй полноценный маркер, и не должен перетягивать внимание на себя.
      m.ghost.opacity = isMet
        ? GHOST_MIN_OPACITY * 0.5
        : GHOST_MIN_OPACITY + (GHOST_MAX_OPACITY - GHOST_MIN_OPACITY) * pulse;
      ghost?.scale.set(scale * 1.15, scale * 1.15, 1);
      if (ghost) ghost.position.y = bob;
    });
  });

  return (
    <group>
      {markers.map((m, i) => (
        <React.Fragment key={m.zoneId}>
          <sprite
            ref={(el) => {
              sprites.current[i] = el;
            }}
            position={m.position}
            material={m.material}
          />
          {/* Просвечивающий слой рисуется последним из прозрачных: иначе его
              перекрыл бы собственный честный слой. */}
          <sprite
            ref={(el) => {
              ghosts.current[i] = el;
            }}
            position={m.position}
            material={m.ghost}
            renderOrder={999}
          />
        </React.Fragment>
      ))}
    </group>
  );
}
