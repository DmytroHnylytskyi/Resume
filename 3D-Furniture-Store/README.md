# 3D Builder & Architectural Room Configurator

> **Full-Stack 3D Web Application for Real-Time Interior & Architectural Room Design.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-R185-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](#license)

---

## 🌐 Language Options / Мовні Версії

- 🇬🇧 [English Version](#-english-version)
- 🇺🇦 [Українська версія](#-українська-версія)

---

## 🇬🇧 English Version

### 📌 Overview

**3D Builder & Architectural Configurator** is a high-performance, interactive 3D spatial design application built with **Next.js 16**, **React Three Fiber (Three.js)**, and **FastAPI**. Designed as a portfolio showcase and commercial prototype, it demonstrates advanced WebGL rendering, robust state management (**Zustand 5**), and cloud backend integration for 3D project storage.

Users can assemble architectural structures, select items from a 60+ GLB asset catalog, customize sub-mesh materials in real time, adjust atmospheric lighting, and export/import project configurations with seamless **Bilingual Localization (EN | UK)**.

---

### 🚀 Key Features

#### 🌐 Dual-Language UI & Localization
- **Instant Switcher (`EN | UK`)**: Navbar language toggle button for switching between English and Ukrainian localizations instantly without state loss (`next-intl`).

#### 🎨 3D Graphics & Atmosphere
- **Interactive WebGL Canvas**: Real-time directional & ambient shadow rendering, dynamic `Environment` presets, anti-aliased viewport, and DPR scaling (`AdaptiveDpr`).
- **Day / Night Lighting Modes**: One-click atmosphere toggling between warm daylight (sun light intensity = 2.8, ambient = 1.4) and cool night environment with neon point-light lamps.
- **Magnet Grid Snapping**: Automatic object snapping to a `0.5m` floor grid for precise wall and room construction.

#### 🛋️ Surface Snapping & Ghost Placement Engine
- **Automatic Surface Stacking**: Raycasting engine automatically detects top surface heights of tables, desks, walls, and roofs ($Y = \text{height}$), snapping objects smoothly on top of existing furniture.
- **Zero-Rerender Placement**: Cursor raycast tracking runs directly on Three.js refs in `useFrame` for maximum 60 FPS performance.
- **Interactive Ghost Duplication (`Ctrl + D`)**: Cloning an object or clicking **Clone** transitions the duplicate into Placement Mode under the cursor with a green hologram preview.

#### 🎮 Unreal Engine 5 Style Fly-Camera Navigation
- **Orbit Mode**: Smooth rotation around focused objects holding Left Mouse Button (LMB).
- **UE5 Fly-Cam**: Freeflight camera inside and around structures holding Right Mouse Button (**RMB + WASD**).
- **Elevation Control (Q / E)**: Vertical ascent (E) and descent (Q).
- **Flight Speed Boost (Shift)**: 2× movement speed boost while holding Shift.
- **Smart Focus (`fitToBox`)**: Cinematic smooth camera framing when clicking on any scene object.

#### 📦 Modular Catalog & 3D Inspector
- **8 Curated Asset Categories**:
  - *Interior Walls & Floors* (partition walls, parquet, tiles, doors, windows)
  - *Modern Facades & Houses* (5x5m & 5x2.5m walls, balconies, roofs, hedges, street lamps)
  - *Gothic & Castle* (gothic arches, columns, cornices, castle walls, statues)
  - *Sofas & Chairs*, *Tables*, *Storage & Stands*, *Lighting*, *Decor & Electronics*
- **Live 3D Inspector Box**: Sidebar inspection window that auto-normalizes model dimensions and continuously rotates hovered GLB assets.

#### 🛠️ Object Editing & Customization
- **Transform Gizmo**: Full Translation, Rotation, and Scaling gizmos (`@react-three/drei` TransformControls).
- **Quick Transformation Toolbar**: Preset buttons for exact angle rotations (`-90°`, `-45°`, `+45°`, `+90°`, `180°`) and scale multipliers (`0.5x` — `2.0x`).
- **Material Customization**: Interactive sub-mesh color picker powered by `react-colorful` for real-time part recoloring.

#### 💾 Persistence & Cloud Synchronization
- **Local Storage Auto-Save**: Persistent browser state restoration.
- **JSON Export / Import**: Formatted file export and import for sharing 3D layout configurations.
- **FastAPI Cloud Sync**: User JWT authentication and cloud project database storage (SQLite).

---

### 🛠️ Tech Stack

#### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19, `proxy.js`)
- **3D Engine**: [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei)
- **State Management**: [Zustand 5](https://github.com/pmndrs/zustand)
- **UI & Icons**: [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/)
- **i18n**: [next-intl](https://next-intl-docs.vercel.app/)

#### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13)
- **ORM & Database**: [SQLAlchemy](https://www.sqlalchemy.org/), [SQLite](https://sqlite.org/)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Authentication**: PyJWT, Passlib (bcrypt/pbkdf2), OAuth2 Password Bearer
- **Validation**: Pydantic v2

---

### ⚡ Quick Start Guide

#### 1. Frontend Setup (Next.js)

```bash
cd frontend
npm install
npm run dev
```
Access frontend at [http://localhost:3000](http://localhost:3000).

#### 2. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # On Windows
pip install fastapi uvicorn sqlalchemy alembic pyjwt passlib bcrypt
uvicorn main:app --reload --port 8000
```
Interactive Swagger API documentation available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 🔌 REST API Reference

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register new user account | ❌ |
| `POST` | `/token` | Authenticate & issue OAuth2 JWT Bearer token | ❌ |
| `GET` | `/users/me/` | Fetch current user profile details | 🔒 Bearer JWT |
| `GET` | `/projects/` | Retrieve user's saved 3D projects | 🔒 Bearer JWT |
| `POST` | `/projects/` | Save new 3D project configuration to cloud | 🔒 Bearer JWT |
| `DELETE` | `/projects/{id}` | Delete project by ID | 🔒 Bearer JWT |

---

### 🎮 Keyboard Shortcuts & Navigation

| Hotkey / Control | Action |
| :--- | :--- |
| **LMB Drag** | Orbit camera around selected object |
| **RMB + WASD** | Unreal Engine 5 fly-cam navigation |
| **Q / E** | Fly camera vertical ascent (E) / descent (Q) |
| **Shift (Hold)** | 2× flight speed boost |
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

**3D Builder & Architectural Configurator** — це високопродуктивний інтерактивний 3D-редактор простору, створений з використанням **Next.js 16**, **React Three Fiber (Three.js)** та **FastAPI**. Проєкт демонструє застосування передових технологій веб-графіки (WebGL), оптимізований стан-менеджмент (**Zustand 5**), двомовну локалізацію (**EN | UK**) та масштабований бэкенд для хмарного збереження користувацьких 3D-сцен.

Додаток дозволяє конструювати архітектурні об'єкти, підбирати елементи інтер'єру та екстер'єру з каталогу (60+ модульних блоків), налаштовувати матеріали і кольори окремих деталей, змінювати освітлення та експортувати/імпортувати готові файли проєктів.

---

### 🚀 Ключові Можливості

#### 🌐 Двомовний Інтерфейс (EN | UK)
- **Миттєвий перемикач мови**: Кнопка у верхній панелі навігації перемикає мову (English / Українська) в один клик без втрати стану редагування (`next-intl`).

#### 🎨 3D Графіка та Освітлення
- **Інтерактивний WebGL Canvas**: Обчислення тіней, динамічне оточення (`Environment preset`), згладжування та адаптивний DPR (`AdaptiveDpr`).
- **Режими Освітлення (День / Ніч)**: Миттєве перемикання між денною атмосферою (тепле сонячне світло, ambient = 1.4) та нічним режимом (холодне місячне світло, неонові акценти).
- **Масштабована 3D-Сітка (Magnet Snap)**: Прилипання об'єктів до координатної сітки з кроком `0.5м` для точного побудування стін і кімнат.

#### 🛋️ Авто-Укладка на Поверхності (Surface Snapping)
- **Укладка на поверхні**: Двигун рейкастинга виявляє висоту поверхні під курсором (столи, тумби, стіни, дахи) і автоматично ставить призрак поверхні.
- **Голографічне клонування (`Ctrl + D`)**: Дублювання предмета переводить його в режим 3D-призрака під курсором з збереженням усіх кастомних кольорів.

#### 🎮 Навігація та Управління Камерою (UE5 Fly-Cam)
- **Орбітальний режим**: Вращення камери навколо виділеного предмета при затиснутій ЛКМ.
- **Unreal Engine 5 Fly-Camera**: Вільний політ всередині й навколо будинку при затисканні **ПКМ + WASD**.
- **Вертикальний політ (Q / E)**: Підйом (E) та спуск (Q) камери по осі Y.
- **Прискорення (Shift)**: Двократне збільшення швидкості переміщення.
- **Smart Focus (`fitToBox`)**: Плавне фокусування камери при кліку на об'єкт.

#### 📦 Модульний Каталог та 3D Inspector
- **8 Категорій Меблів та Архітектури**:
  - *Стіни & Підлога* (інтер'єрні перегородки, паркет, плитка, двері, вікна)
  - *Модерн Будинки* (фасади 5х5м, 5х2.5м, балкони, дахи, живі огорожі, ліхтарі)
  - *Готика & Замок* (арки, колони, карнизи, замкові стіни, скульптури)
  - *Дивани та Крісла*, *Столи*, *Шафи та Стійки*, *Освітлення*, *Декор та Техніка*
- **Live 3D Inspector Box**: Інтерактивний 3D-прев'ю блок у сайдбарі з автомасштабуванням моделей та плавним вращенням при наведенні курсора.

#### 🛠️ Інструменти Редагування та Кастомізації
- **Transform Gizmo**: Переміщення (Translate), Вращення (Rotate) та Масштабування (Scale).
- **Швидкий Тулбар**: Кнопки точного повороту на `-90°`, `-45°`, `+45°`, `+90°`, `180°` та зміни масштабу (`0.5x` — `2.0x`).
- **Кастомізація Матеріалів**: Клік по будь-якій деталі моделі відкриває колірну палітру (`react-colorful`) для фарбування компонентів у реальному часі.

---

### ⚡ Інструкція з Локального Запуску

#### 1. Запуск Фронтенду (Next.js)

```bash
cd frontend
npm install
npm run dev
```

#### 2. Запуск Бэкенду (FastAPI)

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy alembic pyjwt passlib bcrypt
uvicorn main:app --reload --port 8000
```

---

## 📄 License / Ліцензія

Project is distributed under MIT License. Исходный код свободен для использования.
