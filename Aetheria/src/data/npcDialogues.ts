/**
 * npcDialogues.ts — dialogue scripts and sector metadata for the 6 outpost crew members.
 *
 * Provides bilingual (Ukrainian and English) atmospheric and witty sci-fi dialogue trees,
 * sector color themes, station coordinates, gestures, and modal action links.
 */

import { NPCId } from '../types/store';

export type SectorColor = 'gold' | 'violet' | 'cyan' | 'emerald' | 'sapphire' | 'rose_coral';

export interface LocalizedString {
  en: string;
  uk: string;
}

export interface NPCDialogueDef {
  id: NPCId;
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
  targetKey: 'bio' | 'skills' | 'contacts' | 'forma' | 'terrascope' | 'lumina';
}

export const NPC_DIALOGUES: Record<NPCId, NPCDialogueDef> = {
  commander: {
    id: 'commander',
    name: {
      en: 'Commander Valeria',
      uk: 'Командир Валерія'
    },
    role: {
      en: 'Expedition Commander',
      uk: 'Командир експедиції'
    },
    badge: {
      en: '[COMMANDER // BIO-ARCHIVE]',
      uk: '[КОМАНДИР // БІО-АРХІВ]'
    },
    sector: 'gold',
    hexColor: '#fbbf24',
    rgbColor: '251, 191, 36',
    position: [-3.5, 0.5, 11.0],
    rotation: [0, 0.4, 0],
    gesture: 'Waving',
    dialogueText: {
      en: "Welcome to Aetheria Research Outpost, Traveler! I'm Commander Valeria. If you're looking for the chief architect behind this orbital station — Dmytro engineered it from database schemas up to WebGL shaders. No AI hallucinations or spaghetti code: 4 years of rigorous KPI software engineering and battle-tested full-stack product leadership. Ready to inspect the Commander's service record?",
      uk: "Вітаю на науково-дослідному аванпості Aetheria, мандрівнику! Я — Командир Валерія. Якщо ви шукаєте головного архітектора цієї орбітальної платформи — Дмитро закладав її фундамент від реляційних схем бази даних до кастомних WebGL-шейдерів. Жодних галюцинацій ШІ чи спагетті-коду: 4 роки інженерної школи КПІ та реальний фулстек-досвід. Бажаєте ознайомитись із повною особовою справою капітана?"
    },
    actionLabel: {
      en: '📋 Inspect Dossier / Bio',
      uk: '📋 Особова справа / Біографія'
    },
    dismissLabel: {
      en: 'Dismiss, Commander',
      uk: 'Бувай, Командире'
    },
    targetType: 'modal',
    targetKey: 'bio'
  },

  chief_engineer: {
    id: 'chief_engineer',
    name: {
      en: 'Chief Engineer Vex',
      uk: 'Головний інженер Векс'
    },
    role: {
      en: 'Core Propulsion & Systems Architect',
      uk: 'Архітектор реактора та систем'
    },
    badge: {
      en: '[CHIEF ENGINEER // REACTOR CORE]',
      uk: '[ГОЛОВНИЙ ІНЖЕНЕР // ЯДРО РЕАКТОРА]'
    },
    sector: 'violet',
    hexColor: '#c084fc',
    rgbColor: '192, 132, 252',
    position: [4.5, 2.0, 3.5],
    rotation: [0, -0.6, 0],
    gesture: 'Work_A',
    dialogueText: {
      en: "Watch your step near the plasma injectors! We're locking a rock-solid 60 FPS on deterministic Rapier 3D physics. Zero garbage collection spikes: zero per-frame allocations, strict TypeScript boundaries, React 19, and Next.js 15 humming under the hood. This rig runs buttery-smooth even on mobile thermals. Want to review the reactor's full technical specs?",
      uk: "Обережно біля плазмового інжектора! Ми тримаємо залізобетонні 60 кадрів/сек на детерміністичній фізиці Rapier 3D. Ніяких витоків пам'яті: нуль алокацій у циклі кадрів, суворий TypeScript-каркас, React 19 та Next.js 15 під капотом. Як бачите, реактор працює бездоганно навіть на інтегрованих графічних чіпах. Хочете поглянути на технічний паспорт нашого стеку?"
    },
    actionLabel: {
      en: '⚙️ View Tech Stack & Certs',
      uk: '⚙️ Специфікація стеку & Сертифікати'
    },
    dismissLabel: {
      en: 'At ease, Engineer',
      uk: 'Бувай, інженере'
    },
    targetType: 'modal',
    targetKey: 'skills'
  },

  comms_officer: {
    id: 'comms_officer',
    name: {
      en: 'Comms Officer Tayra',
      uk: "Офіцер зв'язку Тайра"
    },
    role: {
      en: 'Subspace Relay & Deep Orbit Comms',
      uk: "Офіцер підпросторового зв'язку"
    },
    badge: {
      en: '[COMMS OFFICER // SUBSPACE ARRAY]',
      uk: "[ОФІЦЕР ЗВ'ЯЗКУ // СУБПРОСТОРОВИЙ МАСИВ]"
    },
    sector: 'cyan',
    hexColor: '#38bdf8',
    rgbColor: '56, 189, 248',
    position: [-5.0, 2.0, 3.5],
    rotation: [0, 0.5, 0],
    gesture: 'Interact',
    dialogueText: {
      en: "Subspace tachyon array locked on Kyiv coordinates! Quantum comms are open with zero ping: direct Telegram relay primed, encrypted mail protocol verified, and GitHub source telemetry ready for inspection. Got an ambitious engineering project or a remote tech role? My subspace array will beam your transmission straight to Dmytro's desk!",
      uk: "Підпросторові тахіонні антени наведено на координати Києва! Канал зв'язку працює з нульовим пінгом: Telegram-лінк активний, зашифрований поштовий протокол синхронізовано, репозиторії GitHub доступні для інспекції коду. Якщо у вас є амбітний проєкт або пропозиція інженерного партнерства — мій передавач доставить ваше повідомлення прямо до термінала Дмитра!"
    },
    actionLabel: {
      en: '📡 Open Subspace Uplink',
      uk: "📡 Відкрити прямий зв'язок"
    },
    dismissLabel: {
      en: 'End transmission',
      uk: "Кінець зв'язку"
    },
    targetType: 'modal',
    targetKey: 'contacts'
  },

  ui_architect: {
    id: 'ui_architect',
    name: {
      en: 'UI Architect Nova',
      uk: 'UI-архітектор Нова'
    },
    role: {
      en: 'Spatial CAD & Generative UI Lead',
      uk: 'Керівник лабораторії Forma-3D'
    },
    badge: {
      en: '[UI ARCHITECT // GENERATIVE LAB]',
      uk: '[UI-АРХІТЕКТОР // ГЕНЕРАТИВНА ЛАБОРАТОРІЯ]'
    },
    sector: 'emerald',
    hexColor: '#34d399',
    rgbColor: '52, 211, 153',
    position: [9.5, 2.0, -3.5],
    rotation: [0, -1.2, 0],
    gesture: 'Interact',
    dialogueText: {
      en: "Welcome to the Procedural Geometry deck! Here we operate Forma-3D — our generative CAD and spatial shape modeling workstation. We fused parametric spline mathematics, real-time CSG meshes, and instant glTF pipelines right in the browser. The interface adapts faster than liquid chrome! Ready to fire up the interactive 3D modeling demo?",
      uk: "Ласкаво просимо до сектору процедурної геометрії! Тут ми досліджуємо Forma-3D — наш веб-редактор просторових форм. Ми об'єднали математичні формули сплайнів, параметричні меші та миттєвий експорт у glTF. Інтерфейс адаптується швидше за рідкий метал! Готові запустити інтерактивну лабораторію 3D-моделювання?"
    },
    actionLabel: {
      en: '🚀 Launch Forma-3D Demo',
      uk: '🚀 Запустити демо Forma-3D'
    },
    dismissLabel: {
      en: 'Return to base',
      uk: 'Бувай, архітекторе'
    },
    targetType: 'project',
    targetKey: 'forma'
  },

  geodata_analyst: {
    id: 'geodata_analyst',
    name: {
      en: 'Geodata Analyst Orion',
      uk: 'Геодата-аналітик Оріон'
    },
    role: {
      en: 'Orbital GIS & Telemetry Specialist',
      uk: 'Спеціаліст орбітального ГІС'
    },
    badge: {
      en: '[GEODATA ANALYST // ORBITAL GIS]',
      uk: '[ГЕОДАТА-АНАЛІТИК // ОРБІТАЛЬНИЙ ГІС]'
    },
    sector: 'sapphire',
    hexColor: '#60a5fa',
    rgbColor: '96, 165, 250',
    position: [-9.5, 2.0, -3.5],
    rotation: [0, 1.2, 0],
    gesture: 'Work_A',
    dialogueText: {
      en: "Orbital constellation telemetry synced and streaming! TerraScope processes multispectral imagery and renders live geospatial intelligence layer-by-layer in real-time. Millions of spatial coordinates, tile pyramids, and vector data streams compiled faster than an orbital burn. Ready to inspect the live GIS analytics platform?",
      uk: "Орбітальні супутники зафіксували стабільний потік даних! TerraScope аналізує мультиспектральні знімки та шар за шаром візуалізує геопросторову аналітику в реальному часі. Мільйони координат, тайлові піраміди та векторні шари обробляються швидше за гравітаційний маневр. Бажаєте поглянути на живу геоінформаційну платформу?"
    },
    actionLabel: {
      en: '🛰️ Launch TerraScope Demo',
      uk: '🛰️ Запустити демо TerraScope'
    },
    dismissLabel: {
      en: 'Stand down',
      uk: 'До зв’язку'
    },
    targetType: 'project',
    targetKey: 'terrascope'
  },

  photonics_specialist: {
    id: 'photonics_specialist',
    name: {
      en: 'Photonics Specialist Lyra',
      uk: 'Спеціаліст з фотоніки Ліра'
    },
    role: {
      en: 'Optics & WebGL Shader Scientist',
      uk: 'Спеціаліст з оптики та Lumina'
    },
    badge: {
      en: '[PHOTONICS SPECIALIST // LUMINA OPTICS]',
      uk: '[ФОТОНІКА // ОПТИКА LUMINA]'
    },
    sector: 'rose_coral',
    hexColor: '#fb7185',
    rgbColor: '251, 113, 133',
    position: [0.0, 4.0, -12.5],
    rotation: [0, 0, 0],
    gesture: 'Cheering',
    dialogueText: {
      en: "Caution: High laser luminance in this sector! The Lumina lab pioneers photon-speed educational workflows. It's not just another LMS, but an optical knowledge accelerator: interactive media players, automated code validation pipelines, and real-time student analytics. Ready to witness the Lumina educational platform demo?",
      uk: "Обережно: інтенсивне лазерне випромінювання! Сектор Lumina тестує новітні оптичні методи передачі знань. Це не просто освітня LMS-платформа, а цілий фотонний симулятор: інтерактивні відеоплеєри, автоматизована перевірка коду та візуальна аналітика прогресу студентів. Запустити демонстрацію освітньої платформи Lumina?"
    },
    actionLabel: {
      en: '✨ Launch Lumina Demo',
      uk: '✨ Запустити демо Lumina'
    },
    dismissLabel: {
      en: 'Transmission ended',
      uk: 'Бувай, Ліро'
    },
    targetType: 'project',
    targetKey: 'lumina'
  }
};
