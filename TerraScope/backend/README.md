# ⚡ TerraScope Backend — Async FastAPI & SQLite Services

This folder contains the high-concurrency **FastAPI async Python backend** for **TerraScope**, managing cached geospatial data feeds, JWT authentication, Alembic database migrations, and user saved globe view presets.

---

## 🚀 Getting Started

### Prerequisites
- Python `v3.10` or higher
- pip package manager

### Virtual Environment & Server Startup

```bash
# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Run Uvicorn development server
uvicorn app.main:app --reload --port 8000
```
- **API Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **Container Health Check**: `http://localhost:8000/health`

---

## 🧪 Testing

```bash
# Execute asynchronous pytest test suite
.\venv\Scripts\python -m pytest
```

---

## 📡 API Endpoint Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account (email, password) |
| `POST` | `/api/auth/token` | Authenticate user & return OAuth2 Bearer JWT token |
| `POST` | `/api/auth/refresh` | Refresh active JWT session token |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile |

### 📊 Data Layers (`/api/layers`)
| Method | Endpoint | Cache TTL | Data Source |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/layers/earthquakes` | 5 Minutes | USGS Real-time Earthquake GeoJSON API |
| `GET` | `/api/layers/flights` | 30 Seconds | OpenSky Network Live ADS-B Flight Vectors |
| `GET` | `/api/layers/weather` | 15 Minutes | Open-Meteo Global Capital Forecast API |
| `GET` | `/api/layers/countries` | 24 Hours | REST Countries API v3.1 |
| `GET` | `/api/layers/neo` | 1 Hour | NASA Near Earth Object Web Service (NeoWs) |

### 🔖 Saved Views (`/api/views`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/views/` | Bearer JWT | List current user's saved globe views |
| `POST` | `/api/views/` | Bearer JWT | Save a new custom globe view preset |
| `GET` | `/api/views/{id}` | Bearer JWT | Retrieve saved view details |
| `DELETE` | `/api/views/{id}` | Bearer JWT | Delete a saved view preset by ID |

---

## 💾 Database Schema (`sql_app.db`)

- **`users`**: User credentials (`id`, `email`, `hashed_password`, `created_at`).
- **`saved_views`**: User globe view configurations (`id`, `user_id`, `name`, `description`, `camera_position`, `camera_target`, `active_layers`, `layer_filters`, `created_at`).
- **`cache_entries`**: API response caching table with TTL (`id`, `cache_key`, `data`, `expires_at`, `created_at`).
