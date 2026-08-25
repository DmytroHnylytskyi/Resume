# Forma-3D — Backend API Specification & Guide

> **FastAPI Python Backend Application for User Authentication and Cloud 3D Scene Storage.**

---

## 🌐 Languages / Мови

- 🇬🇧 [English Version](#-english-version)
- 🇺🇦 [Українська версія](#-українська-версія)

---

## 🇬🇧 English Version

### 🛠️ Technology Stack

- **FastAPI**: High-performance Python web framework with auto-generated OpenAPI & Swagger documentation.
- **SQLAlchemy**: Relational Object-Relational Mapping (ORM).
- **SQLite**: Embedded database file engine (`sql_app.db`).
- **Alembic**: Database schema migration management.
- **PyJWT & Passlib**: OAuth2 Password Bearer authentication with JWT token generation and bcrypt password hashing.
- **Pydantic v2**: Data validation and response payload schemas.

---

### 📁 Directory Structure (`backend/`)

```
backend/
├── alembic/                      # Alembic database migration environment
│   ├── versions/                 # Migration version scripts
│   ├── env.py                    # Alembic environment config
│   └── script.py.mako            # Migration template
├── alembic.ini                   # Alembic database URL configuration
├── auth.py                       # Password hashing & JWT token handling
├── database.py                   # SQLAlchemy engine & session factory
├── main.py                       # FastAPI application entrypoint & API routes
├── models.py                     # SQLAlchemy ORM models (User, Project)
├── schemas.py                    # Pydantic validation schemas
└── sql_app.db                    # SQLite database file
```

---

### 🚀 Local Execution Setup

```bash
cd backend

# Create and activate Python virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy alembic pyjwt passlib bcrypt

# Start Uvicorn development server
uvicorn main:app --reload --port 8000
```

Interactive Swagger UI documentation is automatically available at: **http://localhost:8000/docs**

---

### 🔌 REST API Endpoints

#### 1. Authentication & Users

- `POST /register`: User registration (`email`, `name`, `password`).
- `POST /token`: User login & OAuth2 Access Token issuance (`username` = email, `password`).
- `GET /users/me/`: Retrieve authenticated user profile (`Header: Authorization: Bearer <token>`).

#### 2. Cloud 3D Scene Projects (`/projects/`)

- `GET /projects/`: Retrieve all 3D projects created by current user (ordered by updated timestamp).
- `POST /projects/`: Save a new 3D project configuration (`name`, `data` JSON string).
- `DELETE /projects/{project_id}`: Delete a saved project by ID.

---

<br />

---

## 🇺🇦 Українська версія

### 🛠️ Стек Технологій Бекенду

- **FastAPI**: Побудова REST API, автогенерація Swagger та OpenAPI документації.
- **SQLAlchemy**: Реляційна ORM для роботи з базами даних.
- **SQLite**: Легковагова файлова СУБД (`sql_app.db`).
- **Alembic**: Управління міграціями структури БД.
- **PyJWT & Passlib**: Авторизація за стандартом OAuth2 з Bearer JWT токенами та хешуванням паролів за алгоритмом `bcrypt`.
- **Pydantic v2**: Строга валідація вхідних та вихідних даних (Schemas).

---

### ⚡ Запуск та Розробка

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy alembic pyjwt passlib bcrypt
uvicorn main:app --reload --port 8000
```
