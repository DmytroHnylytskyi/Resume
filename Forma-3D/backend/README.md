# Forma-3D: Backend API Specification and Developer Guide

Asynchronous FastAPI backend application providing user authentication, JWT authorization, and cloud 3D scene project storage.

---

## Languages / Мови

- [English Version](#english-version)
- [Українська версія](#українська-версія)

---

## English Version

### Technology Stack

- **FastAPI 0.115:** Asynchronous web framework with automatic OpenAPI and Swagger UI documentation generation.
- **SQLAlchemy 2.0:** Object-Relational Mapping (ORM) with full async engine and session management.
- **PostgreSQL 16 / SQLite:** Dual database support via `asyncpg` (PostgreSQL) and `aiosqlite` (SQLite).
- **Alembic:** Database schema migration management.
- **PyJWT & Passlib:** OAuth2 Password Bearer authentication with JWT token generation and bcrypt / pbkdf2_sha256 password hashing.
- **SlowAPI:** In-memory rate limiting to prevent brute-force authentication attacks.
- **Pydantic v2:** Strict request validation and serialization schemas.
- **Pytest & Pytest-AsyncIO:** Automated integration test suite.

---

### Directory Structure (`backend/`)

```
backend/
├── alembic/                      # Alembic database migration environment
│   ├── versions/                 # Migration revision scripts
│   └── env.py                    # Alembic environment config
├── app/
│   ├── routers/
│   │   ├── auth.py               # Registration, login, token refresh, profile routes
│   │   └── projects.py           # 3D scene project CRUD routes
│   ├── auth.py                   # Password cryptography and JWT token dependencies
│   ├── database.py               # Async engine and sessionmaker factory
│   ├── main.py                   # FastAPI application initialization and middleware
│   ├── models.py                 # SQLAlchemy ORM models (User, Project)
│   └── schemas.py                # Pydantic v2 validation schemas
├── tests/
│   ├── conftest.py               # In-memory SQLite async test fixtures
│   ├── test_auth.py              # Authentication integration test suite
│   └── test_projects.py          # 3D projects CRUD test suite
├── alembic.ini                   # Alembic configuration
├── Dockerfile                    # Backend container specification
├── pytest.ini                    # Pytest configuration
└── requirements.txt              # Python package dependencies
```

---

### Local Execution and Setup

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

Interactive Swagger UI documentation is available at: http://localhost:8000/docs

---

### REST API Endpoints Specification

#### 1. System Endpoints
- `GET /health`: Service health check. Returns `{"status": "ok", "service": "forma-3d-api", "version": "2.0.0"}`.
- `GET /`: Root discovery endpoint with documentation links.

#### 2. Authentication & User Profile
- `POST /register`: Register a new user (`email`, `name`, `password`). Returns `201 Created`.
- `POST /token`: User login via OAuth2 Password Grant (`username` [email], `password`). Returns `access_token` and `refresh_token`.
- `POST /refresh`: Rotate expired access token using a valid `refresh_token`.
- `GET /users/me/`: Retrieve authenticated user profile and list of saved projects (`Header: Authorization: Bearer <token>`).

#### 3. Cloud 3D Scene Projects (`/projects/`)
- `GET /projects/`: Retrieve all projects belonging to the authenticated user, ordered by last update date descending.
- `POST /projects/`: Create a new 3D scene project (`name`, `data` JSON payload). Returns `201 Created`.
- `GET /projects/{project_id}`: Retrieve full details of a specific project by ID.
- `PUT /projects/{project_id}`: Update project title or scene JSON data payload.
- `DELETE /projects/{project_id}`: Permanently delete a project by ID. Returns `204 No Content`.

---

### Running Tests

```bash
cd backend
.\venv\Scripts\pytest -v
```

---

<br />

---

## Українська версія

### Стек Технологій Бекенду

- **FastAPI 0.115:** Асинхронний веб-фреймворк з автоматичною генерацією Swagger UI та OpenAPI специфікації.
- **SQLAlchemy 2.0:** Реляційна ORM з підтримкою асинхронних сесій.
- **PostgreSQL 16 / SQLite:** Підтримка PostgreSQL (`asyncpg`) та SQLite (`aiosqlite`).
- **Alembic:** Управління міграціями структури бази даних.
- **PyJWT & Passlib:** Авторизація за стандартом OAuth2 з Bearer JWT токенами та хешуванням паролів (bcrypt / pbkdf2_sha256).
- **SlowAPI:** Обмеження кількості запитів для захисту від підбору паролів.
- **Pydantic v2:** Валідація вхідних і вихідних даних.
- **Pytest:** Асинхронні інтеграційні тести API.

---

### Запуск та Розробка

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

Документація Swagger UI доступна за адресою: http://localhost:8000/docs

---

### Ендпоінти REST API

#### 1. Системні
- `GET /health` — Перевірка працездатності сервісу.
- `GET /` — Кореневий ендпоінт із посиланнями на документацію.

#### 2. Автентифікація
- `POST /register` — Реєстрація користувача (`email`, `name`, `password`).
- `POST /token` — Вхід за схемою OAuth2 Password Grant (`username`, `password`).
- `POST /refresh` — Ротація JWT токенів через `refresh_token`.
- `GET /users/me/` — Отримання профілю та списку проєктів авторизованого користувача (`Authorization: Bearer <token>`).

#### 3. 3D-Проєкти (`/projects/`)
- `GET /projects/` — Список проєктів поточного користувача.
- `POST /projects/` — Створення нового проєкту (`name`, `data` JSON).
- `GET /projects/{project_id}` — Отримання проєкту за ID.
- `PUT /projects/{project_id}` — Оновлення назви або сцени проєкту.
- `DELETE /projects/{project_id}` — Видалення проєкту.

