'use client';

/**
 * @file ColorPicker.tsx
 * @module components/ColorPicker
 * @description Floating panel component providing a visual color picker (`react-colorful`)
 * for updating the material hex colors of selected 3D object sub-meshes. Supports full i18n localization.
 * 
 * @author Forma-3D Team
 */

import { useTranslations } from 'next-intl';
import { useStore } from '../store/useStore';
import { X, Copy } from 'lucide-react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { PlacedObject } from '../types';
import { catalogItems } from '../data/catalogData';

/**
 * ColorPicker Modal Panel Component.
 * 
 * @returns {JSX.Element | null} Color picker panel or null when no sub-mesh part is selected.
 */
export default function ColorPicker() {
  const tPicker = useTranslations('ColorPicker');
  const tCat = useTranslations('Catalog.items');
  const { 
    selectedPart, colors, updateColor, setSelectedPart,
    selectedObjectId, selectedObjectPart, placedObjects, updateObjectColor, setSelectedObjectPart
  } = useStore();

  const activePart = selectedObjectPart || selectedPart;
  
  if (!activePart) return null;

  // Resolve clean, user-friendly catalog name for the selected object
  const selectedObj = selectedObjectId ? placedObjects.find((o: PlacedObject) => o.id === selectedObjectId) : null;
  const catalogItem = selectedObj ? catalogItems.find(c => (selectedObj.modelPath || '').includes(c.file)) : null;

  let headerTitle = activePart.replace(/_/g, ' ');
  if (catalogItem) {
    try {
      headerTitle = tCat(catalogItem.id);
    } catch {
      headerTitle = catalogItem.defaultName;
    }
  } else if (selectedObj?.name) {
    headerTitle = selectedObj.name;
  }

  let currentColor = '#ffffff';
  if (selectedObjectId) {
    const obj = placedObjects.find((o: PlacedObject) => o.id === selectedObjectId);
    if (obj && obj.colors && selectedObjectPart && obj.colors[selectedObjectPart]) {
      currentColor = obj.colors[selectedObjectPart];
    }
  } else if (selectedPart) {
    currentColor = colors[selectedPart] || '#ffffff';
  }

  /** Updates color in Zustand state */
  const handleColorChange = (newColor: string) => {
    if (selectedObjectId && selectedObjectPart) {
      updateObjectColor(selectedObjectId, selectedObjectPart, newColor);
    } else if (selectedPart) {
      updateColor(selectedPart, newColor);
    }
  };

  /** Copies active HEX code string to system clipboard */
  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentColor);
  };

  return (
    <div style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', width: '320px', zIndex: 20 }} className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--color-glass-border)' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'capitalize' }}>
          {headerTitle}
        </h3>
        <button onClick={() => { setSelectedPart(null); setSelectedObjectPart(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text)'}>
          <X size={20} />
        </button>
      </div>
      
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="custom-color-picker">
          <HexColorPicker color={currentColor} onChange={handleColorChange} style={{ width: '100%', height: '220px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', backgroundColor: currentColor,
            border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>{tPicker('hexLabel')}</span>
            <HexColorInput color={currentColor} onChange={handleColorChange} prefixed style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.1rem', outline: 'none', width: '100%', fontFamily: 'monospace' }} />
          </div>
          <button onClick={copyToClipboard} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background='rgba(255,255,255,0.2)'}} onMouseLeave={e => {e.currentTarget.style.background='rgba(255,255,255,0.1)'}} title={tPicker('copyHex')}>
            <Copy size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
