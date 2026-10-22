# Lumina Backend

[English](#english) | [Українська](#українська)

---

<a name="english"></a>
## English

Asynchronous FastAPI backend for Lumina, providing JWT authentication with refresh-token rotation, role-based access control, course and lesson management, homework submissions, teacher workflows, analytics, and Cloudinary/local file uploads.

### Technology Stack

- **Framework:** FastAPI (Python 3.13 in Docker)
- **ASGI Server:** Uvicorn
- **Database & ORM:** SQLAlchemy 2.0 (Async) with SQLite (`aiosqlite`) as the default and PostgreSQL (`asyncpg`) supported via `DATABASE_URL`
- **Migrations:** Alembic
- **Authentication:** JWT access and refresh tokens (`python-jose`), bcrypt password hashing
- **Validation:** Pydantic v2
- **Rate Limiting:** SlowAPI (200 requests/minute)
- **File Storage:** Cloudinary when `CLOUDINARY_URL` is set, otherwise local `uploads/`
- **Testing:** Pytest, pytest-asyncio, HTTPX

### Project Structure

```text
backend/
├── alembic/                    # Migration environment and revisions
├── app/
│   ├── routers/
│   │   ├── auth.py             # Registration, login, refresh, profile
│   │   ├── courses.py          # Courses, lessons, homework, uploads
│   │   ├── teacher.py          # Students, assignments, submissions
│   │   └── analytics.py        # Student and teacher analytics
│   ├── auth_utils.py           # JWT creation/validation and password hashing
│   ├── database.py             # Async engine and session factory
│   ├── main.py                 # FastAPI app, CORS, rate limit, health
│   ├── models.py               # SQLAlchemy ORM models
│   └── schemas.py              # Pydantic request/response schemas
├── tests/
│   ├── conftest.py             # In-memory SQLite fixtures and auth clients
│   ├── test_auth.py
│   ├── test_courses.py
│   └── test_teacher.py
├── alembic.ini
├── Dockerfile
├── pytest.ini
└── requirements.txt
```

### Local Setup

Prerequisites: Python 3.13+

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Start the API
uvicorn app.main:app --reload --port 8000
```

- API base: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Environment Variables

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `SECRET_KEY` | Yes — the server refuses to start without it | — | Signs JWT access tokens |
| `REFRESH_SECRET_KEY` | Yes — the server refuses to start without it | — | Signs JWT refresh tokens |
| `DATABASE_URL` | No | `sqlite:///./sql_app.db` | SQLAlchemy URL; PostgreSQL is converted to `postgresql+asyncpg://` automatically |
| `FRONTEND_URL` | No | `http://localhost:5173,http://localhost:3000,https://lumina-five-rose.vercel.app` | Comma-separated CORS origins |
| `CLOUDINARY_URL` | No | — | Enables Cloudinary uploads; without it files go to local `uploads/` |
| `API_URL` | No | `http://localhost:8000` | Public base URL used for local upload links |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Access-token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Refresh-token lifetime |

Generate a key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### REST API Endpoints

#### System

- `GET /health` — service health and version.
- `GET /` — service discovery with a link to the docs.

#### Authentication (`/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Authenticate and receive access/refresh tokens |
| `POST` | `/auth/refresh` | Rotate the refresh token and issue a new access token |
| `GET` | `/auth/me` | Current user profile |

#### Courses (`/courses`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/courses/` | List courses accessible to the current user |
| `GET` | `/courses/my-progress` | Student progress and study schedules |
| `GET` | `/courses/{course_id}` | Course with lessons |
| `POST` | `/courses/upload` | Upload media to Cloudinary or local storage |
| `POST` | `/courses/` | Create a course |
| `POST` | `/courses/{course_id}/schedule` | Schedule a study session |
| `POST` | `/courses/lessons/{lesson_id}/complete` | Mark a lesson complete/incomplete |
| `DELETE` | `/courses/{course_id}` | Delete an authored course |
| `PUT` | `/courses/{course_id}` | Update a course and its lessons |
| `POST` | `/courses/lessons/{lesson_id}/submit` | Submit homework |
| `GET` | `/courses/lessons/{lesson_id}/my-submission` | Latest submission for a lesson |

#### Teacher (`/teacher`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/teacher/students` | Teacher's student roster |
| `POST` | `/teacher/students` | Add a student |
| `DELETE` | `/teacher/students/{student_id}` | Remove a student |
| `POST` | `/teacher/assign` | Assign a course to a student |
| `GET` | `/teacher/assignments` | Active assignments |
| `POST` | `/teacher/toggle-role` | Toggle student/teacher role |
| `GET` | `/teacher/library` | Teacher's authored courses |
| `GET` | `/teacher/assignable-courses` | Courses available to assign |
| `POST` | `/teacher/custom-lesson` | Create a one-on-one course |
| `GET` | `/teacher/submissions` | Review homework submissions |

#### Analytics (`/analytics`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/analytics/user` | Student progress analytics |
| `GET` | `/analytics/teacher` | Teacher management analytics |

### Database Schema

- `users`, `teacher_students`, `course_assignments`, `assignment_deadlines`
- `courses`, `lessons`, `homework_submissions`, `progress`, `course_schedules`

The schema is managed by Alembic; `Base.metadata.create_all` also runs at startup for local SQLite development.

### Testing

```bash
cd backend
.\venv\Scripts\python -m pytest -v
```

The suite contains 10 integration tests covering health, registration/login, refresh rotation, profile access, course creation/retrieval, file-upload validation, and teacher assignments.

### Docker

From the `Lumina/` directory:

```bash
docker compose up --build -d
```

- Backend: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

> **Deployment note:** `frontend/app/` is a deployment-time fork of `backend/app/`
> used by `frontend/Procfile` to run the API and serve the built SPA from one dyno.
> Its `main.py` additionally mounts every router under `/api` and serves `frontend/dist/`.
> Keep the fork in sync with `backend/app/`.

---

<a name="українська"></a>
## Українська

Асинхронний бекенд Lumina на FastAPI: JWT-автентифікація з ротацією refresh-токенів, рольовий доступ, керування курсами й уроками, здача домашніх завдань, робота викладача, аналітика та завантаження файлів у Cloudinary або локальне сховище.

### Стек Технологій

- **Фреймворк:** FastAPI (Python 3.13 у Docker)
- **ASGI-сервер:** Uvicorn
- **База даних та ORM:** SQLAlchemy 2.0 (Async) зі SQLite (`aiosqlite`) за замовчуванням і підтримкою PostgreSQL (`asyncpg`) через `DATABASE_URL`
- **Міграції:** Alembic
- **Автентифікація:** JWT access і refresh токени (`python-jose`), хешування паролів bcrypt
- **Валідація:** Pydantic v2
- **Обмеження запитів:** SlowAPI (200 запитів/хвилину)
- **Файли:** Cloudinary, якщо задано `CLOUDINARY_URL`, інакше локальна тека `uploads/`
- **Тестування:** Pytest, pytest-asyncio, HTTPX

### Структура Проєкту

```text
backend/
├── alembic/                    # Середовище міграцій і ревізії
├── app/
│   ├── routers/
│   │   ├── auth.py             # Реєстрація, вхід, refresh, профіль
│   │   ├── courses.py          # Курси, уроки, домашні завдання, завантаження
│   │   ├── teacher.py          # Студенти, призначення, здачі
│   │   └── analytics.py        # Аналітика студента й викладача
│   ├── auth_utils.py           # Створення/перевірка JWT і хешування паролів
│   ├── database.py             # Асинхронний engine і фабрика сесій
│   ├── main.py                 # FastAPI, CORS, rate limit, health
│   ├── models.py               # ORM-моделі SQLAlchemy
│   └── schemas.py              # Pydantic-схеми запитів/відповідей
├── tests/
│   ├── conftest.py             # Фікстури in-memory SQLite та авторизовані клієнти
│   ├── test_auth.py
│   ├── test_courses.py
│   └── test_teacher.py
├── alembic.ini
├── Dockerfile
├── pytest.ini
└── requirements.txt
```

### Локальний Запуск

Попередні вимоги: Python 3.13+

```bash
cd backend

# Створення та активація віртуального оточення
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Встановлення залежностей
pip install -r requirements.txt

# Застосування міграцій
alembic upgrade head

# Запуск API
uvicorn app.main:app --reload --port 8000
```

- Базовий URL: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Змінні Оточення

| Змінна | Обов'язкова | За замовчуванням | Опис |
| :--- | :--- | :--- | :--- |
| `SECRET_KEY` | Так — сервер не стартує без неї | — | Підпис JWT access-токенів |
| `REFRESH_SECRET_KEY` | Так — сервер не стартує без неї | — | Підпис JWT refresh-токенів |
| `DATABASE_URL` | Ні | `sqlite:///./sql_app.db` | URL SQLAlchemy; PostgreSQL автоматично конвертується в `postgresql+asyncpg://` |
| `FRONTEND_URL` | Ні | `http://localhost:5173,http://localhost:3000,https://lumina-five-rose.vercel.app` | CORS-оригіни через кому |
| `CLOUDINARY_URL` | Ні | — | Вмикає Cloudinary; без неї файли йдуть у локальну `uploads/` |
| `API_URL` | Ні | `http://localhost:8000` | Публічний URL для локальних посилань на файли |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Ні | `60` | Час життя access-токена |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Ні | `7` | Час життя refresh-токена |

Згенерувати ключ:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### REST API

#### Системні

- `GET /health` — стан сервісу та версія.
- `GET /` — виявлення сервісу з посиланням на документацію.

#### Автентифікація (`/auth`)

| Метод | Ендпоінт | Опис |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Реєстрація користувача |
| `POST` | `/auth/login` | Вхід і видача access/refresh токенів |
| `POST` | `/auth/refresh` | Ротація refresh-токена та новий access-токен |
| `GET` | `/auth/me` | Профіль поточного користувача |

#### Курси (`/courses`)

| Метод | Ендпоінт | Опис |
| :--- | :--- | :--- |
| `GET` | `/courses/` | Курси, доступні поточному користувачу |
| `GET` | `/courses/my-progress` | Прогрес студента та розклад занять |
| `GET` | `/courses/{course_id}` | Курс з уроками |
| `POST` | `/courses/upload` | Завантаження медіа в Cloudinary або локально |
| `POST` | `/courses/` | Створення курсу |
| `POST` | `/courses/{course_id}/schedule` | Планування заняття |
| `POST` | `/courses/lessons/{lesson_id}/complete` | Позначити урок завершеним/незавершеним |
| `DELETE` | `/courses/{course_id}` | Видалення власного курсу |
| `PUT` | `/courses/{course_id}` | Оновлення курсу та уроків |
| `POST` | `/courses/lessons/{lesson_id}/submit` | Здача домашнього завдання |
| `GET` | `/courses/lessons/{lesson_id}/my-submission` | Остання здача для уроку |

#### Викладач (`/teacher`)

| Метод | Ендпоінт | Опис |
| :--- | :--- | :--- |
| `GET` | `/teacher/students` | Список студентів викладача |
| `POST` | `/teacher/students` | Додати студента |
| `DELETE` | `/teacher/students/{student_id}` | Видалити студента |
| `POST` | `/teacher/assign` | Призначити курс студенту |
| `GET` | `/teacher/assignments` | Активні призначення |
| `POST` | `/teacher/toggle-role` | Перемкнути роль студент/викладач |
| `GET` | `/teacher/library` | Власні курси викладача |
| `GET` | `/teacher/assignable-courses` | Курси, доступні для призначення |
| `POST` | `/teacher/custom-lesson` | Створити індивідуальний курс |
| `GET` | `/teacher/submissions` | Перегляд здач домашніх завдань |

#### Аналітика (`/analytics`)

| Метод | Ендпоінт | Опис |
| :--- | :--- | :--- |
| `GET` | `/analytics/user` | Аналітика прогресу студента |
| `GET` | `/analytics/teacher` | Аналітика керування для викладача |

### Схема Бази Даних

- `users`, `teacher_students`, `course_assignments`, `assignment_deadlines`
- `courses`, `lessons`, `homework_submissions`, `progress`, `course_schedules`

Схемою керує Alembic; для локальної SQLite на старті також виконується `Base.metadata.create_all`.

### Тестування

```bash
cd backend
.\venv\Scripts\python -m pytest -v
```

Набір містить 10 інтеграційних тестів: health, реєстрація/вхід, ротація refresh, профіль, створення/отримання курсу, валідація завантаження файлів і призначення викладача.

### Docker

З директорії `Lumina/`:

```bash
docker compose up --build -d
```

- Бекенд: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

> **Примітка щодо розгортання:** `frontend/app/` — це копія `backend/app/` для деплою,
> яку використовує `frontend/Procfile`, щоб запускати API та роздавати зібрану SPA з одного
> дина. Її `main.py` додатково монтує всі роутери під `/api` і роздає `frontend/dist/`.
> Тримайте копію синхронною з `backend/app/`.
