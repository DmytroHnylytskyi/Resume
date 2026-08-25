# Forma-3D — Frontend Architecture & Guide

> **Interactive 3D Interior & Architectural Configurator Frontend Application built with Next.js 16 (App Router), React 19, Three.js, and Zustand.**

---

## 🌐 Languages / Мови

- 🇬🇧 [English Version](#-english-version)
- 🇺🇦 [Українська версія](#-українська-версія)

---

## 🇬🇧 English Version

### 🛠️ Technology Stack

- **Next.js 16.2**: App Router architecture with localized routes via `next-intl` (`src/app/[locale]/`) and Next.js 16 `proxy.js` routing.
- **React 19.2**: Modern React hooks and concurrent rendering capabilities.
- **Three.js & R3F**: WebGL 3D rendering pipeline, `@react-three/drei` loaders, surface raycasting engine, and 3D Inspector Box.
- **Zustand 5**: Centralized state management for 3D object list, selection, gizmo transform modes, magnet grid snapping, and persistent storage.
- **Lucide React & Framer Motion**: Modern Glassmorphism UI components, fluid animations, and SVG vector icons.

---

### 📁 Directory Structure (`frontend/`)

```
frontend/
├── public/                     # 3D GLB Model Assets (.glb)
│   └── model/                  # 60+ standalone 3D files
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css         # Glassmorphism design system & CSS variables
│   │   └── [locale]/
│   │       ├── layout.jsx      # Root layout with next-intl provider & SEO
│   │       └── page.jsx        # Main 3D editor viewport & R3F canvas
│   ├── components/             # React & R3F UI Components
│   │   ├── AuthModal.jsx                   # Login & registration dialog
│   │   ├── CameraNavigationController.jsx  # UE5 fly-cam navigation controller
│   │   ├── ColorPicker.jsx                 # Material color picker panel
│   │   ├── FurnitureCard.jsx               # Catalog item card component
   ├── FurnitureCatalog.jsx            # Sidebar catalog + 3D Inspector
│   │   ├── InstructionModal.jsx            # User manual & shortcuts modal
│   │   ├── InteractivePlacementGhost.jsx   # 3D placement ghost & surface snapping
│   │   ├── PlaceableObject.jsx             # 3D scene object + transform gizmo
│   │   ├── TransformToolbar.jsx            # Bottom transform toolbar
│   │   └── UserProfileModal.jsx            # Profile & cloud projects manager
│   ├── data/                   # Preset demo data (userAntiqueHouse.js)
│   ├── hooks/                  # Custom React hooks (useHotkeys.js)
│   ├── i18n.js                 # next-intl configuration
│   ├── proxy.js                # Next.js 16 routing proxy
│   └── store/                  # Zustand store (useStore.js)
├── messages/                   # i18n dictionaries (en.json, uk.json)
└── package.json
```

---

### ⚡ Available Scripts

In the `frontend` directory:

- `npm run dev`: Runs Next.js development server at [http://localhost:3000](http://localhost:3000).
- `npm run build`: Compiles production bundle for deployment.
- `npm run start`: Starts production server after building.
- `npm run lint`: Runs ESLint code quality checks.

---

<br />

---

## 🇺🇦 Українська версія

### 🛠️ Стек Технологій Фронтенду

- **Next.js 16.2**: Режим App Router з локалізацією через `next-intl` (`src/app/[locale]/`) та `proxy.js`.
- **React 19.2**: Сумісні UI компоненти та Хуки.
- **Three.js & R3F**: Рендеринг 3D WebGL сцен, авто-укладка на поверхні (Surface Snapping) та інспектування моделей.
- **Zustand 5**: Глобальне управління станом (3D-об'єкти, трансформи, авторизація, режими освітлення, сітка magnet snap).
- **Lucide React & Framer Motion**: Сучасний UI з ефектами матового скла (Glassmorphism), плавними переходами та чистими SVG-іконками.

---

### ⚡ Доступні Скрипти

- `npm run dev` — Запуск сервера розробки Next.js за адресою [http://localhost:3000](http://localhost:3000).
- `npm run build` — Збірка продакшн бандла додатка.
- `npm run start` — Запуск продакшн сервера після збірки.
- `npm run lint` — Перевірка коду через ESLint.
