# Lumina — Frontend

[English](#english) | [Українська](#українська)

---

<a name="english"></a>
## English

Lumina is an asynchronous, role-based learning management system. This package is its single-page React client: the course catalog, multi-format lesson player, homework submissions, teacher workspace, analytics dashboards, and JWT session handling.

### Tech Stack

- **Framework:** React 19.2 + Vite 8
- **Data & Cache:** TanStack Query v5
- **Routing:** React Router 7
- **Localization:** i18next + react-i18next (English / Ukrainian dictionaries bundled in `src/i18n.js`)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Styling:** plain CSS with component stylesheets (no Tailwind)
- **Testing:** Vitest + Testing Library + JSDOM
- **Linting:** Oxlint

### Routes

| Route | Purpose |
| :--- | :--- |
| `/` | Course catalog, teacher create/edit actions, and the user analytics tab |
| `/courses/:courseId` | Course overview and player shell |
| `/courses/:courseId/lesson/:lessonId` | Lesson player (video, PDF, links, text, homework) |
| `/teacher` | Teacher workspace: own courses, schedules, students, assignments |
| `*` | Redirect to `/` |

### Features

- JWT session stored in `localStorage`; `src/api/client.js` injects the Bearer token and normalizes API errors.
- Course catalog built on TanStack Query caching, optimistic updates, and per-course progress tracking.
- Multi-format lessons: video, PDF documents, Google Drive links, and text lectures.
- Homework submissions as uploaded files or attached links, rendered by `AttachmentList`.
- Teacher dashboard for creating and editing courses, assigning students, and setting schedules/deadlines.
- Student and course analytics dashboards built with Recharts.
- Complete English and Ukrainian UI copy; both dictionaries ship in one bundle, so switching is instant.
- Responsive layout with a mobile-aware course player and date picker.

### Project Structure

```text
frontend/
├── src/
│   ├── api/                 # client.js, coursesApi.js, teacherApi.js, analyticsApi.js
│   ├── components/          # Navbar, auth, course player, teacher dashboard, analytics
│   ├── pages/               # HomePage, CoursePage, TeacherPage
│   ├── test/                # Vitest + Testing Library setup and suites
│   ├── utils/               # Attachment normalization and upload helpers
│   ├── App.jsx              # Router and layout shell
│   ├── config.js            # VITE_API_URL resolution
│   ├── i18n.js              # English and Ukrainian dictionaries
│   ├── index.css
│   └── main.jsx
├── app/                     # Deployment fork of the backend app (single-dyno mode)
├── requirements.txt         # Python dependencies for the deployment fork
├── Procfile                 # Single-dyno process definition
├── Dockerfile               # Multi-stage build (Node -> Nginx)
├── nginx.conf               # SPA fallback and static asset caching
├── vite.config.js
└── package.json
```

> **Deployment note:** `app/` and `requirements.txt` are a deployment-time fork of
> `backend/app/`. `Procfile` starts that FastAPI app, whose `main.py` additionally
> mounts the API under `/api` and serves the built `dist/` SPA. Keep `app/` in sync
> with `backend/app/`.

### Getting Started

#### Prerequisites

- Node.js 20.19+ or 22.12+
- npm 9+

#### Development

```bash
npm install
npm run dev
```

Vite serves the app at http://localhost:5173 by default. To match the monorepo launcher:

```bash
npm run dev -- --port 3003
```

#### Environment

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://<current-hostname>:8000` | Base URL of the FastAPI backend |

Set it in `.env.local` when the API is not running on the same host and port 8000.

#### Production Build

```bash
npm run build
npm start
```

`npm start` serves `dist/` with `serve` on `PORT` (default `3000`).

### Docker

From the `Lumina/` directory:

```bash
docker compose up --build -d
```

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

### Testing and Linting

```bash
npm test          # Vitest + JSDOM
npm run lint      # Oxlint
```

---

<a name="українська"></a>
## Українська

Lumina — це асинхронна система управління навчанням на основі ролей. Цей пакет — її односторінковий React-клієнт: каталог курсів, багатоформатний плеєр уроків, здача домашніх завдань, кабінет викладача, аналітичні дашборди та робота з JWT-сесією.

### Стек Технологій

- **Фреймворк:** React 19.2 + Vite 8
- **Дані та кеш:** TanStack Query v5
- **Маршрутизація:** React Router 7
- **Локалізація:** i18next + react-i18next (англійський та український словники в `src/i18n.js`)
- **Графіки:** Recharts
- **Іконки:** Lucide React
- **Стилізація:** звичайний CSS із компонентними стилями (без Tailwind)
- **Тестування:** Vitest + Testing Library + JSDOM
- **Лінтинг:** Oxlint

### Маршрути

| Маршрут | Призначення |
| :--- | :--- |
| `/` | Каталог курсів, створення/редагування для викладача, вкладка аналітики |
| `/courses/:courseId` | Огляд курсу та оболонка плеєра |
| `/courses/:courseId/lesson/:lessonId` | Плеєр уроку (відео, PDF, посилання, текст, домашнє завдання) |
| `/teacher` | Кабінет викладача: власні курси, розклади, студенти, завдання |
| `*` | Редірект на `/` |

### Функціонал

- JWT-сесія зберігається в `localStorage`; `src/api/client.js` додає Bearer-токен і уніфікує помилки API.
- Каталог курсів на кешуванні TanStack Query, оптимістичних оновленнях і відстеженні прогресу.
- Багатоформатні уроки: відео, PDF-документи, посилання Google Drive і текстові лекції.
- Домашні завдання як завантажені файли або прикріплені посилання; рендеринг через `AttachmentList`.
- Дашборд викладача для створення й редагування курсів, призначення студентів і налаштування дедлайнів.
- Аналітичні дашборди студента й курсу на Recharts.
- Повний англійський та український UI; обидва словники в одному бандлі, тому перемикання миттєве.
- Адаптивний layout із мобільно-орієнтованим плеєром і вибором дати.

### Структура Проєкту

```text
frontend/
├── src/
│   ├── api/                 # client.js, coursesApi.js, teacherApi.js, analyticsApi.js
│   ├── components/          # Navbar, авторизація, плеєр, дашборд викладача, аналітика
│   ├── pages/               # HomePage, CoursePage, TeacherPage
│   ├── test/                # Налаштування Vitest і тести
│   ├── utils/               # Нормалізація вкладень і завантаження файлів
│   ├── App.jsx              # Роутер та оболонка layout
│   ├── config.js            # Визначення VITE_API_URL
│   ├── i18n.js              # Англійський та український словники
│   ├── index.css
│   └── main.jsx
├── app/                     # Копія backend-додатку для деплою на одному дині
├── requirements.txt         # Python-залежності для деплой-копії
├── Procfile                 # Процес для single-dyno режиму
├── Dockerfile               # Багатоетапна збірка (Node -> Nginx)
├── nginx.conf               # SPA-fallback і кешування статики
├── vite.config.js
└── package.json
```

> **Примітка щодо розгортання:** `app/` та `requirements.txt` — це копія `backend/app/`
> для деплою. `Procfile` запускає цей FastAPI-додаток, чий `main.py` додатково монтує
> API під `/api` і роздає зібраний `dist/`. Тримайте `app/` синхронним із `backend/app/`.

### Запуск

#### Попередні вимоги

- Node.js 20.19+ або 22.12+
- npm 9+

#### Режим розробки

```bash
npm install
npm run dev
```

Vite за замовчуванням відкриває http://localhost:5173. Щоб збігтися з лаунчером монорепо:

```bash
npm run dev -- --port 3003
```

#### Змінні оточення

| Змінна | За замовчуванням | Опис |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://<поточний-hostname>:8000` | Базова URL-адреса FastAPI-бекенду |

Вкажіть її в `.env.local`, якщо API працює не на тому самому хості й порту 8000.

#### Продакшн-збірка

```bash
npm run build
npm start
```

`npm start` роздає `dist/` через `serve` на `PORT` (за замовчуванням `3000`).

### Docker

З директорії `Lumina/`:

```bash
docker compose up --build -d
```

- Фронтенд: http://localhost:3000
- Документація API: http://localhost:8000/docs

### Тестування та Лінтинг

```bash
npm test          # Vitest + JSDOM
npm run lint      # Oxlint
```
