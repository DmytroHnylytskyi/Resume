'use client';

/**
 * @file MobileNoticeModal.tsx
 * @module components/MobileNoticeModal
 * @description Dedicated full-screen device restriction advisory screen for Forma-3D.
 * Displayed on mobile devices and tablets to inform users that this advanced 3D room builder
 * requires desktop PCs or laptops with mouse & keyboard due to real-time GPU rendering demands
 * and ergonomic precision controls.
 */

import { useTranslations } from 'next-intl';
import { 
  Monitor, 
  Smartphone, 
  Cpu, 
  MousePointerClick, 
  Globe, 
  ArrowLeft, 
  AlertTriangle 
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function MobileNoticeModal() {
  const t = useTranslations('MobileNotice');
  const locale = useStore((state) => state.locale);
  const toggleLocale = useStore((state) => state.toggleLocale);

  return (
    <div className="mobile-notice-fullscreen-container">
      <div className="mobile-notice-card glass-panel" role="dialog" aria-modal="true">
        {/* Top Control Row */}
        <div className="mobile-notice-topbar">
          <div className="mobile-notice-badge">
            <Monitor size={14} />
            <span>{t('badge')}</span>
          </div>

          {/* Quick Language Toggle */}
          <button 
            className="glass-button mobile-notice-lang-btn" 
            onClick={toggleLocale}
            title="Switch language"
          >
            <Globe size={13} />
            <span>{locale.toUpperCase()}</span>
          </button>
        </div>

        {/* Hero Visual Icon Badge */}
        <div className="mobile-notice-hero">
          <div className="mobile-notice-icon-wrapper">
            <Monitor size={38} color="var(--color-primary)" />
            <div className="mobile-notice-phone-badge">
              <Smartphone size={15} color="#ff4d6a" />
              <AlertTriangle size={11} color="#ff4d6a" />
            </div>
          </div>
          <h2 className="mobile-notice-title">{t('title')}</h2>
        </div>

        {/* Reason Cards */}
        <div className="mobile-notice-reasons">
          <div className="mobile-notice-reason-item">
            <div className="mobile-notice-reason-icon">
              <Monitor size={18} color="var(--color-primary)" />
            </div>
            <p>{t('desc1')}</p>
          </div>

          <div className="mobile-notice-reason-item">
            <div className="mobile-notice-reason-icon warning">
              <Cpu size={18} color="#ffb84d" />
            </div>
            <p>{t('desc2')}</p>
          </div>

          <div className="mobile-notice-reason-item">
            <div className="mobile-notice-reason-icon danger">
              <MousePointerClick size={18} color="#ff4d6a" />
            </div>
            <p>{t('desc3')}</p>
          </div>
        </div>

        {/* Advisory Callout */}
        <div className="mobile-notice-callout">
          💡 {t('advice')}
        </div>

        {/* Action Button: Return to Hub */}
        <div className="mobile-notice-actions">
          <a 
            href="https://hnylytskyi.dev" 
            className="glass-button primary mobile-notice-hub-btn"
          >
            <ArrowLeft size={16} />
            <span>{t('hubBtn')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
