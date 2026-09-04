/**
 * @file AuthModal.jsx
 * @description Glassmorphism Authentication Modal dialog component.
 * Handles user login and account registration via FastAPI OAuth2 /register and /token endpoints.
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Mail, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import useStore from '../../store/useStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Authentication Modal component.
 * @param {{onClose: Function}} props
 * @returns {JSX.Element} Glass modal dialog for sign-in and sign-up.
 */
export default function AuthModal({ onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setAuth = useStore((state) => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? `${API_URL}/auth/register` : `${API_URL}/auth/token`;

    try {
      let res;
      if (isRegister) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
      } else {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });
      }

      const data = await res.json();

      if (!res.ok) {
        let msg = 'Authentication failed';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          msg = data.detail.map(d => d.msg || 'Invalid field').join(', ');
        }
        throw new Error(msg);
      }

      if (isRegister) {
        // Automatically switch to login or complete login
        setIsRegister(false);
        setError('Account created! Please sign in.');
        setLoading(false);
        return;
      }

      // Fetch complete user profile payload from /api/auth/me
      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      const meData = meRes.ok ? await meRes.json() : { email };

      setAuth(meData, data.access_token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          width: 'min(380px, calc(100vw - 32px))',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '90dvh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isRegister ? <UserPlus size={20} color="var(--accent)" /> : <LogIn size={20} color="var(--accent)" />}
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            background: error.includes('created') ? 'rgba(77, 255, 145, 0.15)' : 'rgba(255, 77, 106, 0.15)',
            border: `1px solid ${error.includes('created') ? 'var(--success)' : 'var(--danger)'}`,
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: error.includes('created') ? 'var(--success)' : 'var(--danger)'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px', padding: '12px', fontWeight: 600 }}
          >
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
