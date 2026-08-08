import { API_URL } from '../config';
import React, { useState, useContext } from 'react';
import './Navbar.css';
import { AuthContext } from './AuthContext';
import AuthModal from './AuthModal';
import { useTranslation } from 'react-i18next';
import { Leaf, Menu, X } from 'lucide-react';

export default function Navbar({ currentView, onViewChange, onLoginClick }) {
  const { user, token, logout, refreshUser } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsLangOpen(false);
  };

  const toggleRole = async () => {
    const res = await fetch(`${API_URL}/teacher/toggle-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      refreshUser();
      const data = await res.json();
      if (data.role === 'student') {
        onViewChange('student');
      }
    }
  };

  return (
    <>
      <nav className="glass-nav">
        <div className="nav-container">
          <div className="logo" onClick={() => onViewChange('student')} style={{cursor:'pointer', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 101}}>
            <Leaf size={28} />
            <span>{t('app.title')}</span><span className="logo-dot">.</span>
          </div>
          
          <div className="hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </div>

          <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            {currentView === 'teacher' && (
              <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onViewChange('student'); }}>
                {t('app.courses')}
              </a>
            )}
            {currentView !== 'teacher' && (
              <a href="#courses" className="nav-link">{t('app.courses')}</a>
            )}

            {user && user.role === 'teacher' && (
              <button
                className={`nav-link btn-nav-teacher ${currentView === 'teacher' ? 'btn-nav-active' : ''}`}
                onClick={() => onViewChange(currentView === 'teacher' ? 'student' : 'teacher')}
              >
                {t('teacher.dashboard_btn')}
              </button>
            )}
            
            <div className="custom-lang-dropdown">
              <button 
                className="lang-toggle" 
                onClick={() => setIsLangOpen(!isLangOpen)}
              >
                {i18n.language.toUpperCase()}
                <svg className={`chevron ${isLangOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {isLangOpen && (
                <div className="lang-menu glass-panel">
                  <div className="lang-option" onClick={() => changeLanguage('en')}>EN</div>
                  <div className="lang-option" onClick={() => changeLanguage('uk')}>UK</div>
                </div>
              )}
            </div>

            {user ? (
              <div className="user-controls">
                <span className="user-email">{user.email}</span>
                {user.role !== 'teacher' && (
                  <button className="btn-glass btn-become-teacher" onClick={toggleRole}>
                    {t('teacher.become')}
                  </button>
                )}
                <button className="btn-glass" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>{t('app.logout')}</button>
              </div>
            ) : (
              <button className="btn-glass" onClick={() => { if(onLoginClick) onLoginClick(); else setShowModal(true); setIsMobileMenuOpen(false); }}>{t('app.signin')}</button>
            )}
          </div>
        </div>
      </nav>
      {/* AuthModal is now handled by App.jsx, but keeping local fallback just in case */}
      {showModal && !onLoginClick && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
