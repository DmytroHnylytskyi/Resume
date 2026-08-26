# Full-Stack Web Development & 3D Interactive Portfolio

[English](#english) | [Українська](#українська)

---

<a name="english"></a>
## English

### Overview

This repository contains a monorepo ecosystem of 4 full-stack applications showcasing modern web development, hardware-accelerated 3D WebGL graphics, asynchronous Python backends, and strict TypeScript architecture.

- **Developer:** Dmytro Hnylytskyi
- **Role:** Full-Stack & Creative 3D Developer
- **Location:** Kyiv, Ukraine (Remote)
- **Status:** Open for Opportunities
- **GitHub:** [https://github.com/DmytroHnylytskyi](https://github.com/DmytroHnylytskyi)
- **Telegram:** [@mokydjin](https://t.me/mokydjin)
- **Email:** dmitrijgnilickij7@gmail.com

---

### Projects Ecosystem

#### 1. [Aetheria - 3D Portfolio Hub](Aetheria/) (Port 3000)
Interactive 3D WebGL developer portfolio island and structured classic CV landing view.
- **Frontend Stack:** Next.js 15.2.0 (App Router), React 19.0.0, Three.js 0.174.0, React Three Fiber, Drei, Rapier 3D Physics (@react-three/rapier 2.1.0), Zustand 5.0.3, TypeScript 5.7.
- **Key Features:**
  - Third-person animated avatar controller with skeletal FBX animations (Idle, Walk, Run, Jump) and smooth crossfading.
  - Rapier 3D physics colliders for ground foundation, perimeter barriers, and scene obstacles.
  - Instanced mesh rendering (`THREE.InstancedMesh`) batching ~300 map objects into ~15 draw calls.
  - Proximity detection system with `[E]` interaction prompt for knowledge statues and project portals.
  - Zero-latency client-side bilingual localization (EN / UK) without WebGL canvas unmounting.
  - Dark / Light mode switching powered by CSS custom properties.

#### 2. [Forma-3D - Spatial Builder & Room Configurator](Forma-3D/) (Port 3001)
Commercial-grade full-stack 3D interior design and spatial room configurator for furniture, decor, and architectural elements.
- **Frontend Stack:** Next.js 16.2.12, React 19.2.4, Three.js 0.185.1, React Three Fiber, Drei, Zustand 5, next-intl, TypeScript.
- **Backend Stack:** FastAPI 0.115.8, SQLAlchemy 2.0 (Async), PostgreSQL 16 (asyncpg), SQLite (aiosqlite), Alembic, Docker.
- **Key Features:**
  - Raycasting surface snapping algorithm for positioning and stacking 3D objects onto arbitrary surfaces.
  - Unreal Engine 5 style freefly camera navigation (RMB + WASD + Shift boost + Focus F).
  - Dynamic sub-mesh material and color customization in real time.
  - Asynchronous project persistence with JWT authentication, role management, and scene serialization.

#### 3. [TerraScope - 3D Geospatial Intelligence](TerraScope/) (Port 3002)
Real-time 3D planetary Earth visualization and geospatial analytics platform with live satellite data integration.
- **Frontend Stack:** Next.js 16.3.0, React 19.2.8, Three.js 0.185.1, React Three Fiber, Custom GLSL Shaders, Zustand 5, TypeScript.
- **Backend Stack:** FastAPI 0.110+, SQLAlchemy 2.0 (Async), SQLite (aiosqlite), Alembic, Docker.
- **Key Features:**
  - Custom GLSL Day/Night Terminator shader with solar direction calculations and Fresnel atmospheric glow.
  - GPU-instanced live data layers: USGS earthquakes, OpenSky active flights, Open-Meteo weather parameters, and NASA NEO asteroid tracking.
  - Cache stampede prevention on the backend using `asyncio.Lock` for high-throughput live feed caching.

#### 4. [Lumina - Asynchronous LMS Platform](Lumina/) (Port 3003)
Asynchronous educational platform for interactive online courses, assignment tracking, and visual student performance curves.
- **Frontend Stack:** React 19.2.7, Vite 8.1.1, TanStack Query v5, Recharts 3.10.1, React Router 7, i18next, TailwindCSS.
- **Backend Stack:** FastAPI 0.115+, SQLAlchemy 2.0 (Async), PostgreSQL 16 (asyncpg), SQLite (aiosqlite), Alembic, Docker.
- **Key Features:**
  - Optimistic UI updates and client-side caching via TanStack Query v5.
  - Role-based authorization (Student / Teacher) with JWT access and refresh token rotation.
  - Interactive multi-format lesson player supporting video streaming, PDF viewing, and Cloudinary CDN storage.
  - Comprehensive analytics dashboards and progress tracking built with Recharts.

---

### Local Launch

#### 1. Simultaneous Launch (All Projects)
Run all 4 projects simultaneously using the included batch launcher script:

```bat
.\start_all_projects.bat
```

- **Aetheria (Hub):** [http://localhost:3000](http://localhost:3000)
- **Forma-3D:** [http://localhost:3001](http://localhost:3001)
- **TerraScope:** [http://localhost:3002](http://localhost:3002)
- **Lumina:** [http://localhost:3003](http://localhost:3003)

#### 2. Individual Project Setup

##### Aetheria
```bash
cd Aetheria
npm install
npm run dev
```

##### Forma-3D
```bash
# Frontend (Port 3001)
cd Forma-3D/frontend
npm install
npm run dev -- -p 3001

# Backend
cd Forma-3D/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

##### TerraScope
```bash
# Frontend (Port 3002)
cd TerraScope/frontend
npm install
npm run dev -- -p 3002

# Backend
cd TerraScope/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

##### Lumina
```bash
# Frontend (Port 3003)
cd Lumina/frontend
npm install
npm run dev -- --port 3003

# Backend
cd Lumina/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

---

<a name="українська"></a>
## Українська

### Опис Екосистеми

Даний репозиторій містить монорепозиторій із 4 повнофункціональних Full-Stack додатків, що демонструють практичну експертизу в розробці сучасних веб-інтерфейсів, апаратно-прискореної 3D WebGL графіки, асинхронних бекенд-сервісів на Python/FastAPI та строгого TypeScript.

- **Розробник:** Дмитро Гнилицький
- **Спеціалізація:** Full-Stack & Creative 3D Developer
- **Локація:** Київ, Україна (Віддалена співпраця)
- **Статус:** Відкритий до пропозицій
- **GitHub:** [https://github.com/DmytroHnylytskyi](https://github.com/DmytroHnylytskyi)
- **Telegram:** [@mokydjin](https://t.me/mokydjin)
- **Email:** dmitrijgnilickij7@gmail.com

---

### Проєкти Екосистеми

#### 1. [Aetheria - 3D Хаб Портфоліо](Aetheria/) (Порт 3000)
Інтерактивний 3D WebGL острів-портфоліо та структуроване класичне резюме.
- **Стек:** Next.js 15.2.0 (App Router), React 19.0.0, Three.js 0.174.0, React Three Fiber, Rapier 3D (@react-three/rapier 2.1.0), Zustand 5.0.3, TypeScript 5.7.
- **Можливості:** Контролер персонажа від третьої особи, скелетні FBX-анімації, фізика Rapier, інстансинг мешів (~300 об'єктів у ~15 draw calls), портали переходів на проєкти, миттєва UK/EN локалізація без перезавантаження сцени.

#### 2. [Forma-3D - Просторовий 3D Конфігуратор](Forma-3D/) (Порт 3001)
Комерційно-орієнтований full-stack 3D-редактор простору та модульний конфігуратор меблів та об'єктів інтер'єру.
- **Фронтенд:** Next.js 16.2.12, React 19.2.4, Three.js 0.185.1, React Three Fiber, Zustand 5, next-intl, TypeScript.
- **Бекенд:** FastAPI 0.115.8, SQLAlchemy 2.0 (Async), PostgreSQL 16 (asyncpg), SQLite, Alembic, Docker.
- **Можливості:** Surface Snapping (Raycasting) для автоматичного розміщення та стекування об'єктів на поверхнях, режим камери Unreal Engine 5, динамічна зміна матеріалів суб-мешів, збереження сцен у БД.

#### 3. [TerraScope - Геопросторова 3D Візуалізація](TerraScope/) (Порт 3002)
Платформа 3D-візуалізації планети Земля з кастомними GLSL-шейдерами та супутниковими даними в реальному часі.
- **Фронтенд:** Next.js 16.3.0, React 19.2.8, Three.js 0.185.1, Custom GLSL Shaders, Zustand 5, TypeScript.
- **Бекенд:** FastAPI 0.110+, SQLAlchemy 2.0 (Async), SQLite (aiosqlite), Alembic, Docker.
- **Можливості:** Кастомний Day/Night Terminator GLSL-шейдер, GPU Instanced шари (землетруси USGS, авіарейси OpenSky, погода Open-Meteo, астероїди NASA), захист від Cache Stampede через `asyncio.Lock`.

#### 4. [Lumina - Асинхронна Освітня LMS Платформа](Lumina/) (Порт 3003)
Асинхронна система дистанційного навчання з модульними курсами, системою дедлайнів та аналітикою успішності.
- **Фронтенд:** React 19.2.7, Vite 8.1.1, TanStack Query v5, Recharts 3.10.1, React Router 7, i18next, TailwindCSS.
- **Бекенд:** FastAPI 0.115+, SQLAlchemy 2.0 (Async), PostgreSQL 16 (asyncpg), SQLite, Alembic, Docker.
- **Можливості:** Оптимістичний UI на базі TanStack Query v5, рольова авторизація (Студент / Викладач) із JWT-ротацією, медіаплеєр уроків (відео, PDF, Cloudinary), аналітичні графіки Recharts.

---

### Запуск Проєктів

#### Одночасний запуск усіх проєктів
```bat
.\start_all_projects.bat
```

- **Aetheria (Головний Хаб):** [http://localhost:3000](http://localhost:3000)
- **Forma-3D:** [http://localhost:3001](http://localhost:3001)
- **TerraScope:** [http://localhost:3002](http://localhost:3002)
- **Lumina:** [http://localhost:3003](http://localhost:3003)



