# Aetheria - Interactive 3D WebGL Portfolio and Hub

[English](#english) | [Українська](#українська)

---

<a name="english"></a>
## English

### Overview

Aetheria is an interactive 3D WebGL developer portfolio and project hub built with Next.js 15 (App Router), React 19, Three.js, React Three Fiber, Rapier 3D physics, and Zustand 5.

The application features a dual-experience architecture:
1. **Interactive 3D World:** Third-person spatial exploration on a modular island environment with physics simulation, animated avatar movement, proximity-based interactions, knowledge statues, and project portals.
2. **Classic Web Resume:** A responsive, accessible, structured CV landing page with comprehensive sections for professional summary, education, verified certifications, technical skills, featured projects, and direct contact channels.

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

- **Dual Viewing Modes:** Seamless transition between the 3D WebGL scene and the classic web resume without state loss.
- **Third-Person Character Controller:**
  - Keyboard movement (WASD / Arrow keys), Sprint (Shift), Jump (Space).
  - Pointer Lock mouse look with pitch and yaw clamping.
  - Skeletal FBX animation blending with smooth crossfading (Idle, Walk, Run, Jump).
  - Ground collision checks and void fall recovery.
- **Optimized 3D Scene Rendering:**
  - Instanced mesh batching (`THREE.InstancedMesh`) for repeated environment props (~300 objects rendered in ~15 draw calls).
  - Compound rigid bodies for solid obstacles and perimeter bounds.
  - Single-frame unified pulse glow manager for all interactive landmarks.
- **Spatial Proximity System:** Dynamic detection for interactive targets with a floating HUD interaction prompt (`[E]` key or click):
  - Biography Statue
  - Skills Altar
  - Contacts Statue
  - Forma-3D Portal
  - TerraScope Portal
  - Lumina Portal
- **Zero-Latency Bilingual Localization:** Instant language switching (English / Ukrainian) through centralized Zustand state without unmounting or reloading the 3D WebGL canvas.
- **Theme Support:** Dark and Light mode support powered by CSS variables and root attributes.
- **Verified Credentials:** Showcase of formal software engineering education from Kyiv Polytechnic Institute (KPI) and verified skills assessments from HackerRank and EF SET.

---

### Project Structure

```text
├── public/
│   ├── model/kaykit_halloween/ # 3D GLB assets, character model, textures
│   └── shots/                 # Live project showcase screenshot previews
├── src/
│   ├── app/
│   │   ├── globals.css        # Theme variables, glassmorphism, responsive styles
│   │   ├── layout.tsx         # Root layout with metadata configuration
│   │   └── page.tsx           # Main page orchestrating 3D and Classic views
│   ├── components/
│   │   ├── 3d/
│   │   │   ├── AnimatedCharacter.tsx    # Skeletal mesh and animation state machine
│   │   │   ├── CharacterController.tsx  # Rapier physics body, input, and 3rd-person camera
│   │   │   ├── IslandCanvas.tsx         # R3F Canvas, sky dome, lighting, and physics container
│   │   │   └── WorldScene.tsx           # Instanced props, colliders, glows, proximity detection
│   │   └── ui/
│   │       ├── BioModal.tsx             # Biography and engineering background modal
│   │       ├── ClassicLandingView.tsx   # Full classic CV landing page
│   │       ├── ContactsModal.tsx        # Contact links with one-click copy helpers
│   │       ├── ControlsGuideDropdown.tsx# Expandable keyboard & touch controls guide
│   │       ├── ControlsHUD.tsx          # Top bar navigation, FPS meter, interaction pill
│   │       ├── IntroOverlay.tsx         # Cinematic intro titles and mode selection card
│   │       ├── LandscapeOrientationGuard.tsx # Mobile landscape orientation enforcement
│   │       ├── LoadingScreen.tsx        # Asset loading screen with progress percentage
│   │       ├── MiniRadar.tsx            # HUD mini-radar and tactical island map modal
│   │       ├── MobileTouchControls.tsx  # Dual-zone virtual joystick and camera touch
│   │       ├── ProjectModal.tsx         # Detailed project showcase modal
│   │       ├── ResumePrintDocument.tsx  # Executive print-only CV document for PDF
│   │       ├── RotatingRole.tsx         # Hero specialty phrase carousel
│   │       ├── SkillsModal.tsx          # Tech stack and verified certificates tabs
│   │       ├── TimeOfDaySlider.tsx      # Continuous day/night cycle sky scrubber
│   │       ├── TypedBio.tsx             # Terminal-style self-typing hero bio
│   │       └── icons.tsx                # Shared inline SVG brand icons
│   ├── data/
│   │   ├── islandScene.json   # Placed 3D object positions, rotations, and scales
│   │   └── resumeData.ts      # Profile, projects, certifications, and translations
│   ├── store/
│   │   ├── characterAnimState.ts # Shared zero-overhead mutable animation buffer
│   │   ├── dayNightState.ts   # Continuous day/night state and color LUT
│   │   ├── mobileControlsState.ts # Touch joystick state
│   │   ├── radarState.ts      # Zero-allocation radar telemetry buffer
│   │   └── useGameStore.ts    # Global Zustand store (mode, theme, language, modals)
│   └── types/
│       ├── portfolio.ts       # Profile, project, and translation interfaces
│       ├── scene.ts           # 3D object and scene schema types
│       └── store.ts           # State machine interfaces
├── next.config.mjs            # Package transpilation configuration
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript strict configuration
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
1. **Інтерактивний 3D-Світ:** Просторове дослідження модульного острова з повноцінною симуляцією фізики, анімованим персонажем від третьої особи, системою взаємодії за дистанцією, статуями знань та 3D-порталами до проєктів.
2. **Класичне Резюме:** Адаптивний, доступний, структурований веб-лендінг із детальним описом інженерного бекграунду, вищої освіти, верифікованих сертифікацій, стеку технологій, реалізованих проєктів та прямих контактів.

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

- **Два Режими Перегляду:** Миттєве перемикання між 3D-сценою та класичним резюме зі збереженням стану.
- **Контролер Персонажа від Третьої Особи:**
  - Пересування клавіатурою (WASD / стрілки), спринт (Shift), стрибок (Пробіл).
  - Обертання камери мишею через Pointer Lock з обмеженням кутів огляду.
  - Змішування скелетних FBX-анімацій (Idle, Walk, Run, Jump) із плавним кросфейдом.
  - Перевірка контакту з поверхнею та захист від падіння за межі острова.
- **Оптимізований Рендеринг 3D-Сцени:**
  - Батчинг повторюваних об'єктів через `THREE.InstancedMesh` (~300 об'єктів у ~15 draw calls).
  - Складені тверді тіла (rigid bodies) для перешкод та периметральних меж.
  - Єдиний менеджер пульсуючого світіння точок інтересу в межах одного frame loop.
- **Система Детекції Наближення:** Автоматичне визначення найближчих об'єктів із виведенням підказки взаємодії (`[E]` або клік):
  - Статуя Біографії
  - Вівтар Навичок
  - Статуя Контактів
  - Портал Forma-3D
  - Портал TerraScope
  - Портал Lumina
- **Миттєва Локалізація (0 мс):** Перемикання мови інтерфейсу (Українська / English) без перезавантаження та перерендерингу 3D WebGL Canvas.
- **Підтримка Тем:** Повноцінна темна та світла теми на базі CSS-змінних.
- **Підтверджені Сертифікати та Освіта:** Інформація про профільну освіту в НТУУ «КПІ ім. Ігоря Сікорського» («Інженерія програмного забезпечення») та офіційно верифіковані кваліфікації від HackerRank і EF SET.

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



