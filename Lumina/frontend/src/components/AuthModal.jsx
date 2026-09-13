/**
 * AuthModal — sign-in / registration dialog.
 * Posts the OAuth2 form credentials to the FastAPI /auth endpoints and
 * stores the returned JWT in the AuthContext session. Visibility is
 * controlled by App (opened from the Navbar sign-in button).
 */

import { API_URL } from '../config';
import React, { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import './AuthModal.css';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn, UserPlus, X } from 'lucide-react';

export default function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        login(data.access_token);
        onClose();
      } else {
        alert(t('auth.login_fail'));
      }
    } else {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        alert(t('auth.reg_success'));
        setIsLogin(true);
      } else {
        alert(t('auth.reg_fail'));
      }
    }
  };

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button type="button" className="auth-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            {isLogin ? <LogIn size={28} /> : <UserPlus size={28} />}
          </div>
          <h2 className="auth-title">
            {isLogin ? t('auth.signin_title') : t('auth.register_title')}
          </h2>
          <p className="auth-subtitle">
            {isLogin 
              ? t('auth.signin_subtitle', 'Sign in to continue learning')
              : t('auth.register_subtitle', 'Create your account to get started')
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <Mail size={18} className="auth-input-icon" />
            <input 
              type="email" 
              placeholder={t('auth.email')}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="auth-input"
            />
          </div>

          <div className="auth-input-group">
            <Lock size={18} className="auth-input-icon" />
            <input 
              type="password" 
              placeholder={t('auth.password')}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="auth-input"
            />
          </div>

          <button type="submit" className="auth-submit-btn">
            {isLogin ? (
              <><LogIn size={18} /> {t('auth.login_btn')}</>
            ) : (
              <><UserPlus size={18} /> {t('auth.signup_btn')}</>
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="auth-divider">
          <span className="auth-divider-line"></span>
          <span className="auth-divider-text">{t('auth.or', 'or')}</span>
          <span className="auth-divider-line"></span>
        </div>

        <button 
          type="button" 
          className="auth-toggle-btn" 
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? t('auth.need_account') : t('auth.have_account')}
        </button>
      </div>
    </div>
  );
}
