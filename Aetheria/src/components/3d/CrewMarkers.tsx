'use client';

/**
 * CrewMarkers — floating markers above crew members.
 *
 * Answers "where to go" without opening the map: from afar you can see where
 * a person stands and which sector they are in. The color is per-sector from zones.ts, the position comes from the shared
 * resolver npcPlacements.ts (the same answer as physics and the radar), so
 * the marker physically cannot hang anywhere other than where the NPC actually stands.
 *
 * State is read from the dossier: an unvisited sector pulses and glows brightly,
 * a visited one calms down and dims. Motion here is not decoration: the eye
 * catches it before it catches color, so "where I have not been yet" is visible
 * in peripheral vision.
 *
 * The markers are sprites, i.e. always facing the camera, and are drawn with normal
 * depth testing: behind a structure the marker is honestly hidden instead of showing
 * through the wall. Distant sectors behind the terrain are shown by the tactical map.
 *
 * No objects are needed in the map editor for this — it is all systematic.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ZONES, ZONE_ORDER } from '../../data/zones';
import { NPC_POSITIONS } from '../../data/npcPlacements';
import { useGameStore } from '../../store/useGameStore';
import { NPCId } from '../../types/store';

// The character is 0.55 m (see CrewNPCs), height varies within 0.53..0.58, so
// a fixed height above the feet suits all six. It is raised slightly above
// the head deliberately: the marker must clear the low platform edges.
const MARKER_HEIGHT = 1.0;
const MARKER_SIZE = 0.5;

// A second layer that ignores depth. The base is dense: the commander and
// the engineer stand behind platforms, and an honest marker is simply not visible from there — yet
// the question "where to go" is asked exactly when the target is behind a structure. A faint
// see-through rim is a common game convention; the main, honestly
// occluded layer remains, so in open ground it is the one you see.
const GHOST_MIN_OPACITY = 0.3;
const GHOST_MAX_OPACITY = 0.55;

/** '#fbbf24' → 'rgba(251, 191, 36, a)' for canvas fills. */
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Round beacon drawn directly in the sector color.
 *
 * The shape is the same — a ring with a soft core; only the brightness grew. Why not a
 * tinted sprite as before: the material can only multiply the texture by a color, while
 * a bright marker needs independent colors — a saturated sector ring,
 * a white core and a dark backing. So for each of the six sectors a
 * separate 256² texture is drawn (~2 MB for the whole crew), but the marker stays one
 * draw call.
 *
 * Brightness rests on three layers: a wide colored glow, a thick ring at
 * full strength and a white core that stays white regardless of the sector color.
 * The dark backing under the ring is needed in bright daylight: on a sun-bleached plate
 * even a saturated color otherwise disappears, and the dark edge separates the ring from the background.
 */
function makeMarkerTexture(hexColor: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const c = size / 2;

  // Glow: a wide colored halo that makes the marker visible in peripheral
  // vision before the ring.
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, hexToRgba(hexColor, 0.62));
  glow.addColorStop(0.5, hexToRgba(hexColor, 0.22));
  glow.addColorStop(1, hexToRgba(hexColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Dark backing slightly wider than the ring: daytime contrast on light plates.
  ctx.beginPath();
  ctx.arc(c, c, 72, 0, Math.PI * 2);
  ctx.lineWidth = 24;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.stroke();

  // The ring itself — thick and at full sector color strength.
  ctx.beginPath();
  ctx.arc(c, c, 72, 0, Math.PI * 2);
  ctx.lineWidth = 15;
  ctx.strokeStyle = hexColor;
  ctx.stroke();

  // White core with a short glow: the main source of "brightness", not
  // dependent on the sector color.
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
 * Normal blending, not additive.
 *
 * An additive marker disappears on a light surface: the base sits in the sun, and
 * adding color to an already almost white platform fragment changes nothing —
 * verified, the ring read on dark ground and vanished completely on a light
 * plate. Normal blending gives a colored ring on both light and dark;
 * softness comes from the texture alpha, not from the blend mode.
 */
function makeSpriteMaterial(
  texture: THREE.CanvasTexture | null,
  opts: { depthTest: boolean; opacity: number }
): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map: texture || undefined,
    // The color is already baked into the texture (ring + backing + core), so the material
    // does not tint it, only shows it as is.
    color: 0xffffff,
    transparent: true,
    opacity: opts.opacity,
    depthWrite: false,
    depthTest: opts.depthTest,
    // The marker is UI over the world, not an object in the sector air:
    // zone fog must not dim it.
    fog: false
  });
}

export default function CrewMarkers(): React.ReactElement {
  // A pair of materials and its own texture per person: the color is per-sector and baked
  // into canvas, so six markers stay six draw calls instead of carrying
  // shader coloring work.
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
    // We read the dossier via getState(): subscribing to metCrew would re-render the scene
    // subtree on every introduction, while only opacity and size change here.
    const met = useGameStore.getState().metCrew;

    markers.forEach((m, i) => {
      const sprite = sprites.current[i];
      const ghost = ghosts.current[i];
      if (!sprite && !ghost) return;

      const isMet = met.includes(m.crewId);
      // An unvisited sector breathes twice as fast and deeper than a visited one.
      const pulse = 0.5 + 0.5 * Math.sin(t * (isMet ? 0.9 : 2.6) + i);
      const bob = m.position[1] + Math.sin(t * 1.1 + i) * 0.06;
      const scale = MARKER_SIZE * (isMet ? 0.86 : 0.98 + 0.14 * pulse);

      m.material.opacity = isMet ? 0.52 + 0.10 * pulse : 0.94 + 0.06 * pulse;
      sprite?.scale.set(scale, scale, 1);
      if (sprite) sprite.position.y = bob;

      // The see-through layer is quieter than the main one and barely breathes: it is a hint, not
      // a second full marker, and must not draw attention to itself.
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
          {/* The see-through layer is drawn last among transparent objects: otherwise its own
              honest layer would cover it. */}
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
