/**
 * @file LayerPanel.jsx
 * @description Left-side drawer panel component for toggling 3D globe data layers and query filters.
 * Features integrated card header collapse button, custom filter sliders, and auto-rotation toggle.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Plane, Thermometer, Rocket, 
  ChevronLeft, ChevronRight, Loader2, RotateCw, Filter, ChevronUp, Layers 
} from 'lucide-react';
import useStore from '../../store/useStore';

const LAYER_INFO = [
  { id: 'earthquakes', name: 'Earthquakes', icon: Activity, color: 'var(--danger)', hasFilter: true },
  { id: 'flights', name: 'Live Flights', icon: Plane, color: 'var(--accent)', hasFilter: false },
  { id: 'weather', name: 'Weather', icon: Thermometer, color: 'var(--success)', hasFilter: false },
  { id: 'neo', name: 'Near Earth Objects', icon: Rocket, color: '#c084fc', hasFilter: true }
];

export default function LayerPanel() {
  const { 
    layerPanelOpen, toggleLayerPanel, layers, toggleLayer, updateLayerFilter,
    autoRotate, toggleAutoRotate 
  } = useStore();

  const [expandedLayer, setExpandedLayer] = useState(null);

  const activeCount = Object.values(layers).filter(l => l.enabled).length;

  const getLayerCount = (id) => {
    const layer = layers[id];
    if (!layer || !layer.data) return null;
    if (id === 'earthquakes') return layer.data.features?.length || 0;
    if (id === 'flights') return 400; // active flights
    if (id === 'weather') return Array.isArray(layer.data) ? layer.data.length : 70; // world capitals weather
    if (id === 'neo') {
      if (!layer.data.near_earth_objects) return 0;
      return Object.values(layer.data.near_earth_objects).flat().length;
    }
    return null;
  };

  const renderLayerFilters = (id) => {
    const filters = layers[id]?.filters || {};

    if (id === 'earthquakes') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Min Magnitude:</span>
            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{filters.minMagnitude || 2.5}</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="7.0"
            step="0.5"
            value={filters.minMagnitude || 2.5}
            onChange={(e) => updateLayerFilter('earthquakes', 'minMagnitude', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--danger)', cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Time Period:</span>
            <select
              className="filter-select"
              value={filters.period || '7days'}
              onChange={(e) => updateLayerFilter('earthquakes', 'period', e.target.value)}
            >
              <option value="today">Past 24 Hours</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>
        </div>
      );
    }

    if (id === 'neo') {
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Hazardous Only:</span>
          <input
            type="checkbox"
            className="toggle-switch"
            checked={!!filters.onlyHazardous}
            onChange={(e) => updateLayerFilter('neo', 'onlyHazardous', e.target.checked)}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ position: 'fixed', left: '20px', top: '80px', zIndex: 90 }}>
      <AnimatePresence mode="wait">
        {layerPanelOpen ? (
          <motion.div
            key="panel-open"
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="glass-panel"
            style={{ 
              width: '300px', 
              padding: '18px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '14px',
              border: '1px solid var(--border-glass)'
            }}
          >
            {/* Panel Header with Integrated Collapse Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--accent)" />
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Data Layers</h2>
                <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
                  {activeCount} Active
                </span>
              </div>
              <button
                className="btn-ghost"
                onClick={toggleLayerPanel}
                title="Collapse Panel"
                style={{ padding: '4px 6px', borderRadius: '6px', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Layer List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LAYER_INFO.map(info => {
                const layerState = layers[info.id];
                const Icon = info.icon;
                const count = getLayerCount(info.id);
                const isExpanded = expandedLayer === info.id;
                
                return (
                  <div 
                    key={info.id} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: layerState.enabled ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                      border: layerState.enabled ? '1px solid var(--border-glass)' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={18} color={info.color} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ 
                            fontSize: '0.88rem', 
                            fontWeight: layerState.enabled ? 600 : 400,
                            color: layerState.enabled ? 'var(--text-primary)' : 'var(--text-secondary)' 
                          }}>
                            {info.name}
                          </span>
                          {layerState.enabled && count !== null && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {count.toLocaleString()} data points
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {layerState.loading && <Loader2 size={14} className="animate-spin" color="var(--accent)" />}
                        
                        {layerState.enabled && info.hasFilter && (
                          <button
                            onClick={() => setExpandedLayer(isExpanded ? null : info.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <Filter size={14} />}
                          </button>
                        )}

                        <input 
                          type="checkbox" 
                          className="toggle-switch"
                          checked={layerState.enabled}
                          onChange={() => toggleLayer(info.id)}
                        />
                      </div>
                    </div>

                    {layerState.enabled && isExpanded && renderLayerFilters(info.id)}
                  </div>
                );
              })}
            </div>

            {/* Auto-Rotate Toggle */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '4px' }}>
              <button
                className="btn-ghost"
                onClick={toggleAutoRotate}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  padding: '8px',
                  background: autoRotate ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: `1px solid ${autoRotate ? 'var(--accent)' : 'var(--border-glass)'}`
                }}
              >
                <RotateCw size={14} color={autoRotate ? 'var(--accent)' : 'var(--text-secondary)'} className={autoRotate ? 'animate-spin' : ''} />
                <span>Auto-Rotate Globe: <strong>{autoRotate ? 'ON' : 'OFF'}</strong></span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* Sleek Collapsed Floating Trigger Pill */
          <motion.button
            key="panel-collapsed"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="glass-panel"
            onClick={toggleLayerPanel}
            style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              borderRadius: '20px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}
          >
            <Layers size={16} color="var(--accent)" />
            <span>Data Layers</span>
            <span className="badge badge-accent" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
              {activeCount}
            </span>
            <ChevronRight size={14} color="var(--text-secondary)" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
