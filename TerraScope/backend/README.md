# TerraScope Backend

[English](#english) | [Українська](#українська)

---

<a name="english"></a>
## English

Asynchronous FastAPI backend service for TerraScope, providing cached geospatial data feeds, JWT authentication, Alembic database migrations, and user view preset management.

### Getting Started

#### Prerequisites
- Python 3.10+
- pip package manager

#### Local Environment & Server Startup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

- API Base: `http://localhost:8000`
- Swagger UI Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Testing

```bash
# Execute asynchronous pytest test suite
.\venv\Scripts\python -m pytest
```

### API Endpoints Reference

#### Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account (email, password) |
| `POST` | `/api/auth/token` | Authenticate user credentials and return Bearer JWT token |
| `POST` | `/api/auth/refresh` | Refresh active JWT session token |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile |

#### Data Layers (`/api/layers`)
| Method | Endpoint | Cache TTL | Data Source |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/layers/earthquakes` | 300 seconds | USGS Real-time Earthquake GeoJSON API |
| `GET` | `/api/layers/flights` | 30 seconds | OpenSky Network Live Flight Vectors |
| `GET` | `/api/layers/weather` | 900 seconds | Open-Meteo Global Capital Forecast API |
| `GET` | `/api/layers/countries` | 86400 seconds | REST Countries API v3.1 |
| `GET` | `/api/layers/neo` | 3600 seconds | NASA Near Earth Object Web Service (NeoWs) |

#### Saved Views (`/api/views`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/views/` | Bearer JWT | List current user's saved globe views |
| `POST` | `/api/views/` | Bearer JWT | Save a new custom globe view preset |
| `GET` | `/api/views/{id}` | Bearer JWT | Retrieve saved view details by ID |
| `DELETE` | `/api/views/{id}` | Bearer JWT | Delete a saved view preset by ID |

### Database Schema (`sql_app.db`)

- **`users`**: User credentials (`id`, `email`, `hashed_password`, `created_at`).
- **`saved_views`**: User globe view configurations (`id`, `user_id`, `name`, `description`, `camera_position`, `camera_target`, `active_layers`, `layer_filters`, `created_at`).
- **`cache_entries`**: Server-side API response caching table (`id`, `cache_key`, `data`, `expires_at`, `created_at`).

---

<a name="українська"></a>
## Українська

Асинхронний бекенд-сервіс FastAPI для TerraScope, що забезпечує кешування геопросторових потоків даних, JWT-автентифікацію, міграції бази даних Alembic та керування збереженими видами користувачів.

### Початок роботи

#### Попередні вимоги
- Python 3.10+
- Менеджер пакетів pip

#### Локальне оточення та запуск сервера

```bash
# Перехід у директорію бекенду
cd backend

# Створення віртуального оточення
python -m venv venv

# Активація віртуального оточення
# Windows:
.\venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Встановлення залежностей
pip install -r requirements.txt

# Застосування міграцій бази даних
alembic upgrade head

# Запуск сервера розробки
uvicorn app.main:app --reload --port 8000
```

- Базовий URL API: `http://localhost:8000`
- Документація Swagger UI: `http://localhost:8000/docs`
- Перевірка стану: `http://localhost:8000/health`

### Тестування

```bash
# Запуск асинхронного набору тестів pytest
.\venv\Scripts\python -m pytest
```

### Довідник ендпоінтів API

#### Автентифікація (`/api/auth`)
| Метод | Ендпоінт | Опис |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Реєстрація нового облікового запису користувача (email, пароль) |
| `POST` | `/api/auth/token` | Автентифікація користувача та видача токена Bearer JWT |
| `POST` | `/api/auth/refresh` | Оновлення активного токена сесії JWT |
| `GET` | `/api/auth/me` | Отримання профілю автентифікованого користувача |

#### Шари даних (`/api/layers`)
| Метод | Ендпоінт | TTL кешу | Джерело даних |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/layers/earthquakes` | 300 секунд | USGS GeoJSON API сейсмічних подій у реальному часі |
| `GET` | `/api/layers/flights` | 30 секунд | OpenSky Network Live Flight Vectors |
| `GET` | `/api/layers/weather` | 900 секунд | Open-Meteo Global Capital Forecast API |
| `GET` | `/api/layers/countries` | 86400 секунд | REST Countries API v3.1 |
| `GET` | `/api/layers/neo` | 3600 секунд | NASA Near Earth Object Web Service (NeoWs) |

#### Збережені види (`/api/views`)
| Метод | Ендпоінт | Автентифікація | Опис |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/views/` | Bearer JWT | Список збережених видів глобуса поточного користувача |
| `POST` | `/api/views/` | Bearer JWT | Збереження нового пресету вигляду глобуса |
| `GET` | `/api/views/{id}` | Bearer JWT | Отримання деталей збереженого виду за ID |
| `DELETE` | `/api/views/{id}` | Bearer JWT | Видалення пресету збереженого виду за ID |

### Схема бази даних (`sql_app.db`)

- **`users`**: Облікові дані користувачів (`id`, `email`, `hashed_password`, `created_at`).
- **`saved_views`**: Конфігурації видів глобуса (`id`, `user_id`, `name`, `description`, `camera_position`, `camera_target`, `active_layers`, `layer_filters`, `created_at`).
- **`cache_entries`**: Таблиця серверного кешу відповідей API (`id`, `cache_key`, `data`, `expires_at`, `created_at`).\n