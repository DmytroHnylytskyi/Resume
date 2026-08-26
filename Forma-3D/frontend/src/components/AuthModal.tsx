'use client';

/**
 * @file AuthModal.tsx
 * @module components/AuthModal
 * @description Modal dialog component for user authentication (Login & Registration).
 * Interacts with FastAPI REST API endpoints (`/register`, `/token`, `/users/me/`) to authenticate users,
 * store Bearer JWT tokens, and set user profile state in Zustand. Supports full i18n localization.
 */

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { API_URL } from '../config';

interface AuthModalProps {
  onClose: () => void;
}

/**
 * AuthModal Dialog Component.
 * 
 * @param {Object} props - Component props.
 * @param {() => void} props.onClose - Callback function to close the authentication modal.
 * @returns {JSX.Element} Auth modal overlay and form.
 */
export default function AuthModal({ onClose }: AuthModalProps) {
  const tAuth = useTranslations('Auth');
  const authMode = useStore(state => state.authMode);
  const setAuthMode = useStore(state => state.setAuthMode);
  const setToken = useStore(state => state.setToken);
  const setUser = useStore(state => state.setUser);
  
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const displayName = name.trim() || email.split('@')[0] || 'User';

      if (authMode === 'register') {
        const res = await fetch(`${API_URL}/register`, {
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

      const res = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      if (!res.ok) throw new Error(tAuth('invalidError'));
      
      const data = await res.json();
      setToken(data.access_token);
      
      // Fetch user profile data
      const userRes = await fetch(`${API_URL}/users/me/`, {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });
      const userData = await userRes.json();
      setUser(userData);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="glass-panel auth-modal-container">
        <button onClick={onClose} className="auth-modal-close">
          <X size={20} />
        </button>
        
        <h2 className="auth-modal-title">
          {authMode === 'login' ? tAuth('loginTitle') : tAuth('registerTitle')}
        </h2>
        
        <form onSubmit={handleSubmit} className="auth-modal-form">
          {authMode === 'register' && (
            <input 
              type="text" 
              placeholder={tAuth('namePlaceholder')} 
              value={name} 
              onChange={e => setName(e.target.value)}
              required
              className="glass-input auth-modal-input"
            />
          )}
          
          <input 
            type="email" 
            placeholder={tAuth('emailPlaceholder')} 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required
            className="glass-input auth-modal-input"
          />
          
          <input 
            type="password" 
            placeholder={tAuth('passwordPlaceholder')} 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            className="glass-input auth-modal-input"
          />
          
          {error && <p className={`auth-modal-error ${error.includes('successful') ? 'auth-modal-error--success' : 'auth-modal-error--fail'}`}>{error}</p>}
          
          <button type="submit" disabled={loading} className="glass-button auth-modal-submit">
            {loading ? '...' : (authMode === 'login' ? tAuth('loginTitle') : tAuth('registerTitle'))}
          </button>
        </form>
        
        <p className="auth-modal-switch"
           onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}>
          {authMode === 'login' ? tAuth('switchToRegister') : tAuth('switchToLogin')}
        </p>
      </div>
    </div>
  );
}
