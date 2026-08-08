# ⚡ GlobeScope Backend — FastAPI & SQLite Services

This folder contains the **FastAPI Python backend** for **GlobeScope**, managing cached geospatial data feeds, JWT authentication, and user saved globe view presets.

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
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run Uvicorn development server
uvicorn app.main:app --reload --port 8000
```
API Documentation (Swagger UI): `http://localhost:8000/docs`

---

## 📡 API Endpoint Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account (email, password) |
| `POST` | `/api/auth/token` | Authenticate user & return OAuth2 Bearer JWT token |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile |

### 📊 Data Layers (`/api/layers`)
| Method | Endpoint | Cache TTL | Data Source |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/layers/earthquakes` | 5 Minutes | USGS Real-time Earthquake API |
| `GET` | `/api/layers/flights` | 30 Seconds | OpenSky Network Live Flights |
| `GET` | `/api/layers/weather` | 15 Minutes | Open-Meteo Weather API |
| `GET` | `/api/layers/countries` | 24 Hours | REST Countries API |
| `GET` | `/api/layers/neo` | 1 Hour | NASA Near Earth Object Web Service |

### 🔖 Saved Views (`/api/views`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/views/` | Bearer JWT | List current user's saved globe views |
| `POST` | `/api/views/` | Bearer JWT | Save a new custom globe view preset |
| `DELETE` | `/api/views/{id}` | Bearer JWT | Delete a saved view preset by ID |

---

## 💾 Database Schema (`globescope.db`)

- **`users`**: User credentials (`id`, `email`, `hashed_password`, `created_at`).
- **`saved_views`**: User globe view configurations (`id`, `user_id`, `title`, `active_layers`, `camera_target`, `created_at`).
- **`cache`**: API response caching table (`key`, `data`, `expires_at`).
