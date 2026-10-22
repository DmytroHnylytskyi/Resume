/**
 * zones.ts — station sectors: the single source of truth about which places exist
 * on the map, what they are called, who stands in them and in what order to visit them.
 *
 * Why a separate file. Before it, a "zone" did not exist as an entity: the sector name
 * lived as the second half of the badge string in npcDialogues, the color — in the fields of a
 * specific NPC, the position — there too. Because of this it was impossible to label a zone
 * on the map, attach a trigger to it, or sort the tour: there was no unit to take.
 *
 * The module is a LEAF: it imports nothing from scene data, only the NPCId type.
 * References go one way, `npcDialogues` → `zones`, so there is no import cycle,
 * and NPC fields (position / sector / hexColor / rgbColor) are now READ
 * from here instead of being duplicated by literals. They can no longer diverge.
 *
 * What is intentionally ABSENT here: what an NPC opens (targetKey / targetType).
 * That is a property of the conversation, not of the place, and lives in npcDialogues.
 */

import { NPCId } from '../types/store';

/**
 * Sector color theme. Lives here, not in npcDialogues: it is a property of the place,
 * not of the person. npcDialogues re-exports the type so as not to break those who
 * imported it from there.
 */
export type SectorColor = 'gold' | 'violet' | 'cyan' | 'emerald' | 'sapphire' | 'rose_coral';

export type ZoneId =
  | 'bio_archive'
  | 'reactor_core'
  | 'generative_lab'
  | 'orbital_gis'
  | 'lumina_optics'
  | 'subspace_array';

/** Local copy of the LocalizedString shape: importing it from npcDialogues is impossible, that would create a cycle. */
export interface ZoneLabel {
  en: string;
  uk: string;
}

export interface ZoneDef {
  id: ZoneId;
  /** Who stands in the sector. A reference by id, not by position: the position is below. */
  crewId: NPCId;
  /** The name of the place, not of the person: the second half of the NPC badge. */
  name: ZoneLabel;
  sector: SectorColor;
  hexColor: string;
  rgbColor: string;
  /** World coordinates of the sector — the same coordinates as the NPC standing in it. */
  position: [number, number, number];
  /**
   * Sector radius for markers and entry triggers.
   * Five and eight, not one number: the commander and the UI architect stand in the hub
   * 3.5 m apart, and a common 8 m radius would cover both sectors entirely.
   * When they overlap, the nearest sector wins.
   */
  radius: number;
  /** Visit order. Built around the resume narrative, see ZONE_ORDER. */
  order: number;
}

/**
 * The visit order is not the order on the map but the order of the story about the person:
 * who I am → what I own technically → three projects → how to get in touch.
 * Matches what each NPC opens (targetKey in npcDialogues):
 * bio → skills → forma → terrascope → lumina → contacts.
 */
export const ZONES: Record<ZoneId, ZoneDef> = {
  bio_archive: {
    id: 'bio_archive',
    crewId: 'commander',
    name: { en: 'BIO-ARCHIVE', uk: 'БІО-АРХІВ' },
    sector: 'gold',
    hexColor: '#fbbf24',
    rgbColor: '251, 191, 36',
    position: [5.5, 1.4, -6.1],
    radius: 5,
    order: 1
  },
  reactor_core: {
    id: 'reactor_core',
    crewId: 'chief_engineer',
    name: { en: 'REACTOR CORE', uk: 'ЯДРО РЕАКТОРА' },
    sector: 'violet',
    hexColor: '#c084fc',
    rgbColor: '192, 132, 252',
    // Upper plateau, fourth tier: the sector is not at the common ground level.
    position: [-16.7, 4.0, -10.6],
    radius: 8,
    order: 2
  },
  generative_lab: {
    id: 'generative_lab',
    crewId: 'ui_architect',
    name: { en: 'GENERATIVE LAB', uk: 'ГЕНЕРАТИВНА ЛАБОРАТОРІЯ' },
    sector: 'emerald',
    hexColor: '#34d399',
    rgbColor: '52, 211, 153',
    position: [7.5, 1.0, -3.2],
    radius: 5,
    order: 3
  },
  orbital_gis: {
    id: 'orbital_gis',
    crewId: 'geodata_analyst',
    name: { en: 'ORBITAL GIS', uk: 'ОРБІТАЛЬНИЙ ГІС' },
    sector: 'sapphire',
    hexColor: '#60a5fa',
    rgbColor: '96, 165, 250',
    position: [22.5, 1.0, 24.3],
    radius: 8,
    order: 4
  },
  lumina_optics: {
    id: 'lumina_optics',
    crewId: 'photonics_specialist',
    name: { en: 'LUMINA OPTICS', uk: 'ОПТИКА LUMINA' },
    sector: 'rose_coral',
    hexColor: '#fb7185',
    rgbColor: '251, 113, 133',
    position: [21.8, 1.0, 15.6],
    radius: 8,
    order: 5
  },
  subspace_array: {
    id: 'subspace_array',
    crewId: 'comms_officer',
    name: { en: 'SUBSPACE ARRAY', uk: 'СУБПРОСТОРОВИЙ МАСИВ' },
    sector: 'cyan',
    hexColor: '#38bdf8',
    rgbColor: '56, 189, 248',
    position: [-12.6, 1.0, 19.2],
    radius: 8,
    // Last in the tour: its material is contacts, the natural end of the tour.
    order: 6
  }
};

/** Zones in visit order. Derived from ZONES — no manual sorting needed. */
export const ZONE_ORDER: ZoneId[] = (Object.keys(ZONES) as ZoneId[]).sort(
  (a, b) => ZONES[a].order - ZONES[b].order
);

/** Zone by NPC id. Needed where only the crew is available as input (dialogues, radar). */
export const ZONE_BY_CREW: Record<NPCId, ZoneId> = (Object.keys(ZONES) as ZoneId[]).reduce(
  (acc, id) => {
    acc[ZONES[id].crewId] = id;
    return acc;
  },
  {} as Record<NPCId, ZoneId>
);

/**
 * Nearest sector to a point on the XZ plane. Radius overlaps are resolved by
 * distance, so the hub with its two sectors 3.5 m apart works
 * correctly. Returns null if the player is outside all radii.
 */
/**
 * Nearest sector whose crew has not been met yet. Unlike
 * nearestZone it is computed in XZ without a radius limit: the "where to go" hint
 * must work even when the player is at the other end of the station, not stay silent.
 * Returns null when all have been visited — then there is nothing to hint.
 */
export function nearestUnmetZone(
  x: number,
  z: number,
  metCrew: readonly NPCId[]
): ZoneId | null {
  let best: ZoneId | null = null;
  let bestSq = Infinity;
  for (const id of ZONE_ORDER) {
    const zone = ZONES[id];
    if (metCrew.includes(zone.crewId)) continue;
    const dx = x - zone.position[0];
    const dz = z - zone.position[2];
    const distSq = dx * dx + dz * dz;
    if (distSq < bestSq) {
      bestSq = distSq;
      best = id;
    }
  }
  return best;
}

export function nearestZone(x: number, z: number): ZoneId | null {
  let best: ZoneId | null = null;
  let bestSq = Infinity;
  for (const id of ZONE_ORDER) {
    const zone = ZONES[id];
    const dx = x - zone.position[0];
    const dz = z - zone.position[2];
    const distSq = dx * dx + dz * dz;
    if (distSq <= zone.radius * zone.radius && distSq < bestSq) {
      bestSq = distSq;
      best = id;
    }
  }
  return best;
}
