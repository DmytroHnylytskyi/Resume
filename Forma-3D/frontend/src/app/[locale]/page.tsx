'use client';

/**
 * @file page.tsx
 * @module app/[locale]/page
 * @description Main application page component rendering the 3D Scene Viewport, Top Navbar,
 * UI overlay modals, bilingual EN/UK locale switcher button, and performance-optimized state management.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import ColorPicker from '../../components/ColorPicker';
import AuthModal from '../../components/AuthModal';
import InstructionModal from '../../components/InstructionModal';
import UserProfileModal from '../../components/UserProfileModal';
import MobileNoticeModal from '../../components/MobileNoticeModal';
import FurnitureCatalog from '../../components/FurnitureCatalog';
import TransformToolbar from '../../components/TransformToolbar';
import SceneViewport from '../../components/SceneViewport';
import Toast from '../../components/Toast';
import useHotkeys from '../../hooks/useHotkeys';
import { useStore } from '../../store/useStore';
import { 
  Sparkles, 
  HelpCircle,
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
 * 
 * @returns {JSX.Element} The full-page 3D viewport layout.
 */
export default function Home() {
  const tNav = useTranslations('Navbar');
  const tPlacement = useTranslations('Placement');
  
  /** Device restriction state (phones and tablets restricted from 3D configurator) */
  const [mounted, setMounted] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkRestricted = () => {
      const ua = navigator.userAgent || '';
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(ua);
      const isIPadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
      const isTouchCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const isNarrowScreen = window.innerWidth <= 1024;
      return isMobileUA || isIPadOS || (isTouchCoarse && isNarrowScreen);
    };

    setIsRestricted(checkRestricted());

    const handleResize = () => {
      setIsRestricted(checkRestricted());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /** Reference to hidden file input for JSON import */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** State controlling instruction modal visibility */
  const [showInstruction, setShowInstruction] = useState(false);

  /** State controlling user profile modal visibility */
  const [showProfile, setShowProfile] = useState(false);

  // Granular state selectors for UI toolbar
  const locale = useStore((state) => state.locale);
  const toggleLocale = useStore((state) => state.toggleLocale);
  const authMode = useStore((state) => state.authMode);
  const setAuthMode = useStore((state) => state.setAuthMode);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const placedObjectsCount = useStore((state) => state.placedObjects.length);
  const snapToGrid = useStore((state) => state.snapToGrid);
  const toggleSnapToGrid = useStore((state) => state.toggleSnapToGrid);
  const lightMode = useStore((state) => state.lightMode);
  const toggleLightMode = useStore((state) => state.toggleLightMode);
  const saveToLocalStorage = useStore((state) => state.saveToLocalStorage);
  const loadFromLocalStorage = useStore((state) => state.loadFromLocalStorage);
  const exportJSON = useStore((state) => state.exportJSON);
  const importJSON = useStore((state) => state.importJSON);
  const clearAllPlacedObjects = useStore((state) => state.clearAllPlacedObjects);
  const placingModelPath = useStore((state) => state.placingModelPath);
  const cancelPlacement = useStore((state) => state.cancelPlacement);
  const addToast = useStore((state) => state.addToast);
  
  // Register global hotkey listeners (Ctrl+D, Delete, 1/2/3, R, Esc)
  useHotkeys();

  /** Handles saving current scene state to browser localStorage */
  const handleSave = () => {
    const success = saveToLocalStorage();
    if (success) {
      addToast(tNav('savedSuccess'), 'success');
    }
  };

  /** Handles loading saved scene state from browser localStorage */
  const handleLoad = () => {
    const success = loadFromLocalStorage();
    if (success) {
      addToast(tNav('loadedSuccess'), 'success');
    } else {
      addToast(tNav('notFound'), 'error');
    }
  };

  /**
   * Handles JSON file selection and imports scene configuration.
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event.
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const success = importJSON(content);
        if (success) {
          addToast(tNav('importSuccess'), 'success');
        } else {
          addToast(tNav('importError'), 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  // ── Dedicated View for Mobile Phones & Tablets (Strict Restriction) ──
  // Neither WebGL 3D Canvas nor desktop UI headers are mounted in DOM
  if (mounted && isRestricted) {
    return (
      <main className="device-restricted-viewport">
        <MobileNoticeModal />
      </main>
    );
  }

  // Clean SSR / Hydration placeholder with matching theme background
  if (!mounted) {
    return <main className="device-restricted-viewport" />;
  }

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
            <span className="navbar-tool-label">{snapToGrid ? tNav('magnetOn') : tNav('magnetOff')}</span>
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
            title={tNav('langTooltip')}
            suppressHydrationWarning
          >
            <Globe size={16} />
            <span className="navbar-tool-label" suppressHydrationWarning>{locale.toUpperCase()}</span>
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

          {placedObjectsCount > 0 && (
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
      <Toast />

      {/* ── Top Floating 3D Placement Active Banner ── */}
      {placingModelPath && (
        <div className="placement-active-banner glass-panel">
          <Sparkles size={16} className="placement-banner-icon" />
          <span><b>{tPlacement('active')}</b> {tPlacement('instructions')}</span>
          <button className="placement-cancel-btn" onClick={cancelPlacement}>{tPlacement('cancel')}</button>
        </div>
      )}

      {/* ── WebGL 3D Scene Viewport (Memoized & Isolated) ── */}
      <SceneViewport />
    </main>
  );
}
