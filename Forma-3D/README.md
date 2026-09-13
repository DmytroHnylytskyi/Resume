# Forma-3D: 3D Spatial Editor and Architectural Room Configurator

Forma-3D is an asynchronous full-stack 3D interior design and architectural room configurator built with Next.js 16 (App Router), React 19, Three.js (React Three Fiber and React Three Drei), Zustand 5, and FastAPI with asynchronous SQLAlchemy 2.0.

---

## Language Versions / Мовні версії

- [English Version](#english-version)
- [Українська версія](#українська-версія)

---

## English Version

### Overview

Forma-3D is a browser-based 3D scene editor running via WebGL. The application allows users to build architectural layouts, place structures, crypts, and decorative elements from a modular Necropolis catalog of 66 GLB models, customize sub-mesh material colors, switch lighting modes, and persist scene configurations locally and to a cloud database.

---

### Technology Stack

#### Frontend
- **Framework:** Next.js 16 (App Router, Standalone build output)
- **UI Library:** React 19
- **3D Graphics Engine:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **State Management:** Zustand 5
- **Internationalization:** `next-intl` (English and Ukrainian)
- **Color Picker:** `react-colorful`
- **Icons & Animation:** Lucide React, Framer Motion
- **Language & Type Checking:** TypeScript 5 (Strict mode)

#### Backend
- **Framework:** FastAPI 0.115
- **ASGI Server:** Uvicorn
- **ORM:** SQLAlchemy 2.0 (Async)
- **Database Engines:** PostgreSQL 16 (`asyncpg`) in Docker, SQLite (`aiosqlite`) for local development
- **Database Migrations:** Alembic
- **Authentication:** PyJWT (OAuth2 Password Bearer with JWT Access/Refresh tokens), Passlib (bcrypt / pbkdf2_sha256)
- **Rate Limiting:** SlowAPI
- **Validation:** Pydantic v2
- **Testing:** Pytest, pytest-asyncio, httpx

#### Infrastructure
- **Containerization:** Docker multi-stage builds and Docker Compose

---

### Implemented Features

1. **WebGL 3D Rendering and Scene Viewport**
   - React Three Fiber canvas rendering 3D geometries, materials, and lighting.
   - Dual lighting presets: Day (directional sunlight and ambient fill) and Night (cool ambient light with point light sources).
   - Adaptive pixel ratio (`AdaptiveDpr`) and GPU resource disposal upon object removal.

2. **Camera Navigation**
   - **Orbit Mode:** Left-click drag to rotate around scene center, mouse wheel to zoom, middle/right click drag to pan.
   - **Fly Navigation:** Hold Right Mouse Button (RMB) + WASD for free-look flight through the scene.
   - **Vertical Movement & Speed Boost:** Q to descend, E to ascend, hold Shift for 2x movement speed.
   - **Camera Focus (F):** Frame and center camera view on the bounding box of the currently selected object.

3. **3D Asset Library and Geometry Normalization**
   - 66 modular Necropolis GLB 3D assets: Crypts, stone arches, pillars, floor tiles, open and closed coffins, tombstones, fences, gates, dead trees, autumn pines, lanterns, candles, pumpkins, skulls, skeletons, and statues.
   - Real-time catalog text search and fast filtering.
   - 3D Inspector preview box for hovering over catalog assets with live auto-rotation.
   - Centralized geometry normalizer (`normalizeModelGeometry`): centers models on horizontal axes (X/Z), aligns model base flush to ground level (Y=0), and preserves clean metric scaling.



4. **Surface Snapping and Object Placement**
   - Placement ghost preview with wireframe indicator.
   - Surface raycasting engine detects top surface heights ($Y = \text{height}$) of tables, desks, walls, and roofs, allowing objects to be stacked on top of each other.
   - Optional magnet grid snapping (0.5m grid increments).
   - Ghost rotation via R key (+90 degrees) before confirming placement with left-click.

5. **Transform Controls and Material Customization**
   - TransformControls gizmo supporting Translate (1), Rotate (2), and Scale (3) modes.
   - Quick rotation buttons (-90 deg, -45 deg, +45 deg, +90 deg, 180 deg) and preset scale multipliers (0.5x to 2.0x).
   - Duplicate selected object (`Ctrl + D` / `Cmd + D`) directly into placement ghost mode.
   - Sub-mesh color picker (`react-colorful`) enabling real-time material recoloring for individual parts of placed 3D models.

6. **State Management and Persistence**
   - Centralized Zustand store managing scene objects, transforms, selections, lighting, and auth state.
   - Client-side localization switching between English and Ukrainian without WebGL canvas remounting.
   - Local storage auto-save and restore.
   - Scene JSON export (file download) and JSON import (file upload).
   - Cloud project storage: save, retrieve, update, and delete 3D scene configurations via REST API.

7. **Backend Security and API Architecture**
   - Asynchronous non-blocking database queries with SQLAlchemy 2.0 and async drivers.
   - User registration and login with bcrypt password hashing.
   - JWT access token generation and refresh token rotation (`/refresh`).
   - User-isolated cloud project access controls.
   - Rate limiting middleware with SlowAPI.
   - Correlation ID middleware (`X-Request-ID`) attached to every request and response.

---

### Project Structure

```
.
├── backend/
│   ├── alembic/                   # Database migrations environment
│   │   ├── versions/              # Migration revision scripts
│   │   └── env.py                 # Alembic configuration
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py            # Registration, login, token refresh, profile
│   │   │   └── projects.py        # 3D project CRUD routes
│   │   ├── auth.py                # JWT utilities and password cryptography
│   │   ├── database.py            # SQLAlchemy async engine and session factory
│   │   ├── main.py                # FastAPI app initialization and middleware
│   │   ├── models.py              # SQLAlchemy database models (User, Project)
│   │   └── schemas.py             # Pydantic v2 request/response schemas
│   ├── tests/
│   │   ├── conftest.py            # In-memory SQLite async test fixtures
│   │   ├── test_auth.py           # Auth and health check integration tests
│   │   └── test_projects.py       # Projects CRUD and isolation tests
│   ├── alembic.ini                # Alembic migration configuration
│   ├── Dockerfile                 # Backend container definition
│   ├── pytest.ini                # Pytest configuration
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── messages/                  # Localization dictionaries (en.json, uk.json)
│   ├── public/
│   │   └── model/                 # GLB 3D model assets
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── layout.tsx     # Root localized layout
│   │   │   │   └── page.tsx       # Main 3D editor viewport and UI overlay
│   │   │   └── globals.css        # UI styling
│   │   ├── components/            # React and Three.js components
│   │   │   ├── AuthModal.tsx
│   │   │   ├── CameraNavigationController.tsx
│   │   │   ├── ClientI18nProvider.tsx
│   │   │   ├── ColorPicker.tsx
│   │   │   ├── FurnitureCard.tsx
│   │   │   ├── FurnitureCatalog.tsx
│   │   │   ├── InstructionModal.tsx
│   │   │   ├── InteractivePlacementGhost.tsx
│   │   │   ├── MobileNoticeModal.tsx
│   │   │   ├── PlaceableObject.tsx
│   │   │   ├── SceneViewport.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── TransformToolbar.tsx
│   │   │   └── UserProfileModal.tsx
│   │   ├── data/
│   │   │   └── catalogData.ts     # 66 asset catalog items and categories
│   │   ├── hooks/
│   │   │   └── useHotkeys.ts      # Global keyboard shortcuts listener
│   │   ├── store/
│   │   │   └── useStore.ts        # Zustand global state store
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript interfaces and type definitions
│   │   ├── utils/
│   │   │   └── modelNormalization.ts # 3D geometry centering and scaling engine
│   │   ├── config.ts              # API URL configuration
│   │   ├── i18n.ts                # Server-side next-intl setup
│   │   └── proxy.ts               # Localized routing proxy middleware
│   ├── Dockerfile                 # Frontend multi-stage standalone container
│   ├── next.config.mjs            # Next.js configuration
│   ├── package.json               # Node.js dependencies and scripts
│   └── tsconfig.json              # TypeScript strict configuration
├── docker-compose.yml             # Multi-container Docker composition
└── README.md
```

> **Deployment note:** `frontend/backend_app/` is a deployment-time fork of
> `backend/app/` used by `frontend/Procfile` to run the FastAPI API and
> `next start` inside a single container/dyno (`frontend/requirements.txt`
> holds its Python dependencies). Keep the copy in sync with `backend/app/`;
> only `main.py` intentionally differs (it additionally mounts the routers
> under the `/api` prefix).

---

### Running with Docker Compose

Run PostgreSQL, FastAPI backend, and Next.js frontend together:

```bash
docker compose up --build -d
```

- **Frontend:** http://localhost:3000
- **Backend API Documentation (Swagger UI):** http://localhost:8000/docs
- **Health Check Endpoint:** http://localhost:8000/health

To stop containers:
```bash
docker compose down
```

---

### Local Development Setup

#### 1. Backend Setup

Prerequisites: Python 3.13+

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (creates SQLite database sql_app.db by default)
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup

Prerequisites: Node.js 20+

```bash
cd frontend

# Install packages
npm install

# Start development server
npm run dev
```

---

### Automated Testing

#### Backend Tests (Pytest + AsyncIO)

```bash
cd backend
.\venv\Scripts\pytest -v
```

11 backend integration tests covering:
- Health check and discovery endpoints (`GET /health`, `GET /`)
- User registration and duplicate email protection
- OAuth2 password login and invalid credential handling
- JWT refresh token rotation
- Authenticated user profile retrieval
- 3D project creation, retrieval, update, and deletion
- Unauthorized access prevention and user data isolation

#### Frontend Type Checking & Production Build

```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

### REST API Endpoints Reference

#### System
- `GET /health` — Service health check.
- `GET /` — Service discovery endpoint with API documentation links.

#### Authentication (`/`)
- `POST /register` — Register a new user (`email`, `name`, `password`). Returns `201 Created`.
- `POST /token` — OAuth2 password grant login (`username` [email], `password`). Returns access and refresh JWT tokens.
- `POST /refresh` — Issue a new access token using a valid `refresh_token`.
- `GET /users/me/` — Retrieve the profile and saved project list of the authenticated user (`Authorization: Bearer <token>`).

#### 3D Scene Projects (`/projects/`)
- `GET /projects/` — Retrieve all projects owned by the authenticated user, sorted by update date descending.
- `POST /projects/` — Save a new 3D project configuration (`name`, `data` JSON payload). Returns `201 Created`.
- `GET /projects/{project_id}` — Retrieve single project details by ID.
- `PUT /projects/{project_id}` — Update project title or scene JSON data.
- `DELETE /projects/{project_id}` — Delete a saved project. Returns `204 No Content`.

---

### Keyboard Shortcuts and Controls

| Input | Action |
| :--- | :--- |
| **Left Mouse Button Drag** | Orbit camera around scene center |
| **Right Mouse Button + WASD** | Fly navigation (Forward, Left, Backward, Right) |
| **Q / E** | Vertical descent (Q) / ascent (E) |
| **Shift (Hold)** | 2x flight speed multiplier |
| **F** | Focus camera view onto selected 3D object |
| **1** | Set TransformControls to Translate mode |
| **2** | Set TransformControls to Rotate mode |
| **3** | Set TransformControls to Scale mode |
| **R** | Rotate selected object or placement ghost +90 degrees around Y-axis |
| **Ctrl + D / Cmd + D** | Duplicate selected object into placement ghost mode |
| **Delete / Backspace** | Remove selected object from scene |
| **Escape** | Clear selection / Cancel placement mode |

---

<br />

---

## Українська версія

### Огляд Проєкту

Forma-3D — це асинхронний фулстек 3D-редактор простору та архітектурний конфігуратор, розроблений на базі Next.js 16 (App Router), React 19, Three.js (React Three Fiber та React Three Drei), Zustand 5 та FastAPI з асинхронним SQLAlchemy 2.0.

Додаток працює безпосередньо у браузері через WebGL. Користувачі можуть конструювати архітектурні структури, розміщувати модульні елементи, склепи, могили, паркани та декор з каталогу «Некрополь» на 66 GLB моделей, налаштовувати матеріали деталей у реальному часі, керувати режимами освітлення та зберігати сцени у хмарній базі даних.

---

### Стек Технологій

#### Фронтенд
- **Фреймворк:** Next.js 16 (App Router, режим збірки Standalone)
- **UI Бібліотека:** React 19
- **3D Графічний Рушій:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **Керування Станом:** Zustand 5
- **Інтернаціоналізація:** `next-intl` (Англійська та Українська мови)
- **Палітра Кольору:** `react-colorful`
- **Іконки та Анімація:** Lucide React, Framer Motion
- **Типізація:** TypeScript 5 (Строгий режим `strict: true`)

#### Бекенд
- **Фреймворк:** FastAPI 0.115
- **ASGI Сервер:** Uvicorn
- **ORM:** SQLAlchemy 2.0 (Асинхронний режим)
- **Бази Даних:** PostgreSQL 16 (`asyncpg`) у Docker, SQLite (`aiosqlite`) для локальної розробки
- **Міграції Схеми БД:** Alembic
- **Автентифікація та Безпека:** PyJWT (OAuth2 Password Bearer з JWT Access/Refresh токенами), Passlib (хешування bcrypt / pbkdf2_sha256)
- **Обмеження Запитів:** SlowAPI
- **Валідація Даних:** Pydantic v2
- **Тестування:** Pytest, pytest-asyncio, httpx

#### Інфраструктура
- **Контейнеризація:** Docker багатоетапні збірки (multi-stage) та Docker Compose

---

### Реалізований Функціонал

1. **3D WebGL Рендеринг та Вікно Перегляду**
   - Рендеринг на базі React Three Fiber ізольований від оновлень 2D DOM стану для підтримання стабільної частоти кадрів.
   - Два режими освітлення: День (спрямоване сонячне та розсіяне світло) і Ніч (прохолодне середовище з динамічними точковими джерелами світла).
   - Автоматичне звільнення пам'яті GPU (`dispose`) при видаленні об'єктів.

2. **Навігація Камерою**
   - **Режим Orbit:** Обертання сцени затисканням лівої кнопки миші (ЛКМ), масштабування коліщатком миші, панорамування середньою або правою кнопкою.
   - **Режим Fly:** Вільний політ у просторі при затисканні Правої Кнопки Миші (ПКМ) + WASD.
   - **Висота та Прискорення:** Q — спуск донизу, E — підйом угору, затискання Shift — подвоєння швидкості польоту.
   - **Фокусування на Об'єкті (F):** Центрування камери на габаритах виділеного об'єкта.

3. **Каталог 3D-Моделей та Нормалізація Геометрії**
   - 66 модульних GLB моделей пака «Некрополь»: склепи, кам'яні арки, колони, плитка підлоги, відкриті та закриті саркофаги, надгробки, паркани, брами, сухі дерева, осінні сосни, ліхтарі, свічки, гарбузи, черепи, скелети та статуї.
   - Пошук за назвою у реальному часі.
   - 3D Інспектор попереднього перегляду моделі при наведенні курсору на картку каталогу.
   - Модуль нормалізації геометрії (`normalizeModelGeometry`): центрування відносно осей X/Z, точна посадка на рівень підлоги (Y=0) та чисте метричне масштабування.

4. **Автоматична Посадка на Поверхні (Surface Snapping)**
   - Прозорий примарний об'єкт із зеленим контуром для позиціювання перед встановленням.
   - Рейкастинг обчислює висоту верхньої площини ($Y = \text{height}$) столів, полиць, стін і дахів для розміщення предметів один на одного.
   - Опціональна магнітна сітка з кроком 0.5 м.
   - Поворот примарного об'єкта клавішею R (+90 градусів) перед підтвердженням розміщення кліком ЛКМ.

5. **Гізмо Трансформацій та Кастомізація Матеріалів**
   - Візуальне гізмо TransformControls: Переміщення (1), Обертання (2), Масштабування (3).
   - Швидкі кути повороту (-90, -45, +45, +90, 180 градусів) та пресети масштабу (від 0.5x до 2.0x).
   - Дублювання виділеного об'єкта (`Ctrl + D` / `Cmd + D`) з автоматичним переходом у режим розміщення.
   - Зміна кольору окремих деталей моделей за допомогою `react-colorful`.

6. **Керування Станом та Збереження Даних**
   - Централізований Zustand стор для керування об'єктами, виділенням, трансформуванням та сесією користувача.
   - Клієнтське перемикання мови інтерфейсу (EN/UK) без перезавантаження WebGL Canvas.
   - Збереження та відновлення сцени у LocalStorage браузера.
   - Експорт та імпорт конфігурації сцени у форматі JSON.
   - Хмарне збереження проєктів через REST API бекенду.

7. **Безпека та Архітектура Бекенду**
   - Асинхронний неблокуючий I/O з SQLAlchemy 2.0.
   - Реєстрація та авторизація з хешуванням паролів (bcrypt).
   - Генерація JWT токенів та їх ротація (`/refresh`).
   - Ізоляція доступу до проєктів між користувачами.
   - Захист від підбору паролів через SlowAPI rate limiter.
   - Трасування запитів за допомогою заголовка `X-Request-ID`.

---

### Запуск через Docker Compose

Запуск повного стека додатку (PostgreSQL, FastAPI бекенд та Next.js фронтенд):

```bash
docker compose up --build -d
```

- **Фронтенд:** http://localhost:3000
- **Документація API (Swagger UI):** http://localhost:8000/docs
- **Перевірка стану (Health Check):** http://localhost:8000/health

Зупинка контейнерів:
```bash
docker compose down
```

---

### Локальне Розгортання

#### 1. Бекенд (FastAPI)

```bash
cd backend

# Створення та активація віртуального середовища
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Встановлення залежностей
pip install -r requirements.txt

# Застосування міграцій бази даних
alembic upgrade head

# Запуск сервера
uvicorn app.main:app --reload --port 8000
```

#### 2. Фронтенд (Next.js)

```bash
cd frontend

# Встановлення пакетів
npm install

# Запуск dev-сервера
npm run dev
```

---

### Автоматизоване Тестування

#### Тестування Бекенду (Pytest)

```bash
cd backend
.\venv\Scripts\pytest -v
```

#### Перевірка Типів та Збірка Фронтенду

```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

### Специфікація REST API Ендпоїнтів

#### Системні
- `GET /health` — Перевірка стану працездатності сервісу.
- `GET /` — Кореневий ендпоїнт із посиланнями на документацію.

#### Автентифікація
- `POST /register` — Реєстрація нового користувача (`email`, `name`, `password`). Код відповіді `201 Created`.
- `POST /token` — Вхід за схемою OAuth2 Password Grant (`username` [email], `password`). Повертає `access_token` та `refresh_token`.
- `POST /refresh` — Оновлення access токена за допомогою валідного `refresh_token`.
- `GET /users/me/` — Отримання профілю та списку збережених проєктів автентифікованого користувача (`Authorization: Bearer <token>`).


#### Хмарні 3D-Проєкти (`/projects/`)
- `GET /projects/` — Отримання всіх збережених проєктів поточного користувача.
- `POST /projects/` — Створення нового проєкту (`name`, `data` JSON рядок). Код відповіді `201 Created`.
- `GET /projects/{project_id}` — Отримання проєкту за ID.
- `PUT /projects/{project_id}` — Оновлення назви або JSON даних сцени проєкту.
- `DELETE /projects/{project_id}` — Видалення проєкту. Код відповіді `204 No Content`.

---

### Гарячі Клавіші та Керування

| Клавіша / Дія | Призначення |
| :--- | :--- |
| **Затискання ЛКМ** | Обертання камери навколо центру сцени |
| **ПКМ + WASD** | Політ камерою у просторі (Вперед, Вліво, Назад, Вправо) |
| **Q / E** | Спуск донизу (Q) / Підйом угору (E) |
| **Shift (Затискання)** | Прискорення польоту камери у 2 рази |
| **F** | Фокусування та центрування камери на виділеному об'єкті |
| **1 / 2 / 3** | Вибір режиму гізмо: Переміщення (1), Обертання (2), Масштабування (3) |
| **R** | Поворот виділеного об'єкта або примарної моделі на +90 градусів |
| **Ctrl + D / Cmd + D** | Дублювання виділеного об'єкта з переходом у режим розміщення |
| **Delete / Backspace** | Видалення виділеного об'єкта зі сцени |
| **Escape** | Скидання виділення / Скасування режиму розміщення |
