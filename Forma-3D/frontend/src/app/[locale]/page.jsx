'use client';

/**
 * @file page.jsx
 * @module app/[locale]/page
 * @description Main application page component rendering the 3D Canvas, Top Navbar,
 * dynamic lights, environment atmosphere presets, 60m floor grid visualizer, UI overlay modals,
 * seamless EN/UK locale switcher button, and performance boosters (AdaptiveDpr, high-performance WebGL gl config).
 * 
 * @author 3D Furniture Configurator Team
 */

import { useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { Environment, AdaptiveDpr } from '@react-three/drei';
import { Suspense } from 'react';
import ColorPicker from '../../components/ColorPicker';
import AuthModal from '../../components/AuthModal';
import InstructionModal from '../../components/InstructionModal';
import UserProfileModal from '../../components/UserProfileModal';
import FurnitureCatalog from '../../components/FurnitureCatalog';
import PlaceableObject from '../../components/PlaceableObject';
import CameraNavigationController from '../../components/CameraNavigationController';
import TransformToolbar from '../../components/TransformToolbar';
import InteractivePlacementGhost from '../../components/InteractivePlacementGhost';
import useHotkeys from '../../hooks/useHotkeys';
import { useStore } from '../../store/useStore';
import { 
  Sparkles, 
  HelpCircle,
  Building2,
  User, 
  LogOut, 
  Sun, 
  Moon, 
  Magnet, 
  Save, 
  RotateCcw, 
  Download, 
  Upload,
  Trash2,
  Globe
} from 'lucide-react';

/**
 * Main 3D Editor & Configurator Page Component.
 * Initializes the R3F Canvas WebGL renderer, environment lighting, and floating UI toolbars.
 * 
 * @returns {JSX.Element} The full-page 3D viewport layout.
 */
export default function Home() {
  const tNav = useTranslations('Navbar');
  const tPlacement = useTranslations('Placement');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  /** @type {React.RefObject<HTMLInputElement>} Reference to hidden file input for JSON import */
  const fileInputRef = useRef(null);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} State controlling instruction modal visibility */
  const [showInstruction, setShowInstruction] = useState(false);

  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} State controlling user profile modal visibility */
  const [showProfile, setShowProfile] = useState(false);

  // Extract global state store selectors and actions
  const { 
    authMode, setAuthMode, user, logout, 
    placedObjects, setSelectedObjectId, 
    setSelectedObjectPart, setSelectedPart,
    snapToGrid, toggleSnapToGrid,
    lightMode, toggleLightMode,
    saveToLocalStorage, loadFromLocalStorage,
    exportJSON, importJSON, clearAllPlacedObjects,
    loadAntiquePalace, loadEmptyCanvas,
    placingModelPath, cancelPlacement,
    activeMode, currentProjectName
  } = useStore();
  
  // Register global hotkey listeners (Ctrl+D, Delete, 1/2/3, R, Esc)
  useHotkeys();

  /**
   * Toggles active locale between English ('en') and Ukrainian ('uk').
   */
  const toggleLocale = () => {
    const nextLocale = locale === 'en' ? 'uk' : 'en';
    const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
    router.push(newPath.startsWith('/') ? newPath : `/${newPath}`);
  };

  /**
   * Pointer miss handler for the R3F Canvas.
   * Clears selection when user clicks on empty 3D space.
   * @param {import('@react-three/fiber').ThreeEvent<MouseEvent>} e - ThreeEvent object.
   */
  const handlePointerMissed = (e) => {
    if (e.type === 'click') {
      setSelectedObjectId(null);
      setSelectedObjectPart(null);
      setSelectedPart(null);
    }
  };

  /** Handles saving current scene state to browser localStorage */
  const handleSave = () => {
    const success = saveToLocalStorage();
    if (success) {
      alert(tNav('savedSuccess'));
    }
  };

  /** Handles loading saved scene state from browser localStorage */
  const handleLoad = () => {
    const success = loadFromLocalStorage();
    if (success) {
      alert(tNav('loadedSuccess'));
    } else {
      alert(tNav('notFound'));
    }
  };

  /**
   * Handles JSON file selection and imports scene configuration.
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event.
   */
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (content) {
        const success = importJSON(content);
        if (success) {
          alert(tNav('importSuccess'));
        } else {
          alert(tNav('importError'));
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="main-viewport">
      {/* Hidden file input element for JSON project import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json" 
        onChange={handleFileUpload} 
      />

      {/* ── Top Floating Header & Tool Bar ── */}
      <header className="top-navbar glass-panel">
        <div className="navbar-brand">
          <Sparkles className="navbar-brand-icon" size={20} />
          <h1 className="navbar-title">{tNav('title')}</h1>
        </div>

        {/* Center Control Toolbar: Day/Night, Magnet Snap, Save/Load/JSON, Language Switcher */}
        <div className="navbar-toolbar-controls">
          <button 
            className={`navbar-tool-btn ${lightMode === 'night' ? 'active' : ''}`}
            onClick={toggleLightMode}
            title={lightMode === 'day' ? tNav('dayTooltip') : tNav('nightTooltip')}
          >
            {lightMode === 'day' ? <Sun size={16} /> : <Moon size={16} />}
            <span className="navbar-tool-label">{lightMode === 'day' ? tNav('day') : tNav('night')}</span>
          </button>

          <button 
            className={`navbar-tool-btn ${snapToGrid ? 'active' : ''}`}
            onClick={toggleSnapToGrid}
            title={tNav('magnetTooltip')}
          >
            <Magnet size={16} />
            <span className="navbar-tool-label">Magnet {snapToGrid ? 'ON' : 'OFF'}</span>
          </button>

          <button 
            className="navbar-tool-btn"
            onClick={() => setShowInstruction(true)}
            title={tNav('instructionTooltip')}
          >
            <HelpCircle size={16} />
            <span className="navbar-tool-label">{tNav('instruction')}</span>
          </button>

          <div className="navbar-toolbar-divider" />

          {/* Bilingual Language Switcher Button */}
          <button 
            className="navbar-tool-btn active"
            onClick={toggleLocale}
            title={locale === 'en' ? 'Switch language to Ukrainian' : 'Змінити мову на англійську'}
          >
            <Globe size={16} />
            <span className="navbar-tool-label">{locale.toUpperCase()}</span>
          </button>

          <div className="navbar-toolbar-divider" />

          <button 
            className={`navbar-tool-btn ${activeMode === 'example' ? 'active' : ''}`} 
            onClick={loadAntiquePalace} 
            title={tNav('presetExampleTooltip')}
          >
            <Building2 size={15} />
            <span className="navbar-tool-label">{tNav('presetExample')}</span>
          </button>

          <button 
            className={`navbar-tool-btn ${activeMode === 'custom' ? 'active' : ''}`} 
            onClick={loadEmptyCanvas} 
            title={tNav('presetCleanTooltip')}
          >
            <Sparkles size={15} />
            <span className="navbar-tool-label">{activeMode === 'custom' ? (currentProjectName === 'Проєкт Приклад' ? tNav('presetExample') : currentProjectName) : tNav('presetClean')}</span>
          </button>

          <div className="navbar-toolbar-divider" />

          <button className="navbar-tool-btn" onClick={handleSave} title={tNav('saveTooltip')}>
            <Save size={15} />
            <span className="navbar-tool-label">{tNav('save')}</span>
          </button>

          <button className="navbar-tool-btn" onClick={handleLoad} title={tNav('restoreTooltip')}>
            <RotateCcw size={15} />
            <span className="navbar-tool-label">{tNav('restore')}</span>
          </button>

          <button className="navbar-tool-btn" onClick={exportJSON} title={tNav('exportJsonTooltip')}>
            <Download size={15} />
          </button>

          <button className="navbar-tool-btn" onClick={() => fileInputRef.current?.click()} title={tNav('importJsonTooltip')}>
            <Upload size={15} />
          </button>

          {placedObjects.length > 0 && (
            <button className="navbar-tool-btn danger" onClick={clearAllPlacedObjects} title={tNav('clearAllTooltip')}>
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* User Auth Info / Login Buttons */}
        <div className="navbar-actions">
          {user ? (
            <div 
              className="navbar-user-info" 
              onClick={() => setShowProfile(true)}
              title={tNav('profileTooltip')}
              style={{ cursor: 'pointer' }}
            >
              <User size={15} />
              <span className="navbar-username">{user.name}</span>
              <button 
                className="glass-button navbar-logout-btn" 
                onClick={(e) => { e.stopPropagation(); logout(); }} 
                title={tNav('logout')}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="navbar-auth-buttons">
              <button className="glass-button" onClick={() => setAuthMode('login')}>{tNav('login')}</button>
              <button className="glass-button primary" onClick={() => setAuthMode('register')}>{tNav('register')}</button>
            </div>
          )}
        </div>
      </header>
      
      {/* Overlay Modals & Color Picker Toolbars */}
      {authMode && <AuthModal onClose={() => setAuthMode(null)} />}
      {showInstruction && <InstructionModal onClose={() => setShowInstruction(false)} />}
      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
      <ColorPicker />
      <FurnitureCatalog />
      <TransformToolbar />

      {/* ── Top Floating 3D Placement Active Banner ── */}
      {placingModelPath && (
        <div className="placement-active-banner glass-panel">
          <Sparkles size={16} className="placement-banner-icon" />
          <span><b>{tPlacement('active')}</b> {tPlacement('instructions')}</span>
          <button className="placement-cancel-btn" onClick={cancelPlacement}>{tPlacement('cancel')}</button>
        </div>
      )}

      {/* ── WebGL 3D Canvas (High Performance Options) ── */}
      <Canvas 
        camera={{ position: [8, 6, 8], fov: 45, far: 1000 }} 
        onPointerMissed={handlePointerMissed}
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: false, 
          powerPreference: 'high-performance', 
          stencil: false, 
          depth: true 
        }}
      >
        {/* Adaptive Pixel Ratio for 60 FPS lock during fast camera rotations */}
        <AdaptiveDpr pixelated />

        {/* Dynamic 3D Scene Background & Infinite Atmosphere Fog */}
        <color attach="background" args={[lightMode === 'day' ? '#142721' : '#020608']} />
        <fog attach="fog" args={[lightMode === 'day' ? '#142721' : '#020608', 120, 500]} />

        {/* Day / Night Dynamic Lighting Config */}
        {lightMode === 'day' ? (
          <>
            <ambientLight intensity={1.4} color="#ffffff" />
            <directionalLight 
              position={[25, 45, 20]} 
              intensity={2.8} 
              castShadow 
              color="#fff8eb" 
              shadow-mapSize={[1024, 1024]}
              shadow-camera-far={80}
              shadow-camera-left={-35}
              shadow-camera-right={35}
              shadow-camera-top={35}
              shadow-camera-bottom={-35}
              shadow-bias={-0.0001}
            />
            <directionalLight position={[-20, 25, -20]} intensity={1.2} color="#e0f2fe" />
            <directionalLight position={[0, 30, 0]} intensity={0.8} color="#f1f5f9" />
            <Environment preset="apartment" />
          </>
        ) : (
          <>
            <ambientLight intensity={0.18} color="#1e293b" />
            <directionalLight 
              position={[15, 25, 10]} 
              intensity={0.6} 
              color="#38bdf8" 
              castShadow 
              shadow-mapSize={[1024, 1024]}
              shadow-camera-far={60}
            />
            <directionalLight position={[-10, 10, -10]} intensity={0.2} color="#1e1b4b" />
            <Environment preset="night" />
          </>
        )}

        {/* 3D Floor Grid Visualizer (Expanded 60x60m area with 0.5m grid step) */}
        {snapToGrid && (
          <gridHelper 
            args={[60, 120, lightMode === 'day' ? "#1ed760" : "#38bdf8", lightMode === 'day' ? "#0c3b28" : "#0f2942"]} 
            position={[0, -0.01, 0]} 
          />
        )}

        {/* Camera Navigation Controller (Unreal Engine 5 RMB + WASD Fly-cam) */}
        <CameraNavigationController />

        {/* Render Active 3D Objects & Placement Ghost */}
        <Suspense fallback={null}>
          <InteractivePlacementGhost />
          {placedObjects.map((obj) => (
            <PlaceableObject 
              key={obj.id} 
              id={obj.id}
              modelPath={obj.modelPath}
              nodeName={obj.nodeName}
              scale={obj.scale}
              position={obj.position}
              rotation={obj.rotation}
              objectColors={obj.colors}
            />
          ))}
        </Suspense>
      </Canvas>
    </main>
  );
}
