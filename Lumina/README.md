# 🎓 Lumina — Modern Asynchronous Full-Stack Learning Management Platform (LMS)

[![CI Pipeline](https://img.shields.io/badge/CI-GitHub_Actions-blue?logo=github-actions)](.github/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+_(Async)-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/Frontend-React_19_|_Vite-61DAFB?logo=react)](https://react.dev/)
[![TanStack Query](https://img.shields.io/badge/State-TanStack_Query_v5-FF4154?logo=reactquery)](https://tanstack.com/query/latest)
[![Docker](https://img.shields.io/badge/DevOps-Docker_|_Compose-2496ED?logo=docker)](docker-compose.yml)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16_(asyncpg)-336791?logo=postgresql)](https://www.postgresql.org/)
[![Alembic](https://img.shields.io/badge/Migrations-Alembic-E34F26)](https://alembic.sqlalchemy.org/)

> **Lumina** is an enterprise-grade, asynchronous role-based educational platform designed for modern online tutoring, course authoring, and student mentoring. Built with high concurrency in mind, it features non-blocking Async SQLAlchemy 2.0 operations, TanStack Query v5 state caching with optimistic UI, JWT access/refresh token rotation, automated rate-limiting, and deep-linked interactive course modules.

---

## 🌟 Key Architectural Features

* **⚡ Fully Asynchronous Engine:** Non-blocking I/O throughout the backend via **FastAPI**, **Async SQLAlchemy 2.0**, and **asyncpg / aiosqlite**.
* **🔄 Server State Caching (TanStack Query v5):** Client-side automatic cache invalidation, background revalidation, and **Optimistic UI updates** for instant user feedback.
* **🔐 Advanced Authentication & Security:** 
  * Signed JWT Access Tokens + Long-lived **Refresh Token rotation** (`/auth/refresh`).
  * **Rate Limiting** via `slowapi` to prevent brute-force attacks.
  * **X-Request-ID Correlation Middleware** for end-to-end distributed tracing.
* **📚 Interactive Course Player:** Deep-linking support for curriculum modules (`/courses/:courseId/lesson/:lessonId`), embedded video player, Google Drive preview, PDF viewer, and live meeting links.
* **⏰ Smart Assignment & Deadline Engine:** Teachers can assign courses to specific students with customized per-lesson due dates.
* **📝 Homework Submission System:** Students can upload files (PDFs, docs, images, archives) or attach web resources directly to lessons.
* **📊 Analytics & Visual Dashboards:** Completion curves, study schedules, and student progress metrics powered by **Recharts**.
* **🌐 Internationalization (i18n):** Full bilingual support (English 🇬🇧 / Ukrainian 🇺🇦).
* **☁️ Cloud & Local Asset Storage:** Hybrid media storage pipeline supporting **Cloudinary** and sanitized local disk fallbacks.

---

## 🏛️ System Architecture

```
                       ┌─────────────────────────────────────────┐
                       │          Client (React 19 SPA)          │
                       │   React Router 7 • TanStack Query v5    │
                       │          Recharts • i18next             │
                       └────────────────────┬────────────────────┘
                                            │ HTTP / REST API (JWT + Request-ID)
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │        FastAPI ASGI Async Engine        │
                       │   Auth • Courses • Teacher • Analytics  │
                       │   Rate Limiter • Correlation Middleware │
                       └───────────┬─────────────────┬───────────┘
                                   │                 │
            AsyncSession (asyncpg) │                 │ Cloudinary SDK
                                   ▼                 ▼
         ┌─────────────────────────────────┐   ┌───────────────────────┐
         │  PostgreSQL 16 / Async SQLite   │   │ Cloudinary CDN & Disk │
         │    Alembic Schema Migrations    │   │  Encrypted Media/Docs │
         └─────────────────────────────────┘   └───────────────────────┘
```

---

## 🚀 Quick Start with Docker (Recommended)

Run the full stack (Database + API + Frontend) with one command:

```bash
docker compose up --build -d
```

* **Frontend Application:** [http://localhost:3000](http://localhost:3000)
* **Backend API (Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 💻 Local Development Setup

### 1. Backend Setup (FastAPI + Async SQLAlchemy)

```powershell
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate       # On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (React 19 + TanStack Query + Vite)

```powershell
cd frontend

# Install packages
npm install

# Start development server
npm run dev
```

---

## 🧪 Automated Testing (100% Passing)

### Backend Test Suite (Pytest + AsyncIO)
```powershell
cd backend
pytest -v
```
* **10/10 passing**: Health check, registration, login, refresh token rotation flow, duplicate prevention, course CRUD, lesson completion, file sanitization, student assignment.

### Frontend Test Suite (Vitest + JSDOM)
```powershell
cd frontend
npm test
```
* **4/4 passing**: JWT token persistence, login/logout lifecycle, and course card rendering.

---

## 📂 Project Structure

```
Lumina/
├── .github/workflows/ci.yml       # CI/CD automated pipeline
├── docker-compose.yml              # Multi-container orchestration
├── backend/
│   ├── alembic/                    # Database versioning migrations
│   ├── app/
│   │   ├── main.py                 # FastAPI application & middleware factory
│   │   ├── database.py             # Async SQLAlchemy engine & session factory
│   │   ├── models.py               # SQLAlchemy 2.0 ORM schemas
│   │   ├── schemas.py              # Pydantic v2 validation models
│   │   ├── auth_utils.py           # JWT security, refresh tokens & hashing
│   │   └── routers/                # Asynchronous endpoint controllers
│   ├── tests/                      # Pytest async integration test suite
│   ├── Dockerfile                  # Production backend container image
│   └── requirements.txt            # Python dependencies
└── frontend/
    ├── src/
    │   ├── api/                    # Centralized TanStack Query API services
    │   ├── pages/                  # Routed view components (React Router 7)
    │   ├── components/             # Reusable UI widgets & dashboards
    │   ├── test/                   # Vitest unit test suite
    │   ├── i18n.js                 # Localization dictionary
    │   └── App.jsx                 # Client-side router configuration
    ├── Dockerfile                  # Multi-stage Nginx container image
    └── nginx.conf                  # Production SPA reverse proxy
```
