'use client';

/**
 * @file TransformToolbar.tsx
 * @module components/TransformToolbar
 * @description Floating bottom transform controls toolbar.
 * Appears dynamically when a 3D object is selected. Provides mode toggles (Translate/Rotate/Scale),
 * quick angle buttons (-90°, -45°, +45°, +90°, 180°), scale preset multipliers (0.5x - 2.0x),
 * duplicate (`Ctrl+D`), and delete actions. Supports full i18n localization.
 */

import { useTranslations } from 'next-intl';
import { useStore } from '../store/useStore';
import { Move, RotateCw, Maximize2, Trash2, Copy, RefreshCw, LucideIcon } from 'lucide-react';
import { TransformMode, PlacedObject } from '../types';
import { catalogItems } from '../data/catalogData';

interface ModeOption {
  key: TransformMode;
  icon: LucideIcon;
  label: string;
  hotkey: string;
}

/**
 * TransformToolbar Component.
 * 
 * @returns {JSX.Element | null} Toolbar floating panel or null when no object selected.
 */
export default function TransformToolbar() {
  const tToolbar = useTranslations('Toolbar');
  const tCat = useTranslations('Catalog.items');

  const { 
    selectedObjectId, placedObjects, transformMode, 
    setTransformMode, removePlacedObject, duplicatePlacedObject,
    rotateSelectedObject, setSelectedObjectScale 
  } = useStore();

  if (!selectedObjectId) return null;

  const modes: ModeOption[] = [
    { key: 'translate', icon: Move,       label: tToolbar('translate'), hotkey: '1' },
    { key: 'rotate',    icon: RotateCw,   label: tToolbar('rotate'),    hotkey: '2' },
    { key: 'scale',     icon: Maximize2,  label: tToolbar('scale'),     hotkey: '3' },
  ];

  const selectedObj = placedObjects.find((o: PlacedObject) => o.id === selectedObjectId);
  const catalogItem = selectedObj ? catalogItems.find(c => (selectedObj.modelPath || '').includes(c.file)) : null;

  let objName = selectedObj?.name || 'Object';
  if (catalogItem) {
    if (tCat.has(catalogItem.id)) {
      objName = tCat(catalogItem.id);
    } else {
      objName = catalogItem.defaultName || 'Object';
    }
  }


  const currentScale = selectedObj?.scale || 1.0;
  const currentDegY = selectedObj?.rotation ? Math.round((selectedObj.rotation[1] * 180) / Math.PI) : 0;

  return (
    <div className="transform-toolbar glass-panel">
      <div className="transform-toolbar-header">
        <span className="transform-toolbar-label">{objName}</span>
      </div>

      {/* Mode Switcher Buttons */}
      <div className="transform-toolbar-modes">
        {modes.map(({ key, icon: Icon, label, hotkey }) => (
          <button
            key={key}
            className={`transform-btn${transformMode === key ? ' active' : ''}`}
            onClick={() => setTransformMode(key)}
            title={`${label} (${hotkey})`}
          >
            <Icon size={15} />
            <span className="transform-btn-label">{label}</span>
            <kbd className="transform-btn-hotkey">{hotkey}</kbd>
          </button>
        ))}
      </div>

      <div className="transform-toolbar-divider" />

      {/* Quick Precision Rotation Helpers (+90°, -90°, +45°, 180°) */}
      <div className="transform-toolbar-group">
        <span className="transform-toolbar-sublabel"><RefreshCw size={13} /> {tToolbar('rotationLabel')} ({currentDegY}°):</span>
        <div className="transform-preset-buttons">
          <button className="transform-mini-btn" onClick={() => rotateSelectedObject(-90)} title="-90°">-90°</button>
          <button className="transform-mini-btn" onClick={() => rotateSelectedObject(-45)} title="-45°">-45°</button>
          <button className="transform-mini-btn" onClick={() => rotateSelectedObject(45)} title="+45°">+45°</button>
          <button className="transform-mini-btn" onClick={() => rotateSelectedObject(90)} title="+90° (R)">+90°</button>
          <button className="transform-mini-btn" onClick={() => rotateSelectedObject(180)} title="180°">180°</button>
        </div>
      </div>

      <div className="transform-toolbar-divider" />

      {/* Quick Dimension & Scale Helpers (Presets + Exact Input) */}
      <div className="transform-toolbar-group">
        <span className="transform-toolbar-sublabel"><Maximize2 size={13} /> {tToolbar('scaleLabel')}:</span>
        <div className="transform-preset-buttons">
          <button className={`transform-mini-btn ${currentScale === 0.5 ? 'active' : ''}`} onClick={() => setSelectedObjectScale(0.5)}>0.5×</button>
          <button className={`transform-mini-btn ${currentScale === 0.75 ? 'active' : ''}`} onClick={() => setSelectedObjectScale(0.75)}>0.75×</button>
          <button className={`transform-mini-btn ${currentScale === 1.0 ? 'active' : ''}`} onClick={() => setSelectedObjectScale(1.0)}>1.0×</button>
          <button className={`transform-mini-btn ${currentScale === 1.25 ? 'active' : ''}`} onClick={() => setSelectedObjectScale(1.25)}>1.25×</button>
          <button className={`transform-mini-btn ${currentScale === 1.5 ? 'active' : ''}`} onClick={() => setSelectedObjectScale(1.5)}>1.5×</button>
          <button className={`transform-mini-btn ${currentScale === 2.0 ? 'active' : ''}`} onClick={() => setSelectedObjectScale(2.0)}>2.0×</button>
        </div>
      </div>

      <div className="transform-toolbar-divider" />

      {/* Action Buttons: Clone & Delete */}
      <div className="transform-toolbar-actions">
        <button
          className="transform-btn clone"
          onClick={() => duplicatePlacedObject()}
          title={tToolbar('cloneTooltip')}
        >
          <Copy size={15} />
          <span className="transform-btn-label">{tToolbar('clone')}</span>
        </button>

        <button
          className="transform-btn delete"
          onClick={() => removePlacedObject()}
          title={tToolbar('deleteTooltip')}
        >
          <Trash2 size={15} />
          <span className="transform-btn-label">{tToolbar('delete')}</span>
        </button>
      </div>
    </div>
  );
}
