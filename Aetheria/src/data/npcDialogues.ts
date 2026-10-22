/**
 * npcDialogues.ts — dialogue scripts and sector metadata for the 6 outpost crew members.
 *
 * Provides bilingual (Ukrainian and English) short, factual dialogue lines written
 * in each crew member's voice, plus sector theming, gestures and modal action links.
 * The copy stays calm and specific: the crew explains what stands in front of the
 * visitor and what is worth opening next, without advertising language.
 *
 * Координаты, цвет сектора и имя сектора здесь НЕ хранятся: они приходят из
 * zones.ts, это свойство места, а не человека. Здесь остаётся то, что принадлежит
 * разговору — реплики, жест, вращение и то, что NPC открывает (targetKey).
 */

import { NPCId, MaterialKey } from '../types/store';
import { ZONES, ZoneId, SectorColor } from './zones';

// Сектор переехал в zones.ts; тип ре-экспортируется, чтобы не ломать тех, кто
// брал его отсюда.
export type { SectorColor };

export interface LocalizedString {
  en: string;
  uk: string;
}

export interface NPCDialogueDef {
  id: NPCId;
  /** Сектор, в котором стоит NPC. Координаты, цвет и имя места — в zones.ts. */
  zone: ZoneId;
  /** Файл модели в public/model/kaykit_space — единственная связка NPC↔размещение в islandScene.json. */
  modelFile: string;
  name: LocalizedString;
  role: LocalizedString;
  badge: LocalizedString;
  sector: SectorColor;
  hexColor: string;
  rgbColor: string;
  position: [number, number, number];
  rotation: [number, number, number];
  gesture: 'Waving' | 'Work_A' | 'Interact' | 'Cheering';
  dialogueText: LocalizedString;
  actionLabel: LocalizedString;
  dismissLabel: LocalizedString;
  targetType: 'modal' | 'project';
  /** Что открывает разговор. Список живёт в types/store (MATERIAL_KEYS) — его
   *  же ведёт досье, отмечая, какие материалы посетитель уже посмотрел. */
  targetKey: MaterialKey;
}

export const NPC_DIALOGUES: Record<NPCId, NPCDialogueDef> = {
  commander: {
    id: 'commander',
    modelFile: 'npc_commander.glb',
    name: {
      en: 'Commander Kira',
      uk: 'Командир Кіра'
    },
    role: {
      en: 'Expedition Commander',
      uk: 'Командир експедиції'
    },
    badge: {
      en: '[COMMANDER // BIO-ARCHIVE]',
      uk: '[КОМАНДИР // БІО-АРХІВ]'
    },
    zone: 'bio_archive',
    sector: ZONES.bio_archive.sector,
    hexColor: ZONES.bio_archive.hexColor,
    rgbColor: ZONES.bio_archive.rgbColor,
    position: ZONES.bio_archive.position,
    rotation: [0, Math.PI, 0],
    gesture: 'Waving',
    dialogueText: {
      en: "Welcome aboard Aetheria Outpost. I'm Commander Kira. This station is Dmytro's work — every system here, from database schemas to WebGL shaders, built on a Kyiv Polytechnic (KPI) software engineering degree and four years of full-stack practice. My archive holds his full record.",
      uk: 'Вітаю на аванпості Aetheria. Я командир Кіра. Ця станція — робота Дмитра: кожна система тут, від схем бази даних до WebGL-шейдерів, стоїть на освіті з інженерії програмного забезпечення в КПІ та чотирьох роках фулстек-практики. У моєму архіві — повна особова справа.'
    },
    actionLabel: {
      en: 'Open dossier',
      uk: 'Відкрити досьє'
    },
    dismissLabel: {
      en: 'Close',
      uk: 'Закрити'
    },
    targetType: 'modal',
    targetKey: 'bio'
  },

  chief_engineer: {
    id: 'chief_engineer',
    modelFile: 'npc_engineer.glb',
    name: {
      en: 'Chief Engineer Vex',
      uk: 'Головний інженер Векс'
    },
    role: {
      en: 'Reactor & Systems Architect',
      uk: 'Архітектор реактора і систем'
    },
    badge: {
      en: '[CHIEF ENGINEER // REACTOR CORE]',
      uk: '[ГОЛОВНИЙ ІНЖЕНЕР // ЯДРО РЕАКТОРА]'
    },
    zone: 'reactor_core',
    sector: ZONES.reactor_core.sector,
    hexColor: ZONES.reactor_core.hexColor,
    rgbColor: ZONES.reactor_core.rgbColor,
    position: ZONES.reactor_core.position,
    rotation: [0, -0.8, 0],
    gesture: 'Work_A',
    dialogueText: {
      en: "Reactor's stable. Sixty FPS on deterministic Rapier physics, no per-frame allocations, strict TypeScript across the stack, React 19 and Next.js 15 underneath. The technical passport — stack and certifications — is on this console.",
      uk: 'Реактор стабільний. Шістдесят FPS на детермінованій фізиці Rapier, нуль алокацій у циклі кадрів, суворий TypeScript по всьому стеку, під капотом — React 19 і Next.js 15. Технічний паспорт зі стеком і сертифікатами — на цій консолі.'
    },
    actionLabel: {
      en: 'Stack & certifications',
      uk: 'Стек і сертифікати'
    },
    dismissLabel: {
      en: 'Close',
      uk: 'Закрити'
    },
    targetType: 'modal',
    targetKey: 'skills'
  },

  comms_officer: {
    id: 'comms_officer',
    modelFile: 'npc_comms.glb',
    name: {
      en: 'Comms Officer Tayra',
      uk: "Офіцер зв'язку Тайра"
    },
    role: {
      en: 'Subspace Relay Officer',
      uk: "Офіцер підпросторового зв'язку"
    },
    badge: {
      en: '[COMMS // SUBSPACE ARRAY]',
      uk: "[ЗВ'ЯЗОК // СУБПРОСТОРОВИЙ МАСИВ]"
    },
    zone: 'subspace_array',
    sector: ZONES.subspace_array.sector,
    hexColor: ZONES.subspace_array.hexColor,
    rgbColor: ZONES.subspace_array.rgbColor,
    position: ZONES.subspace_array.position,
    rotation: [0, -1.2, 0],
    gesture: 'Interact',
    dialogueText: {
      en: 'The subspace array is locked on Kyiv and the channel is clean. Mail, Telegram and GitHub are live — send your project or offer through this uplink and it reaches Dmytro directly.',
      uk: 'Субпросторовий масив наведено на Київ, канал чистий. Пошта, Telegram і GitHub активні — надішліть проєкт або пропозицію через цей канал, і вона потрапить до Дмитра напряму.'
    },
    actionLabel: {
      en: 'Contact Dmytro',
      uk: "Зв'язатися"
    },
    dismissLabel: {
      en: 'Close',
      uk: 'Закрити'
    },
    targetType: 'modal',
    targetKey: 'contacts'
  },

  ui_architect: {
    id: 'ui_architect',
    modelFile: 'npc_forma.glb',
    name: {
      en: 'UI Architect Nova',
      uk: 'UI-архітектор Нова'
    },
    role: {
      en: 'Forma-3D Lab Lead',
      uk: 'Керівник лабораторії Forma-3D'
    },
    badge: {
      en: '[UI ARCHITECT // FORMA-3D]',
      uk: '[UI-АРХІТЕКТОР // FORMA-3D]'
    },
    zone: 'generative_lab',
    sector: ZONES.generative_lab.sector,
    hexColor: ZONES.generative_lab.hexColor,
    rgbColor: ZONES.generative_lab.rgbColor,
    position: ZONES.generative_lab.position,
    rotation: [0, -1.57, 0],
    gesture: 'Interact',
    dialogueText: {
      en: 'This deck runs Forma-3D, our generative CAD in the browser: parametric splines, real-time mesh operations and instant glTF export. The demo is interactive — you can model something yourself.',
      uk: 'На цій палубі працює Forma-3D — генеративний CAD у браузері: параметричні сплайни, операції з мешами в реальному часі та миттєвий експорт у glTF. Демо інтерактивне — можете змоделювати щось самостійно.'
    },
    actionLabel: {
      en: 'Launch Forma-3D',
      uk: 'Демо Forma-3D'
    },
    dismissLabel: {
      en: 'Close',
      uk: 'Закрити'
    },
    targetType: 'project',
    targetKey: 'forma'
  },

  geodata_analyst: {
    id: 'geodata_analyst',
    modelFile: 'npc_terrascope.glb',
    name: {
      en: 'Geodata Analyst Orion',
      uk: 'Геодата-аналітик Оріон'
    },
    role: {
      en: 'Orbital GIS Specialist',
      uk: 'Фахівець орбітального ГІС'
    },
    badge: {
      en: '[GEODATA // ORBITAL GIS]',
      uk: '[ГЕОДАНІ // ОРБІТАЛЬНИЙ ГІС]'
    },
    zone: 'orbital_gis',
    sector: ZONES.orbital_gis.sector,
    hexColor: ZONES.orbital_gis.hexColor,
    rgbColor: ZONES.orbital_gis.rgbColor,
    position: ZONES.orbital_gis.position,
    rotation: [0, 1.57, 0],
    gesture: 'Work_A',
    dialogueText: {
      en: 'Orbital telemetry is streaming: TerraScope renders multispectral imagery as live geospatial layers — millions of coordinates, tile pyramids and vector streams in real time. The platform is open for inspection.',
      uk: 'Орбітальна телеметрія йде потоком: TerraScope перетворює мультиспектральні знімки на живі геошари — мільйони координат, тайлові піраміди й векторні потоки в реальному часі. Платформа відкрита для огляду.'
    },
    actionLabel: {
      en: 'Launch TerraScope',
      uk: 'Демо TerraScope'
    },
    dismissLabel: {
      en: 'Close',
      uk: 'Закрити'
    },
    targetType: 'project',
    targetKey: 'terrascope'
  },

  photonics_specialist: {
    id: 'photonics_specialist',
    modelFile: 'npc_lumina.glb',
    name: {
      en: 'Photonics Specialist Lyra',
      uk: 'Фахівець з фотоніки Ліра'
    },
    role: {
      en: 'Optics & Shader Scientist',
      uk: 'Фахівець з оптики та шейдерів'
    },
    badge: {
      en: '[PHOTONICS // LUMINA]',
      uk: '[ФОТОНІКА // LUMINA]'
    },
    zone: 'lumina_optics',
    sector: ZONES.lumina_optics.sector,
    hexColor: ZONES.lumina_optics.hexColor,
    rgbColor: ZONES.lumina_optics.rgbColor,
    position: ZONES.lumina_optics.position,
    rotation: [0, Math.PI, 0],
    gesture: 'Cheering',
    dialogueText: {
      en: 'Keep clear of the beam path. Lumina is our learning platform: interactive media players, automated code checks and live student analytics. The demo is ready when you are.',
      uk: 'Тримайтеся подалі від променя. Lumina — наша освітня платформа: інтерактивні медіаплеєри, автоматична перевірка коду та жива аналітика прогресу студентів. Демо готове до запуску.'
    },
    actionLabel: {
      en: 'Launch Lumina',
      uk: 'Демо Lumina'
    },
    dismissLabel: {
      en: 'Close',
      uk: 'Закрити'
    },
    targetType: 'project',
    targetKey: 'lumina'
  }
};
