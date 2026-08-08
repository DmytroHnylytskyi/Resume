'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { ExternalLink, X, Compass } from 'lucide-react';

export default function TeleportTransition(): React.ReactElement | null {
  const { isWarping, activePortal, cancelPortalWarp } = useGameStore();

  if (!isWarping || !activePortal) return null;

  const handleLaunchProject = () => {
    window.open(activePortal.url, '_blank');
    cancelPortalWarp();
  };

  return (
    <AnimatePresence>
      <div className="warp-overlay-screen">
        {/* Hyperspace Radial Streaks */}
        <div className="warp-hyperspace-lines" />

        <motion.div
          className="warp-portal-card glass-modal-card"
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          style={{
            borderColor: activePortal.themeColor,
            boxShadow: `0 0 50px ${activePortal.themeColor}55`
          }}
        >
          <button className="modal-close-btn" onClick={cancelPortalWarp} aria-label="Cancel">
            <X size={20} />
          </button>

          <div className="warp-card-header">
            <div
              className="warp-icon-badge"
              style={{ background: `${activePortal.themeColor}22`, color: activePortal.themeColor }}
            >
              <Compass size={28} />
            </div>
            <div>
              <span className="warp-tag" style={{ color: activePortal.themeColor }}>
                {activePortal.badge}
              </span>
              <h2 className="warp-title">{activePortal.title}</h2>
              <span className="warp-sub">{activePortal.subtitle}</span>
            </div>
          </div>

          <div className="modal-divider" />

          <p className="warp-desc">{activePortal.description}</p>

          {/* Project Tech Tags */}
          <div className="warp-tags-list">
            {activePortal.tags.map((t) => (
              <span key={t} className="warp-pill">
                {t}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="warp-actions">
            <button
              className="primary-warp-btn"
              onClick={handleLaunchProject}
              style={{
                background: `linear-gradient(135deg, ${activePortal.themeColor}, #6366f1)`
              }}
            >
              <ExternalLink size={18} />
              <span>Перейти у Проєкт (Відкрити)</span>
            </button>

            <button className="cancel-warp-btn" onClick={cancelPortalWarp}>
              Залишитися на острові
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
