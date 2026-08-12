'use client';

/**
 * @file FurnitureCatalog.tsx
 * @module components/FurnitureCatalog
 * @description Collapsible sidebar catalog containing 127 modular furniture and architectural 3D building blocks.
 * Features real-time bilingual text search, horizontal category scroll controls, and an interactive 3D Inspector preview box
 * that dynamically auto-scales and rotates hovered GLB models using centralized normalizeModelGeometry.
 * 
 * @author 3D Furniture Configurator Team
 */

import { useState, useRef, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useTranslations } from 'next-intl';
import { useStore } from '../store/useStore';
import { PanelLeftOpen, X, Search, Sparkles, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import FurnitureCard, { FurnitureCardItem } from './FurnitureCard';
import { catalogCategories, catalogItems } from '../data/catalogData';
import { normalizeModelGeometry } from '../utils/modelNormalization';

/**
 * 3D Holographic Loading Spinner Component for the Inspector Box.
 */
function InspectorLoadingSpinner() {
  const meshRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 1.5;
      meshRef.current.rotation.y += delta * 2.0;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <octahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#1ed760" wireframe transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

interface SinglePreviewModelProps {
  file: string;
}

/**
 * Single 3D Preview Inspector Model Component.
 * Automatically centers geometry, normalizes max bounding dimension to ~1.45 units, and rotates scene continuous on Y-axis.
 * 
 * @param {SinglePreviewModelProps} props - Props.
 * @returns {JSX.Element | null} R3F group element.
 */
function SinglePreviewModel({ file }: SinglePreviewModelProps) {
  const { scene } = useGLTF(`/model/${file}`);
  const groupRef = useRef<THREE.Group>(null);

  const { clonedWrapper, fitScale } = useMemo(() => {
    if (!scene) return { clonedWrapper: null, fitScale: 1 };
    const clone = scene.clone(true);
    const { wrapper, normalizedScale } = normalizeModelGeometry(clone, file);
    
    // Scale wrapper by normalizedScale to compute exact metric dimensions
    wrapper.scale.setScalar(normalizedScale);
    wrapper.updateMatrixWorld(true);
    
    const box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Center the model in ALL 3 dimensions (X, Y, Z) so the camera (looking at 0,0,0)
    // frames the exact center of the object (prevents tall arches or high models from clipping at the top)
    clone.position.y -= (center.y / (normalizedScale || 1));

    // Recompute bounding box & sphere after true 3D centering
    wrapper.updateMatrixWorld(true);
    const centeredBox = new THREE.Box3().setFromObject(wrapper);
    const sphere = new THREE.Sphere();
    centeredBox.getBoundingSphere(sphere);
    centeredBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const radius = Math.max(sphere.radius, maxDim / 2, 0.001);

    // Target fit radius: 1.0 (bounding diameter 2.0 inside camera frustum)
    const targetRadius = 1.0;
    const autoFit = targetRadius / radius;
    
    // Reset wrapper scale (applied cleanly via outer group)
    wrapper.scale.setScalar(1);
    
    return { clonedWrapper: wrapper, fitScale: normalizedScale * autoFit };
  }, [scene, file]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.9;
    }
  });

  if (!clonedWrapper) return null;

  return (
    <group ref={groupRef}>
      <group scale={[fitScale, fitScale, fitScale]}>
        <primitive object={clonedWrapper} />
      </group>
    </group>
  );
}

/**
 * Main Furniture & Architectural Building Block Catalog Sidebar Component.
 * 
 * @returns {JSX.Element} Collapsible sidebar drawer with cards, search, and 3D preview box.
 */
export default function FurnitureCatalog() {
  const tCat = useTranslations('Catalog');
  const { startPlacement } = useStore();

  /** Sidebar collapsed/open state */
  const [isOpen, setIsOpen] = useState(false);

  /** Active category filter ID */
  const [activeCategory, setActiveCategory] = useState('all');

  /** Text search filter string */
  const [search, setSearch] = useState('');

  /** Hovered item object for 3D Inspector Box */
  const [hoveredItem, setHoveredItem] = useState<FurnitureCardItem | null>(null);

  /** Ref timer for debouncing hover inspection */
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  /** Ref to horizontal scrollable category pills container */
  const tabsRef = useRef<HTMLDivElement>(null);

  /** Resolves localized name for a catalog item */
  const getItemDisplayName = (item: any): string => {
    if (!item) return '';
    try {
      if (tCat.has(`items.${item.id}`)) {
        return tCat(`items.${item.id}`);
      }
    } catch {
      // fallback
    }
    return item.defaultName || item.file;
  };

  /** Maps category ID to localized translation string */
  const getCategoryLabel = (catId: string): string => {
    try {
      if (tCat.has(`categories.${catId}`)) {
        return tCat(`categories.${catId}`);
      }
    } catch {
      // fallback
    }
    return catId;
  };

  /** Triggers 3D placement mode for selected item */
  const handleAddItem = (item: FurnitureCardItem) => {
    startPlacement(`/model/${item.file}`);
    setIsOpen(false);
  };

  /** Debounced hover handler for 3D Inspector with automatic preloading */
  const handleCardHover = (item: FurnitureCardItem) => {
    if (!item) return;
    try {
      useGLTF.preload(`/model/${item.file}`);
    } catch {
      // ignore
    }
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoveredItem(item);
    }, 60);
  };

  // Filter items by category and localized search string
  const categoryItems = useMemo(() => {
    if (activeCategory === 'all') return catalogItems;
    return catalogItems.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  const localizedItems = useMemo<FurnitureCardItem[]>(() => {
    return categoryItems.map(item => ({
      ...item,
      name: getItemDisplayName(item)
    }));
  }, [categoryItems, tCat]);

  const filteredItems = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return localizedItems;
    return localizedItems.filter(item =>
      item.name.toLowerCase().includes(s) || item.file.toLowerCase().includes(s)
    );
  }, [localizedItems, search]);

  const currentPreviewItem = hoveredItem 
    ? { ...hoveredItem, name: getItemDisplayName(hoveredItem) }
    : filteredItems[0] || null;

  return (
    <>
      {/* Sidebar Toggle Button */}
      {!isOpen && (
        <button
          className="sidebar-toggle-btn glass-panel"
          onClick={() => setIsOpen(true)}
          title={tCat('toggleTitle')}
        >
          <PanelLeftOpen size={22} />
          <span className="sidebar-toggle-text">{tCat('toggleBtn')}</span>
        </button>
      )}

      {/* Main Collapsible Sidebar Drawer */}
      <aside className={`furniture-sidebar glass-panel ${isOpen ? 'open' : 'closed'}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-title-group">
            <Package size={20} className="sidebar-title-icon" />
            <h2 className="sidebar-title">{tCat('title')}</h2>
            <span className="sidebar-badge">{filteredItems.length}</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live 3D Inspector Box */}
        <div className="sidebar-inspector-box">
          <div className="sidebar-inspector-header">
            <Sparkles size={14} className="inspector-sparkle" />
            <span className="inspector-title">
              {currentPreviewItem ? currentPreviewItem.name : tCat('inspectorTitle')}
            </span>
          </div>
          <div className="sidebar-inspector-canvas-container">
            {currentPreviewItem ? (
              <Canvas
                camera={{ position: [3.2, 2.0, 3.2], fov: 38 }}
                gl={{ alpha: true, antialias: true }}
                dpr={[1, 1.5]}
              >
                <ambientLight intensity={1.1} />
                <directionalLight position={[5, 6, 5]} intensity={1.5} />
                <directionalLight position={[-4, 3, -4]} intensity={0.7} color="#a0d8ef" />
                <Suspense fallback={<InspectorLoadingSpinner />}>
                  <SinglePreviewModel file={currentPreviewItem.file} />
                </Suspense>
              </Canvas>
            ) : (
              <div className="sidebar-inspector-placeholder">
                <span>{tCat('inspectorHover')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Input Box */}
        <div className="sidebar-search-box">
          <Search size={16} className="sidebar-search-icon" />
          <input
            type="text"
            placeholder={tCat('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sidebar-search-input"
          />
          {search && (
            <button className="sidebar-search-clear" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="category-tabs-wrapper">
          <button 
            className="category-scroll-btn left" 
            onClick={() => tabsRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
          >
            <ChevronLeft size={16} />
          </button>
          
          <div 
            ref={tabsRef}
            className="category-tabs-scroll"
            onWheel={(e) => {
              if (tabsRef.current) {
                tabsRef.current.scrollLeft += e.deltaY;
              }
            }}
          >
            {catalogCategories.map(cat => (
              <button
                key={cat.id}
                className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {getCategoryLabel(cat.id)}
              </button>
            ))}
          </div>

          <button 
            className="category-scroll-btn right" 
            onClick={() => tabsRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Furniture Cards Grid */}
        <div className="furniture-cards-grid">
          {filteredItems.map(item => (
            <FurnitureCard
              key={item.id}
              item={item}
              onAdd={() => handleAddItem(item)}
              onHover={handleCardHover}
            />
          ))}

          {filteredItems.length === 0 && (
            <div className="furniture-grid-empty">
              <span>{tCat('notFound')}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
