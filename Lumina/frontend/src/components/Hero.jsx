/**
 * Hero — landing hero banner.
 * Displays the headline/subtitle copy and the primary CTA that scrolls the
 * visitor down to the "How It Works" guide section.
 */

import React from 'react';
import './Hero.css';
import { useTranslation } from 'react-i18next';

export default function Hero() {
  const { t } = useTranslation();

  const scrollToGuide = () => {
    const el = document.getElementById('how-to-use');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero-section">
      <div className="hero-content glass-panel">
        <h1 className="hero-title">{t('hero.title')}</h1>
        <p className="hero-subtitle">
          {t('hero.subtitle')}
        </p>
        <div className="hero-buttons">
          <button className="btn-oil" onClick={scrollToGuide}>{t('hero.guide')}</button>
        </div>
      </div>
    </section>
  );
}
