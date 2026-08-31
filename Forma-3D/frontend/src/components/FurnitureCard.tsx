'use client';

/**
 * @file FurnitureCard.tsx
 * @module components/FurnitureCard
 * @description Catalog item card component. Displays custom Lucide React vector icons based on model names,
 * handles hover triggers for the 3D Inspector Box, and provides a "+ Add to Scene" button.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { 
  Sofa, 
  Armchair, 
  Table, 
  BookOpen, 
  Tv, 
  Lamp, 
  LampDesk, 
  LampCeiling, 
  Flower2, 
  Image as ImageIcon, 
  Monitor, 
  Plus, 
  Box, 
  Layers, 
  Grid, 
  DoorClosed, 
  Maximize2, 
  Flame, 
  Landmark, 
  Trees, 
  Sparkles, 
  LucideIcon 
} from 'lucide-react';

export interface FurnitureCardItem {
  name: string;
  file: string;
  id: string;
  category: string;
  defaultName: string;
}

export interface FurnitureCardProps {
  item: FurnitureCardItem;
  onAdd: (item: FurnitureCardItem) => void;
  onHover?: (item: FurnitureCardItem) => void;
}

/**
 * Derives a clean Lucide icon component and vibrant accent color string from a 3D model name.
 * 
 * @param {string} [name=''] - Name of the furniture or architectural item.
 * @returns {{ icon: LucideIcon, color: string }} Icon component and color hex string.
 */
export function getFurnitureIcon(name: string = ''): { icon: LucideIcon, color: string } {
  const n = name.toLowerCase();
  
  if (n.includes('pumpkin') || n.includes('jacko')) return { icon: Flame, color: '#f97316' };
  if (n.includes('candle')) return { icon: Flame, color: '#fbbf24' };
  if (n.includes('statue') || n.includes('angel') || n.includes('stag')) return { icon: Landmark, color: '#38bdf8' };
  if (n.includes('crypt') || n.includes('shrine') || n.includes('arch')) return { icon: Landmark, color: '#a855f7' };
  if (n.includes('tree') || n.includes('pine')) return { icon: Trees, color: '#ea580c' };
  if (n.includes('skull') || n.includes('grave') || n.includes('coffin') || n.includes('bone')) return { icon: Sparkles, color: '#cbd5e1' };
  if (n.includes('fence') || n.includes('pillar')) return { icon: Layers, color: '#94a3b8' };
  if (n.includes('tile') || n.includes('path') || n.includes('floor') || n.includes('підлога')) return { icon: Grid, color: '#fb923c' };

  if (n.includes('стіна') || n.includes('wall')) return { icon: Layers, color: '#38bdf8' };
  if (n.includes('двері') || n.includes('door')) return { icon: DoorClosed, color: '#a3e635' };
  if (n.includes('вікно') || n.includes('window')) return { icon: Maximize2, color: '#38bdf8' };
  if (n.includes('дах') || n.includes('roof')) return { icon: Box, color: '#94a3b8' };
  
  if (n.includes('sofa')) return { icon: Sofa, color: '#1ed760' };
  if (n.includes('chair') || n.includes('pouf') || n.includes('stool')) return { icon: Armchair, color: '#34d399' };
  if (n.includes('table')) return { icon: Table, color: '#60a5fa' };
  if (n.includes('bookshelf') || n.includes('sideboard')) return { icon: BookOpen, color: '#f59e0b' };
  if (n.includes('tv stand') || n.includes('tv')) return { icon: Tv, color: '#a78bfa' };
  if (n.includes('floor lamp')) return { icon: Lamp, color: '#fbbf24' };
  if (n.includes('table lamp')) return { icon: LampDesk, color: '#f59e0b' };
  if (n.includes('chandelier')) return { icon: LampCeiling, color: '#f43f5e' };
  if (n.includes('plant') || n.includes('живопліт')) return { icon: Flower2, color: '#10b981' };
  if (n.includes('painting')) return { icon: ImageIcon, color: '#ec4899' };
  if (n.includes('monitor')) return { icon: Monitor, color: '#3b82f6' };
  
  return { icon: Box, color: '#9ca3af' };
}

/**
 * FurnitureCard Component.
 * 
 * @param {FurnitureCardProps} props - Props.
 * @returns {JSX.Element} Card UI component.
 */
export default function FurnitureCard({ item, onAdd, onHover }: FurnitureCardProps) {
  const tCat = useTranslations('Catalog');
  const { icon: ItemIcon, color } = getFurnitureIcon(item.name);

  return (
    <div 
      className="furniture-card" 
      onMouseEnter={() => onHover && onHover(item)}
    >
      <div className="furniture-card-icon-wrapper" style={{ '--accent-color': color } as React.CSSProperties}>
        <div className="furniture-card-glow" />
        <ItemIcon size={32} className="furniture-card-icon" />
        <span className="furniture-card-badge">3D</span>
      </div>
      
      <div className="furniture-card-footer">
        <div className="furniture-card-info">
          <span className="furniture-card-name" title={item.name}>{item.name}</span>
          <span className="furniture-card-tag">GLB Model</span>
        </div>
        <button 
          className="furniture-card-add-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }} 
          title={tCat('placeIn3D')}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

