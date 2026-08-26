[English](#english) | [Українська](#українська)

---

<a id="english"></a>
# Lumina Learning Management System

Lumina is an asynchronous role-based learning management system. It provides functionality for course authoring, student mentoring, and progress tracking.

## Architecture

The project consists of a backend API and a frontend single-page application (SPA).

### Backend
- **Framework:** FastAPI
- **Database:** PostgreSQL (production via asyncpg) / SQLite (development/testing via aiosqlite)
- **ORM:** SQLAlchemy 2.0 (Asynchronous)
- **Migrations:** Alembic
- **Authentication:** JWT (Access and Refresh token rotation)
- **Security:** Rate limiting (`slowapi`)
- **Testing:** Pytest with AsyncIO

### Frontend
- **Framework:** React 19, Vite
- **State Management:** TanStack Query v5
- **Routing:** React Router 7
- **Internationalization:** i18next (English, Ukrainian)
- **Charts:** Recharts
- **Testing:** Vitest, JSDOM

## Features

- **Authentication & Authorization:** Role-based access control (Student, Teacher).
- **Course Management:** Teachers can create, edit, and delete courses consisting of multiple lessons.
- **Content Delivery:** Support for embedding videos, PDF documents, Google Drive links, and text lectures.
- **Assignments:** Teachers can assign courses to specific students and set study schedules and deadlines.
- **Homework Submissions:** Students can upload files or attach links as homework submissions for specific lessons.
- **File Storage:** File uploads support both Cloudinary integration and local disk storage fallback.
- **Analytics:** Dashboards for tracking student completion progress and course statistics.
- **Internationalization:** Bilingual interface support.

## Project Structure

```text
Lumina/
├── backend/               # FastAPI backend application
│   ├── alembic/           # Database migrations
│   ├── app/               # Application source code
│   │   ├── routers/       # API endpoints
│   │   ├── database.py    # Database engine configuration
│   │   ├── models.py      # SQLAlchemy ORM models
│   │   ├── schemas.py     # Pydantic validation schemas
│   │   ├── auth_utils.py  # JWT and security utilities
│   │   └── main.py        # FastAPI entry point
│   ├── tests/             # Pytest test suite
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile         # Backend container image
├── frontend/              # React frontend application
│   ├── src/               # Application source code
│   │   ├── api/           # API integration services
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # View components
│   │   ├── test/          # Vitest test suite
│   │   ├── App.jsx        # Router configuration
│   │   └── i18n.js        # Localization configuration
│   ├── nginx.conf         # Production SPA reverse proxy
│   └── Dockerfile         # Frontend container image
├── docker-compose.yml     # Multi-container orchestration
└── .github/workflows/     # GitHub Actions CI pipeline
```

## Running the Application

### Docker (Recommended)

To run the full stack (Database, Backend API, Frontend) using Docker Compose:

```bash
docker compose up --build -d
```
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`

### Local Development

#### Backend

1. Navigate to the `backend` directory.
2. Create and activate a virtual environment.
3. Install dependencies: `pip install -r requirements.txt`
4. Apply database migrations: `alembic upgrade head`
5. Start the server: `uvicorn app.main:app --reload --port 8000`

#### Frontend

1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Testing

### Backend
To run the backend test suite, navigate to the `backend` directory and execute:
```bash
pytest -v
```

### Frontend
To run the frontend test suite, navigate to the `frontend` directory and execute:
```bash
npm test
```

---

<a id="українська"></a>
# Lumina Learning Management System

Lumina — це асинхронна система управління навчанням на основі ролей. Вона надає функціонал для створення курсів, менторства студентів та відстеження прогресу.

## Архітектура

Проєкт складається з backend API та frontend односторінкового додатку (SPA).

### Backend
- **Фреймворк:** FastAPI
- **База даних:** PostgreSQL (продакшн через asyncpg) / SQLite (розробка/тестування через aiosqlite)
- **ORM:** SQLAlchemy 2.0 (Асинхронна)
- **Міграції:** Alembic
- **Аутентифікація:** JWT (ротація Access та Refresh токенів)
- **Безпека:** Обмеження частоти запитів (`slowapi`)
- **Тестування:** Pytest з AsyncIO

### Frontend
- **Фреймворк:** React 19, Vite
- **Управління станом:** TanStack Query v5
- **Маршрутизація:** React Router 7
- **Інтернаціоналізація:** i18next (Англійська, Українська)
- **Графіки:** Recharts
- **Тестування:** Vitest, JSDOM

## Функціонал

- **Аутентифікація та Авторизація:** Контроль доступу на основі ролей (Студент, Викладач).
- **Управління курсами:** Викладачі можуть створювати, редагувати та видаляти курси, що складаються з кількох уроків.
- **Доставка контенту:** Підтримка вбудовування відео, PDF-документів, посилань на Google Drive та текстових лекцій.
- **Призначення:** Викладачі можуть призначати курси конкретним студентам та встановлювати розклади навчання і дедлайни.
- **Здача домашніх завдань:** Студенти можуть завантажувати файли або прикріплювати посилання як домашні завдання для конкретних уроків.
- **Зберігання файлів:** Завантаження файлів підтримує як інтеграцію з Cloudinary, так і резервне локальне дискове сховище.
- **Аналітика:** Дашборди для відстеження прогресу завершення курсу студентами та статистики курсів.
- **Інтернаціоналізація:** Підтримка двомовного інтерфейсу.

## Структура проєкту

```text
Lumina/
├── backend/               # FastAPI backend додаток
│   ├── alembic/           # Міграції бази даних
│   ├── app/               # Вихідний код додатку
│   │   ├── routers/       # API ендпоінти
│   │   ├── database.py    # Конфігурація бази даних
│   │   ├── models.py      # SQLAlchemy ORM моделі
│   │   ├── schemas.py     # Pydantic схеми валідації
│   │   ├── auth_utils.py  # Утиліти JWT та безпеки
│   │   └── main.py        # Точка входу FastAPI
│   ├── tests/             # Набір тестів Pytest
│   ├── requirements.txt   # Python залежності
│   └── Dockerfile         # Образ backend контейнера
├── frontend/              # React frontend додаток
│   ├── src/               # Вихідний код додатку
│   │   ├── api/           # Сервіси інтеграції API
│   │   ├── components/    # Перевикористовувані React компоненти
│   │   ├── pages/         # Компоненти сторінок
│   │   ├── test/          # Набір тестів Vitest
│   │   ├── App.jsx        # Конфігурація маршрутизатора
│   │   └── i18n.js        # Конфігурація локалізації
│   ├── nginx.conf         # Продакшн SPA зворотний проксі
│   └── Dockerfile         # Образ frontend контейнера
├── docker-compose.yml     # Оркестрація кількох контейнерів
└── .github/workflows/     # CI конвеєр GitHub Actions
```

## Запуск додатку

### Docker (Рекомендовано)

Щоб запустити повний стек (База даних, Backend API, Frontend) за допомогою Docker Compose:

```bash
docker compose up --build -d
```
- Frontend: `http://localhost:3000`
- Документація Backend API: `http://localhost:8000/docs`

### Локальна розробка

#### Backend

1. Перейдіть до директорії `backend`.
2. Створіть та активуйте віртуальне середовище.
3. Встановіть залежності: `pip install -r requirements.txt`
4. Застосуйте міграції бази даних: `alembic upgrade head`
5. Запустіть сервер: `uvicorn app.main:app --reload --port 8000`

#### Frontend

1. Перейдіть до директорії `frontend`.
2. Встановіть залежності: `npm install`
3. Запустіть сервер для розробки: `npm run dev`

## Тестування

### Backend
Щоб запустити набір тестів backend, перейдіть до директорії `backend` і виконайте:
```bash
pytest -v
```

### Frontend
Щоб запустити набір тестів frontend, перейдіть до директорії `frontend` і виконайте:
```bash
npm test
```
