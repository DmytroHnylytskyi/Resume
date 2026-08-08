import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './HowToUse.css';

const icons = {
  register: (
    <svg viewBox="0 0 48 48" fill="none"><circle cx="20" cy="16" r="8" fill="#f97316"/><path d="M4 42c0-8.8 7.2-16 16-16h0c8.8 0 16 7.2 16 16" fill="#fb923c"/><circle cx="38" cy="18" r="6" fill="#14b8a6" stroke="white" strokeWidth="2"/><path d="M38 14v8M34 18h8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
  ),
  role: (
    <svg viewBox="0 0 48 48" fill="none"><rect x="4" y="10" width="18" height="28" rx="4" fill="#3b82f6"/><rect x="26" y="10" width="18" height="28" rx="4" fill="#8b5cf6"/><circle cx="13" cy="24" r="5" fill="white"/><path d="M35 19l-4 6h8l-4 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  student: (
    <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#22c55e"/><path d="M14 24l7 7 13-14" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  teacher: (
    <svg viewBox="0 0 48 48" fill="none"><rect x="4" y="8" width="40" height="26" rx="3" fill="#1e293b"/><polygon points="20,16 20,26 30,21" fill="#ef4444"/><path d="M12 40h24M24 34v6" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/></svg>
  ),
  library: (
    <svg viewBox="0 0 48 48" fill="none"><path d="M8 8h32v32H8z" fill="#f59e0b"/><rect x="14" y="14" width="20" height="4" fill="white" opacity="0.8"/><rect x="14" y="22" width="14" height="4" fill="white" opacity="0.8"/><circle cx="30" cy="30" r="4" fill="white"/></svg>
  ),
  assign: (
    <svg viewBox="0 0 48 48" fill="none"><circle cx="16" cy="24" r="8" fill="#06b6d4"/><circle cx="38" cy="16" r="6" fill="#3b82f6"/><circle cx="38" cy="32" r="6" fill="#3b82f6"/><path d="M24 24h6M32 16h-4M32 32h-4" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
  ),
  track: (
    <svg viewBox="0 0 48 48" fill="none"><rect x="6" y="24" width="8" height="18" fill="#10b981" rx="2"/><rect x="20" y="14" width="8" height="28" fill="#3b82f6" rx="2"/><rect x="34" y="6" width="8" height="36" fill="#8b5cf6" rx="2"/></svg>
  ),
};

export default function HowToUse() {
  const { t } = useTranslation();
  const carouselRef = useRef(null);

  const steps = [
    { iconKey: 'register', key: 'register' },
    { iconKey: 'role', key: 'role' },
    { iconKey: 'student', key: 'student' },
    { iconKey: 'teacher', key: 'teacher' },
    { iconKey: 'library', key: 'library' },
    { iconKey: 'assign', key: 'assign' },
    { iconKey: 'track', key: 'track' },
  ];

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <section id="how-to-use" className="how-to-use">
      <h2>{t('howto.title')}</h2>
      <p className="howto-subtitle">{t('howto.subtitle')}</p>
      
      <div className="carousel-container">
        <button className="carousel-btn left" onClick={scrollLeft}>‹</button>
        
        <div className="carousel-track" ref={carouselRef}>
          {steps.map((step, idx) => (
            <div className="step-card" key={idx}>
              <div className="step-icon-svg">{icons[step.iconKey]}</div>
              <div className="step-number">{t('howto.step')} {idx + 1}</div>
              <h4>{t(`howto.${step.key}_title`)}</h4>
              <p>{t(`howto.${step.key}_desc`)}</p>
            </div>
          ))}
        </div>
        
        <button className="carousel-btn right" onClick={scrollRight}>›</button>
      </div>
    </section>
  );
}
