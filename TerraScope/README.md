# TerraScope

[English](#english) | [Українська](#українська)

---

<a name="english"></a>
## English

TerraScope is an interactive 3D geospatial intelligence and planetary visualization platform. The application combines a hardware-accelerated WebGL frontend built with Next.js and React Three Fiber with an asynchronous FastAPI backend service providing cached external data feeds, user authentication, and persistent view preset management.

### Architecture Overview

```
                          +------------------------------------------+
                          |             User Browser                 |
                          +------------------------------------------+
                                               |
                                               v
                          +------------------------------------------+
                          |   Next.js 16 / React 19 Frontend App     |
                          |   - React Three Fiber (Three.js WebGL)   |
                          |   - Custom GLSL Earth & Atmosphere       |
                          |   - GPU-Instanced Data Layer Meshes      |
                          |   - Zustand 5 State Management           |
                          +------------------------------------------+
                                               |
                                     HTTP REST API Requests
                                               |
                                               v
                          +------------------------------------------+
                          |      FastAPI Asynchronous Backend        |
                          |   - SlowAPI Rate Limiting (120 req/min)  |
                          |   - X-Request-ID Correlation Middleware  |
                          |   - PyJWT + Bcrypt Authentication        |
                          |   - In-Memory Lock Cache Stampede Shield |
                          +------------------------------------------+
                                  |                      |
                     Async Database Queries       External API Requests
                                  |                      |
                                  v                      v
                       +-------------------+   +--------------------+
                       |  SQLite Database  |   | External Services: |
                       |  (via aiosqlite)  |   | - USGS Earthquakes |
                       |  - users          |   | - OpenSky Flights  |
                       |  - saved_views    |   | - Open-Meteo       |
                       |  - cache_entries  |   | - REST Countries   |
                       +-------------------+   | - NASA NeoWs       |
                                               +--------------------+
```

### Technology Stack

#### Frontend
- **Framework**: Next.js 16 (App Router), React 19
- **3D Graphics & WebGL**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- **Post-Processing**: `@react-three/postprocessing` (Bloom, Vignette)
- **State Management**: Zustand 5
- **Animation & Icons**: Framer Motion, Lucide React
- **Styling**: Vanilla CSS with custom properties and glassmorphism interface tokens

#### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ASGI Server**: Uvicorn
- **Database & ORM**: SQLAlchemy 2.0 (Async), aiosqlite, Alembic (database migrations)
- **HTTP Client**: HTTPX (asynchronous client with connection pooling)
- **Security & Auth**: PyJWT (HS256 Bearer tokens), Passlib / Bcrypt password hashing
- **Rate Limiting**: SlowAPI

### Core Capabilities

#### 1. 3D Globe & Shader Pipeline
- **Custom Earth Shader**: Single-pass GLSL fragment shader combining day satellite imagery, night city illumination, and twilight atmospheric scattering driven by real-time solar terminator coordinates.
- **Surface Display Modes**: Day satellite map, night lights map, dynamic astronomical day/night terminator, and political boundaries.
- **Fresnel Atmosphere**: Outer atmospheric glow mesh rendered using inverted normals and additive blending.
- **GPU Instanced Rendering**: 3D data markers (earthquake columns, aircraft sprites, weather indicators, capital city pins, and orbiting asteroids) utilize `InstancedMesh` to render hundreds of entities in single GPU draw calls.

#### 2. Geospatial Data Layers
- **Earthquakes (USGS)**: 3D extruded columns scaled by magnitude ($M_w$) and color-coded by focal depth (shallow < 70 km, intermediate 70-300 km, deep > 300 km).
- **Live Flights (OpenSky Network)**: Real-time commercial aircraft positions with altitude offsets and heading rotations.
- **Global Weather (Open-Meteo)**: Real-time temperature, wind speed, and meteorological conditions across 70 world capitals.
- **Political Map & Capitals (REST Countries / Natural Earth)**: Vector country borders and 3D architectural markers with demographic metadata.
- **Near-Earth Objects (NASA NeoWs)**: 3D asteroid trajectories and orbital paths with hover-freeze interaction and hazardous classification flags.

#### 3. Backend Caching & Resiliency
- **Cache Stampede Prevention**: Per-key `asyncio.Lock` ensures that concurrent requests for expired cache entries trigger only a single upstream fetch while other requests await the cached result.
- **Database TTL Cache**: API responses are serialized and persisted in the `cache_entries` SQLite table with explicit expiration timestamps.
- **Fallback Datasets**: Pre-configured offline fallback payloads ensure continuous functionality in the event of upstream API rate limits or network failures.

### REST API Specification

#### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account (email, password) | No |
| `POST` | `/api/auth/token` | Authenticate with credentials and receive Bearer JWT token | No |
| `POST` | `/api/auth/refresh` | Refresh active JWT token | Bearer JWT |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile | Bearer JWT |

#### Data Layers (`/api/layers`)
| Method | Endpoint | Description | Cache TTL | Data Source |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/layers/earthquakes` | Real-time seismic events GeoJSON (`?period=today\|7days\|30days`) | 120s / 600s / 1800s | USGS GeoJSON Live Feed API |
| `GET` | `/api/layers/flights` | Live aircraft state vectors | 30 seconds | OpenSky Network API |
| `GET` | `/api/layers/weather` | Global capital weather observations | 900 seconds | Open-Meteo API |
| `GET` | `/api/layers/countries` | Geopolitical country profiles and borders | 86400 seconds | REST Countries v3.1 |
| `GET` | `/api/layers/neo` | Near-Earth asteroid orbital telemetry | 3600 seconds | NASA NeoWs API |

#### Saved Views (`/api/views`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/views/` | List all saved globe views for current user | Bearer JWT |
| `POST` | `/api/views/` | Save a new custom camera and layer preset | Bearer JWT |
| `GET` | `/api/views/{id}` | Retrieve specific saved view by ID | Bearer JWT |
| `DELETE` | `/api/views/{id}` | Delete saved view preset by ID | Bearer JWT |

#### Health & Root (`/`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health status for container orchestration | No |
| `GET` | `/` | API status and links to OpenAPI documentation | No |

### Database Schema

The default storage backend is SQLite (`sql_app.db`) managed via SQLAlchemy 2.0 and Alembic migrations.

- **`users`**:
  - `id` (Integer, Primary Key)
  - `email` (String, Unique, Indexed)
  - `hashed_password` (String)
  - `created_at` (DateTime)

- **`saved_views`**:
  - `id` (Integer, Primary Key)
  - `user_id` (Integer, Foreign Key referencing `users.id` ON DELETE CASCADE)
  - `name` (String)
  - `description` (Text, Nullable)
  - `camera_position` (JSON, Nullable)
  - `camera_target` (JSON, Nullable)
  - `active_layers` (JSON, Nullable)
  - `layer_filters` (JSON, Nullable)
  - `created_at` (DateTime)

- **`cache_entries`**:
  - `id` (Integer, Primary Key)
  - `cache_key` (String, Unique, Indexed)
  - `data` (Text)
  - `expires_at` (DateTime)
  - `created_at` (DateTime)

### Local Development Setup

#### Prerequisites
- Python 3.10+
- Node.js 18.0+ and npm 9.0+
- Git

#### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start Uvicorn development server
uvicorn app.main:app --reload --port 8000
```

Backend endpoints:
- API Base: `http://localhost:8000`
- Swagger UI Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Frontend application:
- Web Interface: `http://localhost:3000`

### Docker Compose Deployment

To build and run the entire stack within isolated Docker containers:

```bash
# Build and run containers in foreground
docker compose up --build

# Run in background (detached mode)
docker compose up -d --build
```

Container networking:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

### Environment Variables

#### Backend Configuration (`backend/.env` or root `.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | `terrascope-super-secret-jwt-key-2026` | Secret key used for signing JWT access tokens |
| `ENV_MODE` | `development` | Deployment mode (`development` or `production`) |
| `DATABASE_URL` | `sqlite+aiosqlite:///./sql_app.db` | SQLAlchemy async connection string |
| `NASA_API_KEY` | `DEMO_KEY` | NASA Open API key for NeoWs queries |
| `PORT` | `8000` | HTTP port for backend server |

#### Frontend Configuration (`frontend/.env.local`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Base URL of the FastAPI backend service |

### Verification & Testing

#### Backend Unit & Integration Tests
The backend test suite uses `pytest`, `pytest-asyncio`, and `httpx.AsyncClient` with an in-memory SQLite database (`sqlite+aiosqlite:///:memory:`).

```bash
cd backend
.\venv\Scripts\python -m pytest
```

#### Frontend Production Build
To verify Next.js bundle compilation and production build:

```bash
cd frontend
npm run build
```

---

<a name="українська"></a>
## Українська

TerraScope — інтерактивна платформа для 3D-візуалізації геопросторових даних та планетарного моніторингу. Застосунок поєднує клієнтську частину на базі Next.js та React Three Fiber з апаратним прискоренням WebGL та асинхронний бекенд-сервіс на FastAPI, що забезпечує кешування зовнішніх потоків даних, автентифікацію користувачів та збереження персональних пресетів перегляду.

### Огляд архітектури

```
                          +------------------------------------------+
                          |            Браузер користувача           |
                          +------------------------------------------+
                                               |
                                               v
                          +------------------------------------------+
                          |    Фронтенд-додаток Next.js 16 / React 19 |
                          |   - React Three Fiber (Three.js WebGL)   |
                          |   - Власні GLSL-шейдери Землі й атмосфери|
                          |   - GPU-інстансинг шарів даних           |
                          |   - Керування станом через Zustand 5     |
                          +------------------------------------------+
                                               |
                                     HTTP REST API запити
                                               |
                                               v
                          +------------------------------------------+
                          |       Асинхронний бекенд FastAPI         |
                          |   - Лімітування SlowAPI (120 зап/хв)     |
                          |   - Middleware кореляції X-Request-ID    |
                          |   - Автентифікація PyJWT + Bcrypt        |
                          |   - Захист від Cache Stampede блокуванням|
                          +------------------------------------------+
                                  |                      |
                     Асинхронні запити до БД     Запити до зовнішніх API
                                  |                      |
                                  v                      v
                       +-------------------+   +--------------------+
                       |    База SQLite    |   | Зовнішні сервіси:  |
                       |  (через aiosqlite)|   | - Землетруси USGS  |
                       |  - users          |   | - Рейси OpenSky    |
                       |  - saved_views    |   | - Open-Meteo       |
                       |  - cache_entries  |   | - REST Countries   |
                       +-------------------+   | - NASA NeoWs       |
                                               +--------------------+
```

### Технологічний стек

#### Фронтенд
- **Фреймворк**: Next.js 16 (App Router), React 19
- **3D-графіка та WebGL**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- **Пост-обробка**: `@react-three/postprocessing` (Bloom, Vignette)
- **Керування станом**: Zustand 5
- **Анімації та іконки**: Framer Motion, Lucide React
- **Стилізація**: Vanilla CSS з користувацькими властивостями та дизайн-токенами glassmorphism

#### Бекенд
- **Фреймворк**: FastAPI (Python 3.10+)
- **ASGI-сервер**: Uvicorn
- **База даних та ORM**: SQLAlchemy 2.0 (Async), aiosqlite, Alembic (міграції бази даних)
- **HTTP-клієнт**: HTTPX (асинхронний клієнт з пулом з'єднань)
- **Безпека та автентифікація**: PyJWT (токени HS256 Bearer), хешування паролів Passlib / Bcrypt
- **Лімітування запитів**: SlowAPI

### Ключові можливості

#### 1. 3D-глобус та шейдерний конвеєр
- **Власний шейдер Землі**: Однопрохідний фрагментний GLSL-шейдер, що поєднує денні супутникові знімки, нічну ілюмінацію міст та сутінкове атмосферне розсіювання на основі реальних координат сонячного термінатора.
- **Режими відображення поверхні**: Денна супутникова карта, карта нічних вогнів, динамічний астрономічний термінатор день/ніч та політичні кордони.
- **Атмосфера Френеля**: Зовнішня сітка атмосферного сяйва, що рендериться за допомогою інвертованих нормалей та адитивного змішування.
- **GPU-інстансинг**: 3D-маркери даних (колони землетрусів, спрайти літаків, індикатори погоди, піни столиць та астероїди) використовують `InstancedMesh` для рендерингу сотень об'єктів за один виклик малювання GPU.

#### 2. Шари геопросторових даних
- **Землетруси (USGS)**: 3D-витягнуті колони, масштабовані за магнітудою ($M_w$) з кодуванням кольором за глибиною осередку (неглибокі < 70 км, проміжні 70-300 км, глибокі > 300 км).
- **Польоти в реальному часі (OpenSky Network)**: Позиції комерційних літаків у реальному часі зі зміщенням висоти та кутом курсу.
- **Глобальна погода (Open-Meteo)**: Температура, швидкість вітру та метеорологічні умови в реальному часі для 70 світових столиць.
- **Політична карта та столиці (REST Countries / Natural Earth)**: Векторні кордони країн та 3D-архітектурні маркери з демографічними метаданими.
- **Навколоземні об'єкти (NASA NeoWs)**: 3D-траєкторії астероїдів та орбітальні шляхи з фіксацією при наведенні курсору та прапорцями потенційної небезпеки.

#### 3. Керування кэшем та відмовостійкість бекенду
- **Захист від Cache Stampede**: `asyncio.Lock` на кожен ключ гарантує, що при одночасних запитах під час вичерпання TTL виконується лише один запит до зовнішнього сервісу, тоді як інші запити очікують результат.
- **TTL-кеш у базі даних**: Відповіді API серіалізуються та зберігаються в таблиці SQLite `cache_entries` з явним часом закінчення дії.
- **Резервні набори даних (Fallbacks)**: Попередньо налаштовані резервні дані забезпечують безперебійну роботу в разі перевищення лімітів або недоступності зовнішніх API.

### Специфікація REST API

#### Автентифікація (`/api/auth`)
| Метод | Ендпоінт | Опис | Потрібна автентифікація |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Реєстрація нового облікового запису (email, пароль) | Ні |
| `POST` | `/api/auth/token` | Автентифікація за обліковими даними та отримання токена Bearer JWT | Ні |
| `POST` | `/api/auth/refresh` | Оновлення активного токена JWT | Bearer JWT |
| `GET` | `/api/auth/me` | Отримання профілю автентифікованого користувача | Bearer JWT |

#### Шари даних (`/api/layers`)
| Метод | Ендпоінт | Опис | TTL кешу | Джерело даних |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/layers/earthquakes` | GeoJSON сейсмічних подій у реальному часі (`?period=today\|7days\|30days`) | 120с / 600с / 1800с | USGS GeoJSON Live Feed API |
| `GET` | `/api/layers/flights` | Вектори стану повітряних суден у реальному часі | 30 секунд | OpenSky Network API |
| `GET` | `/api/layers/weather` | Спостереження за погодою у світових столицях | 900 секунд | Open-Meteo API |
| `GET` | `/api/layers/countries` | Геополітичні профілі країн та кордони | 86400 секунд | REST Countries v3.1 |
| `GET` | `/api/layers/neo` | Орбітальна телеметрія навколоземних астероїдів | 3600 секунд | NASA NeoWs API |

#### Збережені види (`/api/views`)
| Метод | Ендпоінт | Опис | Потрібна автентифікація |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/views/` | Список усіх збережених видів поточного користувача | Bearer JWT |
| `POST` | `/api/views/` | Збереження нового пресету камери та активних шарів | Bearer JWT |
| `GET` | `/api/views/{id}` | Отримання конкретного збереженого виду за ID | Bearer JWT |
| `DELETE` | `/api/views/{id}` | Видалення збереженого виду за ID | Bearer JWT |

#### Стан сервісу та корінь (`/`)
| Метод | Ендпоінт | Опис | Потрібна автентифікація |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Статус працездатності для оркестрації контейнерів | Ні |
| `GET` | `/` | Статус API та посилання на документацію OpenAPI | Ні |

### Схема бази даних

Стандартним сховищем є SQLite (`sql_app.db`), що керується через SQLAlchemy 2.0 та міграції Alembic.

- **`users`**:
  - `id` (Integer, Primary Key)
  - `email` (String, Unique, Indexed)
  - `hashed_password` (String)
  - `created_at` (DateTime)

- **`saved_views`**:
  - `id` (Integer, Primary Key)
  - `user_id` (Integer, Foreign Key, посилання на `users.id` ON DELETE CASCADE)
  - `name` (String)
  - `description` (Text, Nullable)
  - `camera_position` (JSON, Nullable)
  - `camera_target` (JSON, Nullable)
  - `active_layers` (JSON, Nullable)
  - `layer_filters` (JSON, Nullable)
  - `created_at` (DateTime)

- **`cache_entries`**:
  - `id` (Integer, Primary Key)
  - `cache_key` (String, Unique, Indexed)
  - `data` (Text)
  - `expires_at` (DateTime)
  - `created_at` (DateTime)

### Локальне розгортання та налаштування

#### Попередні вимоги
- Python 3.10+
- Node.js 18.0+ та npm 9.0+
- Git

#### 1. Налаштування бекенду

```bash
cd backend

# Створення та активація віртуального оточення
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Встановлення залежностей
pip install -r requirements.txt

# Застосування міграцій бази даних
alembic upgrade head

# Запуск сервера розробки Uvicorn
uvicorn app.main:app --reload --port 8000
```

Ендпоінти бекенду:
- Базовий URL API: `http://localhost:8000`
- Документація Swagger UI: `http://localhost:8000/docs`
- Перевірка стану: `http://localhost:8000/health`

#### 2. Налаштування фронтенду

```bash
cd frontend

# Встановлення залежностей
npm install

# Запуск сервера розробки Next.js
npm run dev
```

Фронтенд-додаток:
- Веб-інтерфейс: `http://localhost:3000`

### Розгортання через Docker Compose

Для збирання та запуску всього стека в ізольованих Docker-контейнерах:

```bash
# Збирання та запуск контейнерів на передньому плані
docker compose up --build

# Запуск у фоновому режимі (detached mode)
docker compose up -d --build
```

Мережа контейнерів:
- Фронтенд: `http://localhost:3000`
- Бекенд API: `http://localhost:8000`

### Змінні оточення

#### Конфігурація бекенду (`backend/.env` або кореневий `.env`)
| Змінна | Значення за замовчуванням | Опис |
| :--- | :--- | :--- |
| `SECRET_KEY` | `terrascope-super-secret-jwt-key-2026` | Секретний ключ для підпису токенів доступу JWT |
| `ENV_MODE` | `development` | Режим розгортання (`development` або `production`) |
| `DATABASE_URL` | `sqlite+aiosqlite:///./sql_app.db` | Рядок асинхронного підключення SQLAlchemy |
| `NASA_API_KEY` | `DEMO_KEY` | Ключ NASA Open API для запитів до NeoWs |
| `PORT` | `8000` | HTTP-порт для сервера бекенду |

#### Конфігурація фронтенду (`frontend/.env.local`)
| Змінна | Значення за замовчуванням | Опис |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Базовий URL сервісу бекенду FastAPI |

### Верифікація та тестування

#### Модульні та інтеграційні тести бекенду
Набір тестів бекенду використовує `pytest`, `pytest-asyncio` та `httpx.AsyncClient` з тестовою базою даних SQLite у пам'яті (`sqlite+aiosqlite:///:memory:`).

```bash
cd backend
.\venv\Scripts\python -m pytest
```

#### Продакшн-збірка фронтенду
Для перевірки компіляції бандла та продакшн-збірки Next.js:

```bash
cd frontend
npm run build
```\n