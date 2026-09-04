/**
 * @file Navbar.jsx
 * @description Top Cockpit Navigation Bar component.
 * Features brand title, mathematical viewport-centered surface mode switcher (Day/Night/Dynamic/Political),
 * saved globe views trigger, and JWT authentication login/logout triggers.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Globe as GlobeIcon, User, Bookmark, LogOut, LogIn, Sun, Moon, SunMoon, Map } from 'lucide-react';
import useStore from '../../store/useStore';
import AuthModal from './AuthModal';
import SavedViewsModal from './SavedViewsModal';

/**
 * Top Navbar component.
 * @returns {JSX.Element} Glassmorphism top navigation bar.
 */
export default function Navbar() {
  const { user, logout, dayNightMode, setDayNightMode, initAuth } = useStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [viewsModalOpen, setViewsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initAuth();
    setMounted(true);
  }, [initAuth]);

  return (
    <>
      <nav className="glass-panel navbar-container">
        {/* Brand Logo */}
        <div className="navbar-brand-section">
          <GlobeIcon size={21} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span className="gradient-text navbar-brand-title">
            TerraScope
          </span>
          <span className="badge badge-accent hide-on-mobile" style={{ marginLeft: '2px', fontSize: '0.68rem' }}>
            LIVE 3D
          </span>
        </div>

        {/* Center: View Mode Switcher */}
        <div className="navbar-mode-switcher">
          {[
            { id: 'day', label: 'Day', icon: Sun, title: 'Daytime Surface Map' },
            { id: 'night', label: 'Night', icon: Moon, title: 'Night City Lights Map' },
            { id: 'dynamic', label: 'Dynamic', icon: SunMoon, title: 'Dynamic Real-time Sun Terminator Line' },
            { id: 'political', label: 'Political', icon: Map, title: 'Political Country Borders & Capitals Map' },
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = dayNightMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setDayNightMode(mode.id)}
                title={mode.title}
                aria-label={mode.title}
                className={`navbar-mode-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={14} style={{ flexShrink: 0 }} />
                <span className="hide-on-mobile">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions & Auth */}
        <div className="navbar-actions-section">
          {mounted && user && (
            <button
              className="btn-ghost"
              onClick={() => setViewsModalOpen(true)}
              title="Saved Views"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 8px' }}
            >
              <Bookmark size={16} color="var(--warning)" />
              <span className="hide-on-mobile">Saved Views</span>
            </button>
          )}

          {mounted && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div 
                title={user.email}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}
              >
                <User size={16} color="var(--accent)" />
                <span className="hide-on-mobile" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
              </div>
              <button
                className="btn-ghost"
                onClick={logout}
                title="Sign Out"
                style={{ padding: '6px', color: 'var(--text-secondary)' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setAuthModalOpen(true)}
              title="Sign In"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <LogIn size={15} />
              <span className="hide-on-mobile">Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      {viewsModalOpen && <SavedViewsModal onClose={() => setViewsModalOpen(false)} />}
    </>
  );
}
