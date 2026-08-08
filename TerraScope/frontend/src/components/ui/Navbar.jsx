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
      <nav className="glass-panel" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GlobeIcon size={24} color="var(--accent)" />
          <span className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            GlobeScope
          </span>
          <span className="badge badge-accent" style={{ marginLeft: '4px', fontSize: '0.7rem' }}>
            LIVE 3D
          </span>
        </div>

        {/* Center: View Mode Switcher */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-glass)',
          borderRadius: '20px',
          padding: '3px'
        }}>
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)'
                }}
              >
                <Icon size={14} /> {mode.label}
              </button>
            );
          })}
        </div>

        {/* Right Actions & Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {mounted && user && (
            <button
              className="btn-ghost"
              onClick={() => setViewsModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <Bookmark size={16} color="var(--warning)" />
              Saved Views
            </button>
          )}

          {mounted && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <User size={16} color="var(--accent)" />
                <span>{user.email}</span>
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
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
      </nav>

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      {viewsModalOpen && <SavedViewsModal onClose={() => setViewsModalOpen(false)} />}
    </>
  );
}
