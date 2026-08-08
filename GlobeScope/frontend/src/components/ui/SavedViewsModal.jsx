/**
 * @file SavedViewsModal.jsx
 * @description Glassmorphism Saved Views Management Modal dialog component.
 * Allows authenticated users to save current 3D globe camera/layer snapshots and reload past presets.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Bookmark, Trash2, Eye, Plus, Check } from 'lucide-react';
import useStore from '../../store/useStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Saved Views Modal component.
 * @param {{onClose: Function}} props
 * @returns {JSX.Element} Glass modal dialog for managing view presets.
 */
export default function SavedViewsModal({ onClose }) {
  const { layers, token, setCameraTarget } = useStore();
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newViewName, setNewViewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchViews = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/views/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setViews(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  const handleSaveView = async (e) => {
    e.preventDefault();
    if (!newViewName.trim() || !token) return;

    setSaving(true);
    // Active layers list
    const activeLayers = Object.keys(layers).filter(k => layers[k].enabled);

    try {
      const res = await fetch(`${API_URL}/views/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newViewName,
          description: `Custom view with ${activeLayers.length} active layers`,
          camera_position: { x: 0, y: 0, z: 2.5 },
          camera_target: { x: 0, y: 0, z: 0 },
          active_layers: activeLayers,
          layer_filters: {}
        })
      });

      if (res.ok) {
        setNewViewName('');
        setSuccessMsg('View saved!');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchViews();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteView = async (id) => {
    try {
      const res = await fetch(`${API_URL}/views/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setViews(views.filter(v => v.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyView = (view) => {
    // Enable layer set
    if (view.active_layers && Array.isArray(view.active_layers)) {
      // Loop layers and set state
      Object.keys(layers).forEach(layerKey => {
        const shouldEnable = view.active_layers.includes(layerKey);
        if (layers[layerKey].enabled !== shouldEnable) {
          useStore.getState().toggleLayer(layerKey);
        }
      });
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 200,
      background: 'rgba(5, 5, 15, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel"
        style={{
          width: '440px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxHeight: '80vh'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bookmark size={20} color="var(--warning)" />
            Saved Globe Views
          </h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Save Current View Form */}
        <form onSubmit={handleSaveView} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            required
            placeholder="Name your view (e.g. Pacific Seismics)..."
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {saving ? '...' : <Plus size={16} />} Save
          </button>
        </form>

        {successMsg && (
          <div style={{ color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} /> {successMsg}
          </div>
        )}

        {/* Views List */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {loading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading saved views...</p>
          ) : views.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
              No saved views yet. Save your active layer combinations!
            </p>
          ) : (
            views.map(v => (
              <div
                key={v.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{v.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Layers: {v.active_layers?.join(', ') || 'None'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn-ghost" onClick={() => handleApplyView(v)} title="Apply View" style={{ padding: '6px' }}>
                    <Eye size={16} color="var(--accent)" />
                  </button>
                  <button className="btn-ghost" onClick={() => handleDeleteView(v.id)} title="Delete View" style={{ padding: '6px' }}>
                    <Trash2 size={16} color="var(--danger)" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
