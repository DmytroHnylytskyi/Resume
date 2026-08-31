# Forma-3D: Frontend Architecture and Developer Guide

Interactive 3D interior design and architectural configurator client built with Next.js 16 (App Router), React 19, Three.js, React Three Fiber, React Three Drei, and Zustand 5.

---

## Languages / Мови

- [English Version](#english-version)
- [Українська версія](#українська-версія)

---

## English Version

### Technology Stack

- **Next.js 16:** App Router architecture with localized routes via `next-intl` (`src/app/[locale]/`) and standalone production build output.
- **React 19:** React components, hooks, and concurrent rendering.
- **Three.js, `@react-three/fiber`, `@react-three/drei`:** WebGL 3D rendering pipeline, CameraControls navigation, surface raycasting, transform gizmos, and interactive 3D Inspector preview.
- **Zustand 5:** Centralized state management for 3D scene objects, selections, transform modes, day/night lighting, magnet snapping, and authentication.
- **Internationalization (`next-intl`):** Instant client-side localization provider (`ClientI18nProvider`) supporting English (`en`) and Ukrainian (`uk`) without canvas remounts.
- **Material Customization (`react-colorful`):** Real-time color picker panel for sub-mesh recoloring.
- **UI Components & Icons:** Lucide React and Framer Motion with glassmorphism design system.
- **TypeScript 5:** Strict type safety across all components, store actions, and utility functions.

---

### Directory Structure (`frontend/`)

```
frontend/
├── messages/                          # Translation dictionaries
│   ├── en.json                        # English dictionary
│   └── uk.json                        # Ukrainian dictionary
├── public/
│   └── model/                         # 66 modular GLB 3D model files in the Necropolis collection
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── [locale]/
│   │   │   ├── layout.tsx             # Root localized HTML layout
│   │   │   └── page.tsx               # Main 3D editor viewport and UI overlays
│   │   └── globals.css                # Glassmorphism design system styles
│   ├── components/                    # React and Three.js components
│   │   ├── AuthModal.tsx              # Login and registration modal dialog
│   │   ├── CameraNavigationController.tsx # UE5 fly-cam navigation controller
│   │   ├── ClientI18nProvider.tsx     # 0ms client-side i18n wrapper
│   │   ├── ColorPicker.tsx            # Material color picker panel
│   │   ├── FurnitureCard.tsx          # Catalog item card component
│   │   ├── FurnitureCatalog.tsx       # Sidebar catalog and 3D Inspector box
│   │   ├── InstructionModal.tsx       # Controls and keyboard shortcuts modal
│   │   ├── InteractivePlacementGhost.tsx # 3D placement ghost with surface snapping
│   │   ├── PlaceableObject.tsx        # Placed 3D scene object and gizmo
│   │   ├── SceneViewport.tsx          # Memoized Three.js WebGL canvas viewport
│   │   ├── Toast.tsx                  # Toast notification stack
│   │   ├── TransformToolbar.tsx       # Floating transform controls toolbar
│   │   └── UserProfileModal.tsx       # Cloud project save and load manager
│   ├── data/
│   │   └── catalogData.ts             # 66 modular 3D models index (Necropolis)

│   ├── hooks/
│   │   └── useHotkeys.ts              # Global keyboard shortcuts listener
│   ├── store/
│   │   └── useStore.ts                # Zustand global state store
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces and type definitions
│   ├── utils/
│   │   └── modelNormalization.ts      # 3D geometry centering and scaling engine
│   ├── config.ts                      # Backend API URL resolution
│   ├── i18n.ts                        # Server-side next-intl configuration
│   └── proxy.ts                       # Routing proxy middleware
├── Dockerfile                         # Multi-stage standalone production build
├── eslint.config.mjs                  # ESLint configuration
├── next.config.mjs                    # Next.js configuration
├── package.json                       # Dependencies and npm scripts
└── tsconfig.json                      # Strict TypeScript compiler options
```

---

### Available Scripts

In the `frontend` directory:

- `npm run dev`: Starts Next.js development server at http://localhost:3000.
- `npm run build`: Compiles production standalone bundle.
- `npm run start`: Starts production server after building.
- `npm run lint`: Runs ESLint checks.
- `npx tsc --noEmit`: Runs TypeScript strict type-checking.

---

<br />

---

## Українська версія

### Стек Технологій Фронтенду

- **Next.js 16:** Архітектура App Router з локалізованими маршрутами через `next-intl` (`src/app/[locale]/`) та standalone збіркою.
- **React 19:** Сучасні компоненти, хуки та конкурентний рендеринг.
- **Three.js, `@react-three/fiber`, `@react-three/drei`:** WebGL пайплайн рендерингу, навігація CameraControls, рейкастинг поверхонь, гізмо трансформацій та 3D Інспектор.
- **Zustand 5:** Централізований стор для 3D-об'єктів, виділення, режимів трансформації, освітлення день/ніч, магнітної сітки та авторизації.
- **Інтернаціоналізація (`next-intl`):** Клієнтський провайдер `ClientI18nProvider` для миттєвого перемикання UK/EN без розмонтування WebGL Canvas.
- **Кастомізація Матеріалів (`react-colorful`):** Зміна кольору деталей 3D-моделей у реальному часі.
- **UI Компоненти:** Lucide React та Framer Motion зі стилями Glassmorphism.
- **TypeScript 5:** Строга типізація всіх компонентів, стору та утиліт.

---

### Доступні Скрипти

- `npm run dev` — Запуск сервера розробки за адресою http://localhost:3000.
- `npm run build` — Збірка продакшн бандла додатка.
- `npm run start` — Запуск продакшн сервера після збірки.
- `npm run lint` — Перевірка коду через ESLint.
- `npx tsc --noEmit` — Перевірка типів TypeScript.

