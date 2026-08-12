import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { API_URL } from '../config';
import './Navbar.css';
import { AuthContext } from './AuthContext';
import AuthModal from './AuthModal';
import { useTranslation } from 'react-i18next';
import { Leaf, Menu, X } from 'lucide-react';

/**
 * Main Top Navigation Bar.
 *
 * Provides branding links, language selection (EN/UK), dynamic role switching,
 * mobile responsive drawer, and login/logout modal triggers.
 *
 * @component
 * @param {Object} props
 * @param {Function} [props.onLoginClick] - Callback to open global authentication modal.
 * @returns {JSX.Element} Rendered Navbar.
 */
export default function Navbar({ onLoginClick }) {
  const { user, token, logout, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const isTeacherRoute = location.pathname.startsWith('/teacher');

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
        navigate('/');
      }
    }
  };

  return (
    <>
      <nav className="glass-nav">
        <div className="nav-container">
          <div
            className="logo"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 101 }}
          >
            <Leaf size={28} />
            <span>{t('app.title')}</span><span className="logo-dot">.</span>
          </div>

          <div className="hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </div>

          <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('app.courses')}
            </Link>

            {user && user.role === 'teacher' && (
              <button
                className={`btn-nav-teacher ${isTeacherRoute ? 'btn-nav-teacher--active' : ''}`}
                onClick={() => {
                  navigate(isTeacherRoute ? '/' : '/teacher');
                  setIsMobileMenuOpen(false);
                }}
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
                <button
                  className="btn-glass"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                    navigate('/');
                  }}
                >
                  {t('app.logout')}
                </button>
              </div>
            ) : (
              <button
                className="btn-glass"
                onClick={() => {
                  if (onLoginClick) onLoginClick();
                  else setShowModal(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                {t('app.signin')}
              </button>
            )}
          </div>
        </div>
      </nav>
      {showModal && !onLoginClick && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
