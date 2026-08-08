'use client';

/**
 * @file AuthModal.jsx
 * @module components/AuthModal
 * @description Modal dialog component for user authentication (Login & Registration).
 * Interacts with FastAPI REST API endpoints (`/register`, `/token`, `/users/me/`) to authenticate users,
 * store Bearer JWT tokens, and set user profile state in Zustand. Supports full i18n localization.
 * 
 * @author 3D Furniture Configurator Team
 */

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * AuthModal Dialog Component.
 * 
 * @param {Object} props - Component props.
 * @param {() => void} props.onClose - Callback function to close the authentication modal.
 * @returns {JSX.Element} Auth modal overlay and form.
 */
export default function AuthModal({ onClose }) {
  const tAuth = useTranslations('Auth');
  const { authMode, setAuthMode, setToken, setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Form submission handler for login / registration.
   * Performs async fetch requests to FastAPI backend.
   * @param {React.FormEvent} e - Form event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const displayName = name.trim() || email.split('@')[0] || 'User';

      if (authMode === 'register') {
        const res = await fetch('http://localhost:8000/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, name: displayName })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(typeof data.detail === 'string' ? data.detail : tAuth('regError'));
        }
      }

      // Auto-login after registration or login submit
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      if (!res.ok) throw new Error(tAuth('invalidError'));
      
      const data = await res.json();
      setToken(data.access_token);
      
      // Fetch user profile data
      const userRes = await fetch('http://localhost:8000/users/me/', {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });
      const userData = await userRes.json();
      setUser(userData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ width: '350px', padding: '30px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          {authMode === 'login' ? tAuth('loginTitle') : tAuth('registerTitle')}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {authMode === 'register' && (
            <input 
              type="text" 
              placeholder={tAuth('namePlaceholder')} 
              value={name} 
              onChange={e => setName(e.target.value)}
              required
              className="glass-input"
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          )}
          
          <input 
            type="email" 
            placeholder={tAuth('emailPlaceholder')} 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required
            className="glass-input"
            style={{ padding: '10px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
          
          <input 
            type="password" 
            placeholder={tAuth('passwordPlaceholder')} 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            className="glass-input"
            style={{ padding: '10px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
          
          {error && <p style={{ color: error.includes('successful') ? '#4ade80' : '#f87171', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
          
          <button type="submit" disabled={loading} className="glass-button" style={{ marginTop: '10px' }}>
            {loading ? '...' : (authMode === 'login' ? tAuth('loginTitle') : tAuth('registerTitle'))}
          </button>
        </form>
        
        <p style={{ marginTop: '20px', fontSize: '0.9rem', textAlign: 'center', cursor: 'pointer', opacity: 0.8 }} 
           onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}>
          {authMode === 'login' ? tAuth('switchToRegister') : tAuth('switchToLogin')}
        </p>
      </div>
    </div>
  );
}
