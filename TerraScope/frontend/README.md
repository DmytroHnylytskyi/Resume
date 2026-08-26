# TerraScope Frontend

[English](#english) | [Українська](#українська)

---

<a name="english"></a>
## English

Next.js 16 App Router frontend for TerraScope, rendering a hardware-accelerated 3D WebGL Earth visualization canvas using React 19, Three.js, and React Three Fiber.

### Getting Started

#### Prerequisites
- Node.js 18.0.0+
- npm 9.0.0+

#### Installation & Development Server

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server on http://localhost:3000
npm run dev
```

### Component Architecture

```
src/
├── app/
│   ├── layout.js              # Root HTML layout shell and metadata
│   ├── page.js                # Main page mounting 3D Globe canvas and UI panels
│   └── globals.css            # CSS variables and styling rules
│
├── components/
│   ├── globe/
│   │   ├── Globe.jsx          # R3F Canvas container with OrbitControls and lighting
│   │   ├── Earth.jsx          # Earth sphere mesh with custom GLSL ShaderMaterial
│   │   ├── Atmosphere.jsx     # Fresnel atmospheric glowing outer halo mesh
│   │   ├── PostProcessing.jsx # EffectComposer with Bloom and Vignette passes
│   │   └── ErrorBoundary.jsx  # WebGL canvas error fallback barrier
│   │
│   ├── layers/
│   │   ├── EarthquakeLayer.jsx# Instanced 3D magnitude columns (USGS dataset)
│   │   ├── FlightLayer.jsx    # Instanced 3D airplane sprites (OpenSky dataset)
│   │   ├── WeatherLayer.jsx   # Instanced capital weather indicator orbs
│   │   ├── NeoLayer.jsx       # Instanced near-Earth asteroids and orbital rings
│   │   ├── CapitalsLayer.jsx  # Instanced 16-segment tapered capital markers
│   │   └── CountryBordersLayer.jsx # Vector country borders line mesh
│   │
│   └── ui/
│       ├── Navbar.jsx         # Top navigation bar with surface mode switcher and auth
│       ├── LayerPanel.jsx     # Left drawer for toggling data layers and filters
│       ├── DetailPanel.jsx    # Right inspection drawer showing selected marker details
│       ├── AuthModal.jsx      # Authentication modal for login and registration
│       ├── SavedViewsModal.jsx# Modal for managing saved camera presets and active layers
│       └── StatusBar.jsx      # Bottom status bar showing active layers and FPS
│
├── hooks/
│   ├── useLayerData.js        # Polling data fetching hook connecting to backend API
│   └── useGeoConvert.js       # Geographic coordinate transformation utilities (Lat/Lng -> XYZ)
│
└── store/
    └── useStore.js            # Zustand 5 global state store
```

### Performance Optimizations

1. **Instanced Mesh Rendering (`InstancedMesh`)**:
   3D markers (earthquakes, planes, weather orbs, asteroids, pins) utilize `<instancedMesh>` components to batch render entities within single GPU draw calls.
2. **Zero Allocation in Frame Loop (`useFrame`)**:
   Three.js helper instances (`Vector3`, `Matrix4`, `Color`, `Object3D`) are allocated at module scope to eliminate heap allocations and Garbage Collection pauses during the 60 Hz render loop.
3. **Single-Pass Earth GLSL Shader**:
   Calculates day/night blending and sunset twilight scattering in a single fragment shader pass, avoiding multiple illumination passes.
4. **GPU Memory Lifecycle Management**:
   Dynamic orbital path buffers and geometry allocations are explicitly disposed in component teardown lifecycle hooks to prevent VRAM memory leaks.

---

<a name="українська"></a>
## Українська

Клієнтська частина TerraScope на базі Next.js 16 App Router для рендерингу апаратно-прискореної 3D WebGL-візуалізації Землі з використанням React 19, Three.js та React Three Fiber.

### Початок роботи

#### Попередні вимоги
- Node.js 18.0.0+
- npm 9.0.0+

#### Встановлення та запуск сервера розробки

```bash
# Перехід у директорію фронтенду
cd frontend

# Встановлення залежностей
npm install

# Запуск сервера розробки на http://localhost:3000
npm run dev
```

### Архітектура компонентів

```
src/
├── app/
│   ├── layout.js              # Кореневий HTML-макет та метадані
│   ├── page.js                # Головна сторінка з монтуванням 3D Canvas та панелей UI
│   └── globals.css            # Змінні CSS та глобальні стилі
│
├── components/
│   ├── globe/
│   │   ├── Globe.jsx          # Контейнер R3F Canvas з OrbitControls та освітленням
│   │   ├── Earth.jsx          # Сітка сфери Землі з власним GLSL ShaderMaterial
│   │   ├── Atmosphere.jsx     # Сітка атмосферного сяйва Френеля
│   │   ├── PostProcessing.jsx # EffectComposer з проходами Bloom та Vignette
│   │   └── ErrorBoundary.jsx  # Бар'єр перехоплення помилок контексту WebGL
│   │
│   ├── layers/
│   │   ├── EarthquakeLayer.jsx# Інстансовані 3D-колони магнітуд (USGS)
│   │   ├── FlightLayer.jsx    # Інстансовані 3D-спрайти літаків (OpenSky)
│   │   ├── WeatherLayer.jsx   # Інстансовані сфери погодних показників столиць
│   │   ├── NeoLayer.jsx       # Інстансовані навколоземні астероїди та орбітальні кільця
│   │   ├── CapitalsLayer.jsx  # Інстансовані 16-сегментні конуси-піни столиць
│   │   └── CountryBordersLayer.jsx # Векторна сітка ліній кордонів країн
│   │
│   └── ui/
│       ├── Navbar.jsx         # Верхня навігаційна панель з перемикачем режимів та входом
│       ├── LayerPanel.jsx     # Ліва висувна панель перемикання шарів та фільтрів
│       ├── DetailPanel.jsx    # Права панель інспекції деталей вибраного маркера
│       ├── AuthModal.jsx      # Модальне вікно автентифікації (вхід та реєстрація)
│       ├── SavedViewsModal.jsx# Модальне вікно керування пресетами камери та шарів
│       └── StatusBar.jsx      # Нижня панель статусу з активними шарами та FPS
│
├── hooks/
│   ├── useLayerData.js        # Хук періодичного опитування API бекенду
│   └── useGeoConvert.js       # Утиліти геопросторових перетворень (Lat/Lng -> XYZ)
│
└── store/
    └── useStore.js            # Глобальне сховище стану Zustand 5
```

### Оптимізація продуктивності

1. **Рендеринг інстансованих сіток (`InstancedMesh`)**:
   3D-маркери (землетруси, літаки, погодні сфери, астероїди, піни) використовують компоненти `<instancedMesh>` для пакетного рендерингу сотень сутностей за один виклик малювання GPU.
2. **Нульові алокації у циклі кадру (`useFrame`)**:
   Допоміжні об'єкти Three.js (`Vector3`, `Matrix4`, `Color`, `Object3D`) створюються на рівні модуля, що усуває виділення пам'яті в купі та затримки збирача сміття (GC) під час циклу рендерингу 60 Гц.
3. **Однопрохідний GLSL-шейдер Землі**:
   Обчислює змішування дня/ночі та атмосферне розсіювання заходу сонця за один фрагментний прохід шейдера, уникаючи багаторазових проходів освітлення.
4. **Керування життєвим циклом пам'яті GPU**:
   Буфери динамічних орбітальних шляхів та геометрії явно вивільняються у хуках демонтажу компонентів для запобігання витокам відеопам'яті (VRAM).\n