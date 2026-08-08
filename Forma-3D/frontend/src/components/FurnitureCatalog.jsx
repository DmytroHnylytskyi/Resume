'use client';

/**
 * @file FurnitureCatalog.jsx
 * @module components/FurnitureCatalog
 * @description Collapsible sidebar catalog containing 60+ modular furniture and architectural 3D building blocks.
 * Features real-time text search, horizontal category scroll controls, and an interactive 3D Inspector preview box
 * that dynamically auto-scales and rotates hovered GLB models. Supports full i18n localization.
 * 
 * @author 3D Furniture Configurator Team
 */

import React, { useState, useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import { useTranslations } from 'next-intl';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { PanelLeftOpen, X, Search, Sparkles, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import FurnitureCard from './FurnitureCard';

const furnitureData = {
  "⛰️ Острови & Рельєф": [
    { name: 'Острів Основа 1 (Великий)', file: 'island_base_main1.glb' },
    { name: 'Острів Основа 2 (Скелястий)', file: 'island_base_main2.glb' },
    { name: 'Острів Основа 3 (Середній)', file: 'island_base_main3.glb' },
    { name: 'Острів Основа 4 (Малий)', file: 'island_base_main4.glb' }
  ],
  "🌌 Портали в Проєкти": [
    { name: 'Портал: GlobeScope', file: 'portal_GlobeScope.glb' },
    { name: 'Портал: 3D Furniture Store', file: 'portal_3D_Furniture_Store.glb' },
    { name: 'Портал: MiniLMS', file: 'portal_MiniLMS..glb' }
  ],
  "🗿 Статуї & Вівтарі Резюме": [
    { name: 'Статуя Bio (Головна)', file: 'statue_bio_hero.glb' },
    { name: 'Статуя Соцмереж & Контактів', file: 'statue_social_oracle.glb' },
    { name: 'Вівтар Навичок & Дерева', file: 'statue_skills_altar.glb' },
    { name: 'Готична Статуя 1', file: 'gothic_statue1_15.glb' },
    { name: 'Готична Статуя 2', file: 'gothic_statue2_16.glb' }
  ],
  "🌲 Магічна Рослинність": [
    { name: 'Магічне Дерево 1', file: 'magic_tree1.glb' },
    { name: 'Магічне Дерево 2', file: 'magic_tree2.glb' },
    { name: 'Магічне Дерево 3', file: 'magic_tree3.glb' },
    { name: 'Магічне Дерево 4', file: 'magic_tree4.glb' },
    { name: 'Магічний Кущ 1', file: 'bush1.glb' },
    { name: 'Жива Огорожа', file: 'house_hedge.glb' }
  ],
  "🌉 Мостики, Доріжки & Сходи": [
    { name: 'Підвісний Мостик 1', file: 'rope_bridge1.glb' },
    { name: 'Підвісний Мостик 2', file: 'rope_bridge2.glb' },
    { name: 'Кам\'яні Сходи 1', file: 'stone_steps1.glb' },
    { name: 'Кам\'яна Доріжка (Міст)', file: 'house_stone_path.glb' },
    { name: 'Балконна Плита (Міст-Перехід)', file: 'house_balconny.glb' },
    { name: 'Перила Моста', file: 'house_railing.glb' },
    { name: 'Прямі Готичні Сходи', file: 'gothic_gik_longstair1_001_7.glb' },
    { name: 'Кутові Сходи', file: 'gothic_gik_cornerstair1_004_14.glb' },
    { name: 'Дерев\'яний Настил (Дошка)', file: 'floorpattern_002_13.glb' }
  ],
  "Інтер'єрні Стіни & Підлога": [
    { name: 'Стіна біла', file: 'wall_001_1.glb' },
    { name: 'Стіна з панелями 1', file: 'wall_002_3.glb' },
    { name: 'Стіна з панелями 2', file: 'wall_003_4.glb' },
    { name: 'Стіна під двері 1', file: 'walldoor_001_2.glb' },
    { name: 'Стіна під двері 2', file: 'walldoor_002_5.glb' },
    { name: 'Стіна під двері 3', file: 'walldoor_003_6.glb' },
    { name: 'Стіна під вікно 1', file: 'wallwindow_001_7.glb' },
    { name: 'Стіна під вікно 2', file: 'wallwindow_002_8.glb' },
    { name: 'Стіна під вікно 3', file: 'wallwindow_003_9.glb' },
    { name: 'Підлога паркетна', file: 'floorpattern_11.glb' },
    { name: 'Підлога квадрати 1', file: 'floorpattern_001_10.glb' },
    { name: 'Підлога темна дошка', file: 'floorpattern_002_13.glb' },
    { name: 'Підлога темні квадрати', file: 'floorpattern_003_14.glb' },
    { name: 'Двері дерев\'яні', file: 'door_12.glb' },
    { name: 'Вікно рама', file: 'window_0.glb' }
  ],
  "Модерн Фасади & Будинки": [
    { name: 'Стіна Модерн 5x5m', file: 'house_wall_5x5.glb' },
    { name: 'Стіна Модерн 5x2.5m', file: 'house_wall_5x2_5.glb' },
    { name: 'Стіна Модерн 2.5x2.5m', file: 'house_wall_2_5x2_5.glb' },
    { name: 'Кутова Стіна 1', file: 'house_corner_wall1_5x5.glb' },
    { name: 'Кутова Стіна 2', file: 'house_corner_wall2_5x5.glb' },
    { name: 'Фасадна Стіна з Вікном 1', file: 'house_wallwindow1center.glb' },
    { name: 'Фасадна Стіна з Вікном 2', file: 'house_wallwindow2.glb' },
    { name: 'Фасадна Стіна з Вікном 3', file: 'house_wallwindow3center.glb' },
    { name: 'Фасадна Стіна з Вікном 4', file: 'house_wallwindow4.glb' },
    { name: 'Високий Фасад з Вікнами', file: 'house_wallwindow5high.glb' },
    { name: 'Плаский Дах 5x5m', file: 'house_flatroof_5x5.glb' },
    { name: 'Плаский Дах 5x2.5m', file: 'house_flatroof_5x2_5.glb' },
    { name: 'Пологий Дах 5x5m', file: 'house_slightly_slopedroof_5x5.glb' },
    { name: 'Скатий Дах 5x5m', file: 'house_sloping_roof_5x5.glb' },
    { name: 'Крутий Дах 5x5m', file: 'house_heavily_sloped_roof_5x5.glb' },
    { name: 'Вхідні Двері Модерн', file: 'house_doors.glb' },
    { name: 'Балконна Плита', file: 'house_balconny.glb' },
    { name: 'Балконні Перила', file: 'house_railing.glb' },
    { name: 'Жива Огорожа', file: 'house_hedge.glb' },
    { name: 'Кам\'яна Доріжка', file: 'house_stone_path.glb' },
    { name: 'Вуличний Ліхтар Модерн', file: 'house_modernlamp.glb' },
    { name: 'Настінний Ліхтар Модерн', file: 'house_modernlampwallmount.glb' },
    { name: 'Велопарковка', file: 'house_bike_stand.glb' }
  ],
  "Готика & Замок": [
    { name: 'Готична Арка', file: 'gothic_gik_arch1_0.glb' },
    { name: 'Готичний Карниз 1', file: 'gothic_corn_2.glb' },
    { name: 'Готичний Карниз 2', file: 'gothic_corn2_4.glb' },
    { name: 'Готична Колона', file: 'gothic_column2_001_5.glb' },
    { name: 'Готична Нижня Стіна', file: 'gothic_gik_downwall_001_6.glb' },
    { name: 'Готична Верхня Стіна', file: 'gothic_gik_upperwall_001_17.glb' },
    { name: 'Готична Стіна 2', file: 'gothic_wall2_18.glb' },
    { name: 'Прямі Сходи', file: 'gothic_gik_longstair1_001_7.glb' },
    { name: 'Кутові Сходи', file: 'gothic_gik_cornerstair1_004_14.glb' },
    { name: 'Мале Готичне Вікно', file: 'gothic_minwindow_12.glb' },
    { name: 'Велике Готичне Вікно', file: 'gothic_gik_window_21.glb' },
    { name: 'Готична Статуя 1', file: 'gothic_statue1_15.glb' },
    { name: 'Готична Статуя 2', file: 'gothic_statue2_16.glb' }
  ],
  "Sofas & Chairs": [
    { name: 'Sofa 1', file: 'sofa1.glb' }, { name: 'Sofa 2', file: 'sofa2.glb' }, { name: 'Sofa 3', file: 'sofa3.glb' }, { name: 'Sofa 4', file: 'sofa4.glb' },
    { name: 'Lounge Chair 1', file: 'Lounge Chair1.glb' }, { name: 'Lounge Chair 2', file: 'Lounge Chair2.glb' }, { name: 'Lounge Chair 3', file: 'Lounge Chair3.glb' }, { name: 'Lounge Chair 4', file: 'Lounge Chair4.glb' },
    { name: 'Pouf 1', file: 'Pouf1.glb' }, { name: 'Pouf 2', file: 'Pouf2.glb' },
    { name: 'Dining Chair 1', file: 'Dining Chair1.glb' }, { name: 'Dining Chair 2', file: 'Dining Chair2.glb' }, { name: 'Dining Chair 3', file: 'Dining Chair3.glb' }, { name: 'Dining Chair 4', file: 'Dining Chair4.glb' },
    { name: 'Bar Stool 1', file: 'Bar Stool1.glb' }, { name: 'Bar Stool 2', file: 'Bar Stool2.glb' }, { name: 'Bar Stool 3', file: 'Bar Stool3.glb' }
  ],
  "Tables": [
    { name: 'Coffee Table 1', file: 'Coffee Table1.glb' }, { name: 'Coffee Table 2', file: 'Coffee Table2.glb' }, { name: 'Coffee Table 3', file: 'Coffee Table3.glb' }, { name: 'Coffee Table 4', file: 'Coffee Table4.glb' },
    { name: 'Dining Table 1', file: 'Dining Table1.glb' }, { name: 'Dining Table 2', file: 'Dining Table2.glb' }, { name: 'Dining Table 3', file: 'Dining Table3.glb' }
  ],
  "Storage & Stands": [
    { name: 'Bookshelf 1', file: 'Bookshelf1.glb' }, { name: 'Bookshelf 2', file: 'Bookshelf2.glb' }, { name: 'Bookshelf 3', file: 'Bookshelf3.glb' }, { name: 'Bookshelf 4', file: 'Bookshelf4.glb' },
    { name: 'TV Stand 1', file: 'TV Stand 1.glb' }, { name: 'TV Stand 2', file: 'TV Stand 2.glb' }, { name: 'TV Stand 3', file: 'TV Stand 3.glb' }, { name: 'TV Stand 4', file: 'TV Stand 4.glb' },
    { name: 'Sideboard 1', file: 'Sideboard1.glb' }
  ],
  "Lighting": [
    { name: 'Floor Lamp 1', file: 'Floor Lamp1.glb' }, { name: 'Floor Lamp 2', file: 'Floor Lamp2.glb' }, { name: 'Floor Lamp 3', file: 'Floor Lamp3.glb' }, { name: 'Floor Lamp 4', file: 'Floor Lamp4.glb' },
    { name: 'Table Lamp 1', file: 'Table Lamp1.glb' }, { name: 'Table Lamp 2', file: 'Table Lamp2.glb' }, { name: 'Table Lamp 3', file: 'Table Lamp3.glb' }, { name: 'Table Lamp 4', file: 'Table Lamp4.glb' },
    { name: 'Chandelier 1', file: 'Chandelier1.glb' }, { name: 'Chandelier 2', file: 'Chandelier2.glb' }
  ],
  "Decor & Electronics": [
    { name: 'Potted Plant 1', file: 'Potted Plant 1.glb' }, { name: 'Potted Plant 2', file: 'Potted Plant 2.glb' },
    { name: 'Carpet 1', file: 'Carpet1.glb' },
    { name: 'Painting 1', file: 'Painting1.glb' },
    { name: 'TV 1', file: 'TV 1.glb' },
    { name: 'Monitor 1', file: 'Monitor1.glb' }
  ]
};

const categoryKeys = [
  'all',
  "⛰️ Острови & Рельєф",
  "🌌 Портали в Проєкти",
  "🗿 Статуї & Вівтарі Резюме",
  "🌲 Магічна Рослинність",
  "🌉 Мостики, Доріжки & Сходи",
  "Інтер'єрні Стіни & Підлога",
  "Модерн Фасади & Будинки",
  "Готика & Замок",
  "Sofas & Chairs",
  "Tables",
  "Storage & Stands",
  "Lighting",
  "Decor & Electronics"
];

/**
 * Single 3D Preview Inspector Model Component.
 * Automatically normalizes maximum bounding dimension to 1.45 units and rotates scene continuous on Y-axis.
 * 
 * @param {Object} props - Props.
 * @param {string} props.file - Relative filename of GLB asset inside public/model/.
 * @returns {JSX.Element} R3F group element.
 */
function SinglePreviewModel({ file }) {
  const { scene } = useGLTF(`/model/${file}`);
  const groupRef = useRef();

  const { clone, scale } = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = maxDim > 0 ? 1.45 / maxDim : 1;
    return { clone: c, scale: s };
  }, [scene]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.9;
    }
  });

  return (
    <group ref={groupRef}>
      <group scale={scale}>
        <Center center>
          <primitive object={clone} />
        </Center>
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

  /** Active category filter key */
  const [activeCategory, setActiveCategory] = useState('all');

  /** Text search filter string */
  const [search, setSearch] = useState('');

  /** Hovered item object for 3D Inspector Box */
  const [hoveredItem, setHoveredItem] = useState(null);

  /** Ref timer for debouncing hover inspection */
  const hoverTimer = useRef(null);

  /** Ref to horizontal scrollable category pills container */
  const tabsRef = useRef(null);

  /** Maps category key string to localized translation string */
  const getCategoryLabel = (catKey) => {
    switch (catKey) {
      case 'all': return tCat('categories.all');
      case "Інтер'єрні Стіни & Підлога": return tCat('categories.walls');
      case 'Модерн Фасади & Будинки': return tCat('categories.modern');
      case 'Готика & Замок': return tCat('categories.gothic');
      case 'Sofas & Chairs': return tCat('categories.sofas');
      case 'Tables': return tCat('categories.tables');
      case 'Storage & Stands': return tCat('categories.storage');
      case 'Lighting': return tCat('categories.lighting');
      case 'Decor & Electronics': return tCat('categories.decor');
      default: return catKey;
    }
  };

  /** Triggers 3D placement mode for selected item */
  const handleAddItem = (item) => {
    startPlacement(`/model/${item.file}`);
    setIsOpen(false);
  };

  /** Debounced hover handler for 3D Inspector */
  const handleCardHover = (item) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoveredItem(item);
    }, 120);
  };

  const categoryItems = activeCategory === 'all'
    ? Object.values(furnitureData).flat()
    : furnitureData[activeCategory] || [];

  const filteredItems = search.trim()
    ? categoryItems.filter(item =>
        item.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : categoryItems;

  const currentPreviewItem = hoveredItem || filteredItems[0] || null;

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
                camera={{ position: [3.2, 2.2, 3.2], fov: 36 }}
                gl={{ alpha: true, antialias: true }}
                dpr={[1, 1.5]}
              >
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 5, 5]} intensity={1.2} />
                <directionalLight position={[-3, 2, -3]} intensity={0.4} color="#a0d8ef" />
                <Suspense fallback={null}>
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
            {categoryKeys.map(catKey => (
              <button
                key={catKey}
                className={`category-pill ${activeCategory === catKey ? 'active' : ''}`}
                onClick={() => setActiveCategory(catKey)}
              >
                {getCategoryLabel(catKey)}
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
              key={item.file}
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
