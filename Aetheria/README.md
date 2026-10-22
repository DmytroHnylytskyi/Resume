# Aetheria - Interactive 3D WebGL Portfolio and Hub

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.174-black)](https://threejs.org/)
[![Rapier](https://img.shields.io/badge/Rapier-3D-ff6b6b)](https://rapier.rs/)
[![License: PolyForm Strict 1.0.0](https://img.shields.io/badge/license-PolyForm%20Strict%201.0.0-black)](LICENSE)
[![Web Guru Awards](https://img.shields.io/badge/Web%20Guru%20Awards-Guru%20of%20the%20Day%202026-f59e0b)](https://www.webguruawards.com/sites/aetheria-interactive-3d-webgl-portfolio)

> **License:** original code, 3D scenes, shaders and design are source-available under [PolyForm Strict 1.0.0](LICENSE). Viewing and noncommercial evaluation are welcome; redistribution, modification, derivative works and commercial use require written permission. Third-party assets keep their own terms — see [NOTICE.md](NOTICE.md).

[English](#english) | [Українська](#українська)

---

<a name="english"></a>
## English

### Overview

Aetheria is an interactive 3D WebGL developer portfolio and project hub built with Next.js 15 (App Router), React 19, Three.js, React Three Fiber, Rapier 3D physics, and Zustand 5.

The application features a dual-experience architecture:
1. **Interactive 3D Outpost:** Third-person exploration of a sci-fi outpost built from 1,059 authored objects (45 unique KayKit Space Base models), with Rapier 3D physics, an animated glTF avatar, six interactive crew members, a tactical map, a day/night cycle, and a celestial scene — a planet below the platform, a shattered moon, orbital megastructure arcs, and a gravitational singularity.
2. **Classic Web Resume:** A responsive, accessible, structured CV landing page with comprehensive sections for professional summary, education, verified certifications, technical skills, featured projects, and direct contact channels.

### Awards

- **Web Guru Awards — Guru of the Day** (October 8, 2026) for Aetheria's interactive 3D WebGL portfolio. [Award page](https://www.webguruawards.com/sites/aetheria-interactive-3d-webgl-portfolio).

---

### Tech Stack

- **Framework & Runtime:** Next.js 15.2.0 (App Router), React 19.0.0, React DOM 19.0.0
- **Language:** TypeScript 5.7 (Strict Mode)
- **3D Graphics & Scene Graph:** Three.js 0.174.0, @react-three/fiber 9.7.0, @react-three/drei 10.7.8
- **Physics Engine:** @react-three/rapier 2.1.0 (Rapier 3D with fixed 60 Hz timestep)
- **State Management:** Zustand 5.0.3
- **Icons & UI Utilities:** Lucide React 1.28.0
- **Styling:** CSS Custom Properties, dynamic data-theme switching (Dark / Light), glassmorphism design system

---

### Architecture & Key Features

- **Dual Viewing Modes:** Seamless transition between the 3D WebGL outpost and the classic web resume without state loss.
- **Third-Person Character Controller:**
  - Keyboard movement (WASD / Arrow keys), Sprint (Shift), Jump (Space).
  - Pointer Lock mouse look with pitch and yaw clamping.
  - Skeletal glTF animation blending with smooth crossfading (Idle, Walk, Run, Jump) using the KayKit Mannequin rigs.
  - Rapier capsule body with terrain collision, void fall recovery, and a cinematic intro flight.
- **Authored Outpost Scene:**
  - 1,059 placed objects built from 45 unique KayKit Space Base models, loaded from `islandScene.json`.
  - Repeated props rendered with `THREE.InstancedMesh`; static kit geometry is merged into one material per model to keep VRAM and draw calls low.
  - Physics colliders generated from measured mesh AABBs (`modelBounds.generated.ts` + `sceneColliders.ts`) and enforced by the `checkColliders.mjs` gate.
- **Crew & Progression:**
  - Six animated crew NPCs with per-sector animation clips, look-at behavior, and capsule collision: Commander Kira, Chief Engineer Vex, Comms Officer Tayra, UI Architect Nova, Geodata Analyst Orion, and Photonics Specialist Lyra.
  - Holographic dialogue HUD with `[E]` / touch interaction; dossier actions open the bio, skills, contacts, and project modals.
  - Tactical map drawn from the real scene with six crew pins, route order, and next-sector guidance. Dossier progress is stored in `localStorage`.
- **Living Environment:**
  - Continuous day/night cycle driving sky gradients, lighting, lamp emissive halos, and the DOM theme.
  - Planet below the platform, magnitude-scattered star field and Milky Way, shattered moon, broken orbital megastructure arcs, and a gravitational singularity.
  - Quality tiers adapt DPR, shadows, anisotropy, and texture sizes to the device.
- **Zero-Latency Bilingual Localization:** Instant language switching (English / Ukrainian) through centralized Zustand state without unmounting or reloading the 3D WebGL canvas.
- **Theme Support:** Dark and Light mode support powered by CSS variables and root attributes.
- **Verified Credentials:** Showcase of formal software engineering education from Kyiv Polytechnic Institute (KPI) and verified skills assessments from HackerRank and EF SET.

---

### Project Structure

```text
├── public/
│   ├── model/kaykit_space/     # 39 glTF + 11 GLB models, rigs and shared atlas
│   ├── shots/                  # Project preview screenshots (WebP)
│   └── audio/                  # UI and ambience audio
├── scripts/
│   ├── importGameMap.mjs       # Forma-3D export -> islandScene.json
│   ├── extractModelBounds.mjs  # Measured mesh AABBs -> modelBounds.generated.ts
│   ├── checkColliders.mjs      # Collider alignment gate
│   ├── e2e-space-test.mjs      # End-to-end gameplay checks
│   └── adversarial-*           # Physics and input edge-case stress tests
├── src/
│   ├── app/
│   │   ├── globals.css         # Theme variables, glassmorphism, responsive styles
│   │   ├── layout.tsx          # Root layout and metadata
│   │   ├── page.tsx            # Dual-view orchestrator; lazy-loads the 3D chunk
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   │   ├── 3d/
│   │   │   ├── AnimatedCharacter.tsx      # glTF avatar and animation state machine
│   │   │   ├── CharacterController.tsx    # Rapier body, input, third-person camera
│   │   │   ├── CosmicDust.tsx             # Sky-wide dust and debris
│   │   │   ├── CrewMarkers.tsx            # Grounded crew marker rings
│   │   │   ├── CrewNPCs.tsx               # Six animated crew NPCs and look-at
│   │   │   ├── GiantPlanet.tsx            # Baked Earth-like planet below the deck
│   │   │   ├── IslandCanvas.tsx           # R3F canvas, sky, lighting, physics
│   │   │   ├── IslandExperience.tsx       # Lazy 3D mode shell and HUD
│   │   │   ├── LampGlow.tsx               # Additive lamp halos and ground pools
│   │   │   ├── Megastructure.tsx          # Torn orbital megastructure arcs
│   │   │   ├── ShatteredMoon.tsx          # Shattered moon and debris
│   │   │   ├── SingularityCelestial.tsx   # Black hole in the 3D sky
│   │   │   ├── Starfield.tsx              # Magnitude-scattered stars and twinkle
│   │   │   ├── WorldScene.tsx             # Instanced props, colliders, proximity
│   │   │   └── kitAssets.ts               # Shared atlas and merged kit geometry
│   │   ├── singularity/                    # Classic-view black hole background + shaders
│   │   └── ui/                             # HUD, dialogue, modals, CV, tactical map
│   ├── data/
│   │   ├── islandScene.json               # 1,059 placed objects, spawn point, yaw
│   │   ├── modelBounds.generated.ts       # Measured AABBs (generated)
│   │   ├── npcDialogues.ts                # Six crew dialogue scripts
│   │   ├── npcPlacements.ts               # Crew positions resolved from the scene
│   │   ├── resumeData.ts                  # Profile, projects, certificates, copy
│   │   ├── sceneColliders.ts              # Physics collider source of truth
│   │   ├── tacticalLandmarks.ts           # Six crew pins for the tactical map
│   │   └── zones.ts                       # Outpost sectors and crew mapping
│   ├── hooks/                              # Audio, focus trap, spatial resume hooks
│   ├── store/                              # Zustand store and zero-allocation buffers
│   └── types/                              # Portfolio, scene and store contracts
├── Dockerfile
├── Procfile
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

### Getting Started

#### Prerequisites

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher

#### Installation

```bash
# Clone the repository
git clone https://github.com/DmytroHnylytskyi/Resume.git

# Navigate to project directory
cd Resume/Aetheria

# Install dependencies
npm install
```

#### Development

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

#### Production Build

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

---

### Author & Links

- **Author:** Dmytro Hnylytskyi
- **GitHub:** [https://github.com/DmytroHnylytskyi](https://github.com/DmytroHnylytskyi)
- **Telegram:** [@mokydjin](https://t.me/mokydjin)
- **Email:** hnylytskyidmitri@gmail.com

---

<a name="українська"></a>
## Українська

### Опис Проєкту

Aetheria — це інтерактивне 3D WebGL портфоліо та головний хаб проєктів розробника, розроблений на базі Next.js 15 (App Router), React 19, Three.js, React Three Fiber, фізичного рушія Rapier 3D та Zustand 5.

Додаток реалізує архітектуру двох режимів перегляду:
1. **Інтерактивний 3D-Аутпост:** Дослідження науково-фантастичного аутпосту від третьої особи: 1 059 авторських об'єктів із 45 унікальних моделей KayKit Space Base, фізика Rapier 3D, анімований glTF-аватар, шість інтерактивних членів екіпажу, тактична карта, цикл день/ніч і небесна сцена — планета під платформою, розбитий місяць, дуги орбітальної мегаструктури та гравітаційна сингулярність.
2. **Класичне Резюме:** Адаптивний, доступний, структурований веб-лендінг із детальним описом інженерного бекграунду, вищої освіти, верифікованих сертифікацій, стеку технологій, реалізованих проєктів та прямих контактів.

### Нагороди

- **Web Guru Awards — Guru of the Day** (8 жовтня 2026) за інтерактивне 3D WebGL портфоліо Aetheria. [Сторінка нагороди](https://www.webguruawards.com/sites/aetheria-interactive-3d-webgl-portfolio).

> **Ліцензія:** оригінальний код, 3D-сцени, шейдери та дизайн доступні за [PolyForm Strict 1.0.0](LICENSE). Перегляд і некомерційне ознайомлення дозволені; розповсюдження, зміни, похідні роботи та комерційне використання — лише з письмового дозволу. Сторонні ассети — за їхніми власними ліцензіями, див. [NOTICE.md](NOTICE.md).

---

### Технологічний Стек

- **Фреймворк та Середовище:** Next.js 15.2.0 (App Router), React 19.0.0, React DOM 19.0.0
- **Мова програмування:** TypeScript 5.7 (Строгий режим)
- **3D-Графіка та Сцена:** Three.js 0.174.0, @react-three/fiber 9.7.0, @react-three/drei 10.7.8
- **Фізичний Рушій:** @react-three/rapier 2.1.0 (Rapier 3D із фіксованим кроком 60 Гц)
- **Управління Станом:** Zustand 5.0.3
- **Іконки та Інтерфейс:** Lucide React 1.28.0
- **Стилізація:** CSS Custom Properties, динамічне перемикання тем (Dark / Light), дизайн-система на базі glassmorphism

---

### Архітектура та Ключові Можливості

- **Два Режими Перегляду:** Миттєве перемикання між 3D-аутпостом і класичним резюме зі збереженням стану.
- **Контролер Персонажа від Третьої Особи:**
  - Пересування клавіатурою (WASD / стрілки), спринт (Shift), стрибок (Пробіл).
  - Обертання камери мишею через Pointer Lock з обмеженням кутів огляду.
  - Змішування скелетних glTF-анімацій (Idle, Walk, Run, Jump) із плавним кросфейдом на ригах KayKit Mannequin.
  - Capsule-тіло Rapier, колізії з рельєфом, відновлення після падіння та кінематографічний вступ.
- **Авторська Сцена Аутпосту:**
  - 1 059 розміщених об'єктів із 45 унікальних моделей KayKit Space Base; джерело — `islandScene.json`.
  - Повторювані пропси рендеряться через `THREE.InstancedMesh`; статична геометрія кіта зливається в один матеріал на модель, щоб тримати VRAM і draw calls низькими.
  - Фізичні колайдери будуються з виміряних AABB мешів (`modelBounds.generated.ts` + `sceneColliders.ts`) і перевіряються гейтом `checkColliders.mjs`.
- **Екіпаж і Прогрес:**
  - Шість анімованих NPC з кліпами під свій сектор, поведінкою look-at і capsule-колізією: командир Кіра, головний інженер Векс, офіцер зв'язку Тайра, UI-архітектор Нова, геодата-аналітик Оріон і фахівець з фотоніки Ліра.
  - Голографічний діалоговий HUD із взаємодією `[E]` / дотиком; дії досьє відкривають модальні вікна біографії, навичок, контактів і проєктів.
  - Тактична карта будується з реальної сцени: шість міток екіпажу, порядок маршруту й підказка наступного сектора. Прогрес досьє зберігається в `localStorage`.
- **Живе Оточення:**
  - Безперервний цикл день/ніч керує градієнтами неба, освітленням, емісійними ореолами ламп і DOM-темою.
  - Планета під платформою, зоряне поле з різними magnitudes і Чумацький Шлях, розбитий місяць, дуги орбітальної мегаструктури та гравітаційна сингулярність.
  - Рівні якості адаптують DPR, тіні, анізотропію та розміри текстур під пристрій.
- **Миттєва Локалізація (0 мс):** Перемикання мови інтерфейсу (Українська / English) через централізований Zustand-стан без розмонтування та перерендерингу 3D WebGL Canvas.
- **Підтримка Тем:** Повноцінна темна та світла теми на базі CSS-змінних.
- **Підтверджені Сертифікати та Освіта:** Інформація про профільну освіту в НТУУ «КПІ ім. Ігоря Сікорського» («Інженерія програмного забезпечення») та офіційно верифіковані кваліфікації від HackerRank і EF SET.

---

### Структура Проєкту

```text
├── public/
│   ├── model/kaykit_space/     # 39 glTF + 11 GLB моделей, риги та спільний атлас
│   ├── shots/                  # Прев'ю проєктів (WebP)
│   └── audio/                  # Аудіо для UI та атмосфери
├── scripts/
│   ├── importGameMap.mjs       # Експорт Forma-3D -> islandScene.json
│   ├── extractModelBounds.mjs  # Виміряні AABB мешів -> modelBounds.generated.ts
│   ├── checkColliders.mjs      # Гейт відповідності колайдерів
│   ├── e2e-space-test.mjs      # Наскрізні перевірки геймплею
│   └── adversarial-*           # Стрес-тести фізики та вводу
├── src/
│   ├── app/
│   │   ├── globals.css         # Змінні тем, glassmorphism, адаптивні стилі
│   │   ├── layout.tsx          # Кореневий layout і метадані
│   │   ├── page.tsx            # Оркестратор двох режимів; ліниве завантаження 3D
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   │   ├── 3d/
│   │   │   ├── AnimatedCharacter.tsx      # glTF-аватар і стейт-машина анімацій
│   │   │   ├── CharacterController.tsx    # Rapier-тіло, ввід, камера від 3-ї особи
│   │   │   ├── CosmicDust.tsx             # Пил і дрібні уламки по всьому небу
│   │   │   ├── CrewMarkers.tsx            # Приземні кільця-маркери екіпажу
│   │   │   ├── CrewNPCs.tsx               # Шість анімованих NPC і look-at
│   │   │   ├── GiantPlanet.tsx            # Запечена Earth-like планета під платформою
│   │   │   ├── IslandCanvas.tsx           # R3F canvas, небо, освітлення, фізика
│   │   │   ├── IslandExperience.tsx       # Лінива оболонка 3D-режиму та HUD
│   │   │   ├── LampGlow.tsx               # Адитивні ореоли ламп і світлові плями
│   │   │   ├── Megastructure.tsx          # Розірвані дуги орбітальної мегаструктури
│   │   │   ├── ShatteredMoon.tsx          # Розбитий місяць та уламки
│   │   │   ├── SingularityCelestial.tsx   # Чорна діра в 3D-небі
│   │   │   ├── Starfield.tsx              # Зорі з різними magnitudes і мерехтінням
│   │   │   ├── WorldScene.tsx             # Інстанси, колайдери, proximity-логіка
│   │   │   └── kitAssets.ts               # Спільний атлас і злита геометрія кіта
│   │   ├── singularity/                    # Фон чорної діри для класичного режиму + шейдери
│   │   └── ui/                             # HUD, діалоги, модалки, резюме, тактична карта
│   ├── data/
│   │   ├── islandScene.json               # 1 059 об'єктів, точка спавну, yaw
│   │   ├── modelBounds.generated.ts       # Виміряні AABB (згенеровано)
│   │   ├── npcDialogues.ts                # Діалоги шести членів екіпажу
│   │   ├── npcPlacements.ts               # Позиції екіпажу з реальної сцени
│   │   ├── resumeData.ts                  # Профіль, проєкти, сертифікати, тексти
│   │   ├── sceneColliders.ts              # Джерело істини для фізичних колайдерів
│   │   ├── tacticalLandmarks.ts           # Шість міток екіпажу для тактичної карти
│   │   └── zones.ts                       # Сектори аутпосту та прив'язка екіпажу
│   ├── hooks/                              # Аудіо, focus trap, spatial-resume хуки
│   ├── store/                              # Zustand-стор і zero-allocation буфери
│   └── types/                              # Контракти portfolio, scene і store
├── Dockerfile
├── Procfile
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

### Швидкий Запуск

#### Системні вимоги

- Node.js 20.0.0 або вище
- npm 9.0.0 або вище

#### Встановлення

```bash
# Клонування репозиторію
git clone https://github.com/DmytroHnylytskyi/Resume.git

# Перехід у директорію проєкту
cd Resume/Aetheria

# Встановлення залежностей
npm install
```

#### Запуск у режимі розробки

```bash
npm run dev
```

Додаток буде доступний за адресою [http://localhost:3000](http://localhost:3000).

#### Збірка для продакшену

```bash
# Створення оптимізованого продакшен-бандлу
npm run build

# Запуск продакшен-сервера
npm start
```

---

### Контакти Автора

- **Автор:** Дмитро Гнилицький
- **GitHub:** [https://github.com/DmytroHnylytskyi](https://github.com/DmytroHnylytskyi)
- **Telegram:** [@mokydjin](https://t.me/mokydjin)
- **Email:** hnylytskyidmitri@gmail.com
