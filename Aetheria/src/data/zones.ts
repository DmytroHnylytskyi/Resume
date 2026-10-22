/**
 * zones.ts — секторы станции: единственная точка правды о том, какие места есть
 * на карте, как они называются, кто в них стоит и в каком порядке их обходить.
 *
 * Зачем отдельный файл. До него «зона» не существовала как сущность: имя сектора
 * лежало второй половиной строки бейджа в npcDialogues, цвет — полями конкретного
 * NPC, позиция — там же. Из-за этого нельзя было ни подписать зону на карте, ни
 * повесить на неё триггер, ни отсортировать обход: нечего было взять за единицу.
 *
 * Модуль — ЛИСТ: он ничего не импортирует из данных сцены, только тип NPCId.
 * Ссылки идут в одну сторону, `npcDialogues` → `zones`, поэтому цикла импортов
 * нет, а поля NPC (position / sector / hexColor / rgbColor) теперь ЧИТАЮТСЯ
 * отсюда, а не дублируются литералами. Разойтись они больше не могут.
 *
 * Чего здесь намеренно НЕТ: того, что открывает NPC (targetKey / targetType).
 * Это свойство разговора, а не места, и живёт в npcDialogues.
 */

import { NPCId } from '../types/store';

/**
 * Цветовая тема сектора. Живёт здесь, а не в npcDialogues: это свойство места,
 * а не человека. npcDialogues ре-экспортирует тип, чтобы не ломать тех, кто
 * брал его оттуда.
 */
export type SectorColor = 'gold' | 'violet' | 'cyan' | 'emerald' | 'sapphire' | 'rose_coral';

export type ZoneId =
  | 'bio_archive'
  | 'reactor_core'
  | 'generative_lab'
  | 'orbital_gis'
  | 'lumina_optics'
  | 'subspace_array';

/** Локальная копия формы LocalizedString: импортировать её из npcDialogues нельзя, это дало бы цикл. */
export interface ZoneLabel {
  en: string;
  uk: string;
}

export interface ZoneDef {
  id: ZoneId;
  /** Кто стоит в секторе. Ссылка по id, а не по позиции: позиция ниже. */
  crewId: NPCId;
  /** Имя места, а не человека: вторая половина бейджа NPC. */
  name: ZoneLabel;
  sector: SectorColor;
  hexColor: string;
  rgbColor: string;
  /** Мировые координаты сектора — они же координаты стоящего в нём NPC. */
  position: [number, number, number];
  /**
   * Радиус сектора для маркеров и триггеров входа.
   * Пять и восемь, а не одно число: командир и UI-архитектор стоят в хабе в
   * 3.5 м друг от друга, и общий радиус в 8 м накрыл бы оба сектора целиком.
   * При пересечении побеждает ближайший сектор.
   */
  radius: number;
  /** Порядок обхода. Собран по логике резюме, см. ZONE_ORDER. */
  order: number;
}

/**
 * Порядок обхода — это не порядок по карте, а порядок рассказа о человеке:
 * кто я → чем владею технически → три проекта → как связаться.
 * Совпадает с тем, что открывает каждый NPC (targetKey в npcDialogues):
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
    // Верхнее плато, четвёртый ярус: сектор не на общем уровне земли.
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
    // Последний по обходу: его материал — контакты, естественное завершение тура.
    order: 6
  }
};

/** Зоны в порядке обхода. Производная от ZONES — сортировать вручную не надо. */
export const ZONE_ORDER: ZoneId[] = (Object.keys(ZONES) as ZoneId[]).sort(
  (a, b) => ZONES[a].order - ZONES[b].order
);

/** Зона по id NPC. Нужна там, где на входе есть только экипаж (диалоги, радар). */
export const ZONE_BY_CREW: Record<NPCId, ZoneId> = (Object.keys(ZONES) as ZoneId[]).reduce(
  (acc, id) => {
    acc[ZONES[id].crewId] = id;
    return acc;
  },
  {} as Record<NPCId, ZoneId>
);

/**
 * Ближайший сектор к точке на плоскости XZ. Пересечения радиусов разрешаются по
 * расстоянию, поэтому хаб с его двумя секторами в 3.5 м друг от друга работает
 * корректно. Возвращает null, если игрок вне всех радиусов.
 */
/**
 * Ближайший сектор, с экипажем которого ещё не знакомы. В отличие от
 * nearestZone считается по XZ без ограничения радиусом: подсказка «куда идти»
 * должна работать и когда игрок на другом конце станции, а не молчать.
 * Возвращает null, когда обойдены все — тогда подсказывать нечего.
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
