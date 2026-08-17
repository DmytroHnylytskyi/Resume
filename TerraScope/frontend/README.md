# 🎨 TerraScope Frontend — Next.js 16 & React Three Fiber

This folder contains the **Next.js 16 App Router** frontend for **TerraScope**, rendering a hardware-accelerated 3D WebGL Earth visualization canvas using **React 19**, **Three.js**, and **React Three Fiber (R3F)**.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Installation & Development Server

```bash
# Install dependencies
npm install

# Launch Next.js dev server on http://localhost:3000
npm run dev
```

---

## 🧱 Component Architecture

```
src/
├── app/
│   ├── layout.js              # Global HTML layout shell & SEO metadata
│   ├── page.js                # Main application page mounting R3F Canvas & Cockpit UI
│   └── globals.css            # Glassmorphism design tokens & global CSS resets
│
├── components/
│   ├── globe/
│   │   ├── Globe.jsx          # R3F Canvas container with OrbitControls & Lighting
│   │   ├── Earth.jsx          # Earth sphere mesh with custom GLSL ShaderMaterial
│   │   ├── Atmosphere.jsx     # Fresnel atmospheric glowing outer halo mesh
│   │   ├── PostProcessing.jsx # EffectComposer with Bloom & Vignette
│   │   └── ErrorBoundary.jsx  # WebGL Canvas Crash Fallback Barrier
│   │
│   ├── layers/
│   │   ├── EarthquakeLayer.jsx# Instanced 3D magnitude columns (USGS dataset)
│   │   ├── FlightLayer.jsx    # Instanced 3D airplane sprites (OpenSky dataset)
│   │   ├── WeatherLayer.jsx   # Instanced capital weather indicator orbs
│   │   ├── NeoLayer.jsx       # Instanced near-Earth asteroids & orbital rings
│   │   ├── CapitalsLayer.jsx  # Instanced 16-segment tapered capital pins
│   │   └── CountryBordersLayer.jsx # Vector country borders GLSL line mesh
│   │
│   └── ui/
│       ├── Navbar.jsx         # Top navigation bar with mode switcher & auth buttons
│       ├── LayerPanel.jsx     # Left drawer for toggling data layers & filters
│       ├── DetailPanel.jsx    # Right inspection drawer showing selected 3D marker metadata
│       ├── AuthModal.jsx      # Login and account registration glassmorphism modal
│       ├── SavedViewsModal.jsx# Saved 3D camera presets and active layers modal
│       └── StatusBar.jsx      # Bottom status dock showing active layers & FPS
│
├── hooks/
│   ├── useLayerData.js        # SWR-like data fetching hook connecting to FastAPI backend
│   └── useGeoConvert.js       # Geographic coordinate transformation utilities (Lat/Lng -> XYZ)
│
└── store/
    └── useStore.js            # Zustand 5 global state store
```

---

## ⚡ Performance Techniques

1. **Instanced Mesh Rendering (`InstancedMesh`)**:
   All 3D markers (earthquakes, planes, weather orbs, asteroids, pins) utilize `<instancedMesh>` components. A single GPU draw call renders up to 1,000+ complex 3D objects at locked 60 FPS.
2. **Zero Allocation in Frame Loop (`useFrame`)**:
   Dummy `THREE.Object3D` instances and math helpers (`Vector3`, `Matrix4`, `Color`) are allocated at module scope. The 60Hz render loop performs zero heap allocations, eliminating Garbage Collection (GC) pauses.
3. **Custom Single-Pass Earth GLSL Shader**:
   Calculates day/night blending and golden twilight scattering in a single fragment shader pass, avoiding heavy multi-light passes.
4. **GPU Memory Lifecycle Management**:
   Dynamic orbital path buffers and geometry allocations are explicitly disposed in `useEffect` teardowns to avoid VRAM bloat.
