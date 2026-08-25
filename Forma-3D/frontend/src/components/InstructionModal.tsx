'use client';

/**
 * @file InstructionModal.tsx
 * @module components/InstructionModal
 * @description User manual and hotkeys reference modal component.
 * Displays keyboard navigation rules (UE5 fly cam), building block placement steps,
 * transform toolbar usage, and project persistence instructions. Supports full i18n localization.
 * 
 * @author Forma-3D Team
 */

import { useTranslations } from 'next-intl';
import { 
  X, 
  Navigation, 
  Move, 
  RotateCw, 
  Maximize2, 
  Copy, 
  HelpCircle, 
  Sparkles, 
  Save, 
  Palette 
} from 'lucide-react';

interface InstructionModalProps {
  onClose: () => void;
}

/**
 * InstructionModal Component.
 * 
 * @param {Object} props - Component props.
 * @param {() => void} props.onClose - Callback function to close the instruction modal.
 * @returns {JSX.Element} Instruction overlay modal dialog.
 */
export default function InstructionModal({ onClose }: InstructionModalProps) {
  const tIns = useTranslations('Instruction');

  return (
    <div className="instruction-modal-overlay" onClick={onClose}>
      <div 
        className="instruction-modal-card glass-panel" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="instruction-modal-header">
          <div className="instruction-modal-title-group">
            <HelpCircle className="instruction-modal-title-icon" size={22} />
            <h2>{tIns('title')}</h2>
          </div>
          <button className="instruction-modal-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="instruction-modal-body">
          {/* Section 1: Camera Navigation */}
          <div className="instruction-section">
            <div className="instruction-section-title">
              <Navigation size={18} className="instruction-icon" />
              <h3>{tIns('section1')}</h3>
            </div>
            <div className="instruction-grid">
              <div className="instruction-item">
                <span className="instruction-key">{tIns('lmbDrag')}</span>
                <span className="instruction-desc">{tIns('lmbDragDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('rmbWasd')}</span>
                <span className="instruction-desc">{tIns('rmbWasdDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('qeFlight')}</span>
                <span className="instruction-desc">{tIns('qeFlightDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('shiftBoost')}</span>
                <span className="instruction-desc">{tIns('shiftBoostDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('clickFocus')}</span>
                <span className="instruction-desc">{tIns('clickFocusDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('wheelZoom')}</span>
                <span className="instruction-desc">{tIns('wheelZoomDesc')}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Building & Adding Objects */}
          <div className="instruction-section">
            <div className="instruction-section-title">
              <Sparkles size={18} className="instruction-icon" />
              <h3>{tIns('section2')}</h3>
            </div>
            <div className="instruction-grid">
              <div className="instruction-item">
                <span className="instruction-key">{tIns('catalogLeft')}</span>
                <span className="instruction-desc">{tIns('catalogLeftDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('magnetMode')}</span>
                <span className="instruction-desc">{tIns('magnetModeDesc')}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Object Editing Tools */}
          <div className="instruction-section">
            <div className="instruction-section-title">
              <Move size={18} className="instruction-icon" />
              <h3>{tIns('section3')}</h3>
            </div>
            <div className="instruction-grid">
              <div className="instruction-item">
                <span className="instruction-key"><Move size={12} /> {tIns('gizmoModes')}</span>
                <span className="instruction-desc">{tIns('gizmoModesDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key"><Copy size={12} /> {tIns('cloneHotkey')}</span>
                <span className="instruction-desc">{tIns('cloneHotkeyDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key"><RotateCw size={12} /> {tIns('rotateButtons')}</span>
                <span className="instruction-desc">{tIns('rotateButtonsDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key"><Maximize2 size={12} /> {tIns('scaleButtons')}</span>
                <span className="instruction-desc">{tIns('scaleButtonsDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key"><Palette size={12} /> {tIns('colorPalette')}</span>
                <span className="instruction-desc">{tIns('colorPaletteDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('deleteHotkey')}</span>
                <span className="instruction-desc">{tIns('deleteHotkeyDesc')}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Projects & Export */}
          <div className="instruction-section">
            <div className="instruction-section-title">
              <Save size={18} className="instruction-icon" />
              <h3>{tIns('section4')}</h3>
            </div>
            <div className="instruction-grid">
              <div className="instruction-item">
                <span className="instruction-key">{tIns('cloudProjects')}</span>
                <span className="instruction-desc">{tIns('cloudProjectsDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('browserSave')}</span>
                <span className="instruction-desc">{tIns('browserSaveDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('jsonFile')}</span>
                <span className="instruction-desc">{tIns('jsonFileDesc')}</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-key">{tIns('clearScene')}</span>
                <span className="instruction-desc">{tIns('clearSceneDesc')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
