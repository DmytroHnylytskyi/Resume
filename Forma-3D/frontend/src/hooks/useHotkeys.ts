'use client';

/**
 * @file useHotkeys.ts
 * @module hooks/useHotkeys
 * @description Custom React hook for capturing global keyboard hotkeys within the 3D editor.
 * Handles key combinations for object duplication (Ctrl+D), deletion (Delete/Backspace),
 * quick rotation (R), transform mode toggles (1/2/3), and selection cancellation (Escape).
 * Automatically ignores hotkey events when text inputs or modals are focused.
 */

import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/**
 * Global keyboard shortcuts listener hook for the 3D configurator.
 * 
 * Shortcuts reference:
 * - `Delete` / `Backspace`: Remove currently selected 3D object from scene.
 * - `Ctrl+D` / `Cmd+D`: Duplicate (clone) selected object with offset.
 * - `Escape`: Cancel current selection / active placement mode.
 * - `1`: Set gizmo mode to Translation.
 * - `2`: Set gizmo mode to Rotation.
 * - `3`: Set gizmo mode to Scale.
 * - `R`: Rotate selected object around Y-axis by +90 degrees.
 * 
 * @returns {void}
 */
export default function useHotkeys(): void {
  const {
    selectedObjectId, removePlacedObject, duplicatePlacedObject,
    setSelectedObjectId, setSelectedObjectPart, setSelectedPart,
    setTransformMode, rotateSelectedObject
  } = useStore();

  useEffect(() => {
    /**
     * Internal event handler for window keydown events.
     * @param {KeyboardEvent} e - Native DOM keyboard event payload.
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore hotkeys when typing inside form inputs
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ctrl+D / Cmd+D -> Clone selected object
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedObjectId) {
          e.preventDefault();
          duplicatePlacedObject(selectedObjectId);
        }
        return;
      }

      switch (e.code) {
        case 'Delete':
        case 'Backspace':
          if (selectedObjectId) {
            e.preventDefault();
            removePlacedObject(selectedObjectId);
          }
          break;

        case 'Escape':
          setSelectedObjectId(null);
          setSelectedObjectPart(null);
          setSelectedPart(null);
          break;

        case 'Digit1':
          setTransformMode('translate');
          break;
        case 'Digit2':
          setTransformMode('rotate');
          break;
        case 'Digit3':
          setTransformMode('scale');
          break;

        case 'KeyR':
          if (selectedObjectId) {
            e.preventDefault();
            rotateSelectedObject(90);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedObjectId, removePlacedObject, duplicatePlacedObject,
    setSelectedObjectId, setSelectedObjectPart, setSelectedPart,
    setTransformMode, rotateSelectedObject
  ]);
}
