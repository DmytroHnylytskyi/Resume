# 🏛️ Forma-3D — 3D Builder & Architectural Room Configurator

[![CI Pipeline](https://img.shields.io/badge/CI-GitHub_Actions-blue?logo=github-actions)](.github/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+_(Strict)-3178C6?logo=typescript)](frontend/tsconfig.json)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_16_|_React_19-black?logo=next.js)](https://nextjs.org/)
[![Three.js](https://img.shields.io/badge/3D_Engine-Three.js_|_R3F-black?logo=three.js)](https://threejs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+_(Async)-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/DevOps-Docker_|_Compose-2496ED?logo=docker)](docker-compose.yml)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16_(asyncpg)-336791?logo=postgresql)](https://www.postgresql.org/)

> **Forma-3D** is a commercial-grade, asynchronous full-stack 3D interior design and architectural room configurator built with **Next.js 16 (App Router)**, **React 19**, **Three.js (React Three Fiber & Drei)**, **Zustand 5**, and **FastAPI (Async SQLAlchemy 2.0)**.

---

## 🌐 Language Options / Мовні Версії

- 🇬🇧 [English Version](#-english-version)
- 🇺🇦 [Українська версія](#-українська-версія)

---

## 🇬🇧 English Version

### 📌 Overview

**Forma-3D** demonstrates advanced WebGL spatial computation, real-time lighting presets, raycasting surface stacking, interactive transform gizmos, material recoloring, and asynchronous cloud synchronization for custom 3D scenes.

Users can assemble architectural structures, place modular elements from a **125+ GLB asset catalog**, customize sub-mesh materials in real time, adjust atmospheric lighting (Day/Night), and export/import project configurations with seamless **Bilingual Localization (EN | UK)**.

---

### 🚀 Key Architectural Features

* **⚡ 100% Strict TypeScript Architecture:** Fully typed end-to-end frontend code (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`) with zero compilation errors.
* **🌐 Instant 0ms Client-Side Localization:** High-performance i18n provider (`ClientI18nProvider`) updates UI dictionaries in real time without unmounting the WebGL Canvas or losing scene context.
* **🛋️ Surface Snapping & Ghost Placement Engine:**
  * Real-time raycasting detects top surface heights ($Y = \text{height}$) of tables, desks, walls, and roofs.
  * Zero-rerender cursor tracking runs directly on Three.js refs in `useFrame` for solid 60 FPS performance.
  * Interactive Ghost Duplication (`Ctrl + D`) transitions duplicates into hologram preview mode.
* **📐 Automatic 3D Model Normalization:** Geometry bounding-box auto-centering, floor-level alignment ($Y = 0$), and scale safety validation across all 125+ models.
* **🧹 Safe GPU Memory Management:** Automatic buffer deallocation (`geometry.dispose()`, `material.dispose()`) prevents WebGL memory leaks during dynamic scene modifications.
* **🎮 Unreal Engine 5 Style Fly-Camera Navigation:**
  * Freeflight camera inside and around structures holding Right Mouse Button (**RMB + WASD**).
  * Elevation control (**Q / E**) and flight speed boost (**Shift**).
  * Quick Camera Focus (**F**) with auto-centering on selected 3D bounding boxes.
* **🎨 3D Graphics & Material Customization:**
  * Day / Night atmosphere presets with dynamic point lights.
  * Real-time sub-mesh recoloring powered by `react-colorful` with localized part names.
* **⚡ Fully Asynchronous Backend:** Non-blocking I/O throughout the backend via **FastAPI**, **Async SQLAlchemy 2.0**, and **asyncpg / aiosqlite**.
* **🔐 Security & Cloud Synchronization:**
  * JWT Access + Refresh Token rotation (`/refresh`).
  * Rate limiting via `slowapi` to prevent brute-force attacks.
  * `X-Request-ID` correlation middleware for distributed request tracing.

---

### 🚀 Quick Start with Docker (Recommended)

Run the full stack (PostgreSQL + FastAPI + Next.js Standalone) with one command:

```bash
docker compose up --build -d
```

* **Frontend Application:** [http://localhost:3000](http://localhost:3000)
* **Backend API (Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### 💻 Local Development Setup

#### 1. Backend Setup (FastAPI + Async SQLAlchemy)

```powershell
cd backend

# Activate virtual environment
.\venv\Scripts\activate       # On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup (Next.js 16 + React Three Fiber)

```powershell
cd frontend

# Install packages
npm install

# Start development server
npm run dev
```

---

### 🧪 Automated Testing (100% Passing)

#### Frontend Type Checking & Production Build
```powershell
cd frontend
npx tsc --noEmit
npm run build
```

#### Backend Test Suite (Pytest + AsyncIO)
```powershell
cd backend
pytest -v
```
* **11/11 passing**: Health check, registration, duplicate protection, password grant login, refresh token rotation, user profile, 3D project CRUD, and authorization isolation.

---

### 🎮 Keyboard Shortcuts & Navigation

| Hotkey / Control | Action |
| :--- | :--- |
| **LMB Drag** | Orbit camera around scene |
| **RMB + WASD** | Unreal Engine 5 fly-cam navigation |
| **Q / E** | Fly camera vertical ascent (E) / descent (Q) |
| **Shift (Hold)** | 2× flight speed boost |
| **F** | Focus and center camera on selected object |
| **1 / 2 / 3** | Transform Gizmo mode: Translate (1), Rotate (2), Scale (3) |
| **R** | Rotate placement ghost / selected object +90° |
| **Ctrl + D** | Duplicate selected object into placement ghost mode |
| **Delete / Backspace** | Remove selected object |
| **Esc** | Clear selection / Cancel placement mode |

---

<br />

---

## 🇺🇦 Українська версія

### 📌 Огляд Проєкту

**Forma-3D** — це високопродуктивний інтерактивний 3D-редактор простору та архітектурний конфігуратор, створений на базі **Next.js 16**, **React Three Fiber (Three.js)**, **Zustand 5** та **FastAPI (Async SQLAlchemy 2.0)**. 

Додаток дозволяє конструювати архітектурні об'єкти, підбирати меблі з каталогу (**125+ GLB моделей у 13 категоріях**), налаштовувати матеріали деталей у реальному часі, керувати освітленням (День/Ніч), миттєво перемикати мову (0 мс) та зберігати сцени у хмарі.

---

### 🚀 Ключові Можливості

* **⚡ 100% Строгий TypeScript:** Повна типізація всіх компонентів, стану Zustand та 3D-об'єктів (0 помилок компіляції).
* **🌐 Миттєва Клієнтська Локалізація (0 мс):** Перемикання UK/EN без перезавантаження сторінки та без розмонтування 3D Canvas.
* **🛋️ Авто-Укладка на Поверхні (Surface Snapping):** Двигун рейкастингу миттєво обчислює висоту поверхні під курсором ($Y = \text{height}$) для автоматичного розміщення предметів на столах, полицях і стінах.
* **📐 Авто-Нормалізація 3D-Моделей:** Автоматичне центрування габаритів та посадка на рівень підлоги ($Y = 0$) для всіх 125 моделей.
* **🧹 Очищення Пам'яті GPU:** Автоматичний виклик `dispose()` для геометрій та матеріалів при видаленні об'єктів.
* **🎮 Навігація в стилі UE5 (Fly-Cam):** Вільний політ всередині приміщень при затисканні **ПКМ + WASD + QE + Shift**, а також фокус на об'єкті (**F**).
* **🎨 Кастомізація Матеріалів:** Зміна кольору окремих деталей моделей (`react-colorful`) з відображенням чистої локалізованої назви.
* **⚡ Повністю Асинхронний Бекенд:** Неблокуючий I/O на базі FastAPI, Async SQLAlchemy 2.0 та asyncpg/aiosqlite.
* **🔐 Безпека та Хмарна Синхронізація:** Ротація JWT токенів, Rate Limiting (`slowapi`), `X-Request-ID` трасування.

---

### 🚀 Швидкий запуск через Docker

```bash
docker compose up --build -d
```

* **Фронтенд:** [http://localhost:3000](http://localhost:3000)
* **Документація API (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Перевірка стану (Health Check):** [http://localhost:8000/health](http://localhost:8000/health)


