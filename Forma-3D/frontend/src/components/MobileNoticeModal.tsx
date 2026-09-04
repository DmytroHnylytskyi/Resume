'use client';

/**
 * @file MobileNoticeModal.tsx
 * @module components/MobileNoticeModal
 * @description Notification and advisory stub modal displayed when Forma-3D is opened on mobile devices.
 * Informs users that this advanced 3D room builder is optimized exclusively for desktop PCs due to
 * real-time GPU rendering demands and ergonomic precision controls (mouse & keyboard).
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Monitor, 
  Smartphone, 
  Cpu, 
  MousePointerClick, 
  Globe, 
  ArrowLeft, 
  AlertTriangle,
  X 
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function MobileNoticeModal() {
  const t = useTranslations('MobileNotice');
  const locale = useStore((state) => state.locale);
  const toggleLocale = useStore((state) => state.toggleLocale);

  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Default true until client mounts

  useEffect(() => {
    // Check if dismissed in current session
    const isDismissed = sessionStorage.getItem('forma_dismiss_mobile_notice') === '1';
    
    const checkMobile = () => {
      const userAgentMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const screenMobile = window.innerWidth <= 850;
      setIsMobile(userAgentMobile || screenMobile);
    };

    checkMobile();
    if (!isDismissed) {
      setDismissed(false);
    }

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('forma_dismiss_mobile_notice', '1');
    } catch {
      // Ignore storage errors in private browsing
    }
  };

  if (!isMobile || dismissed) {
    return null;
  }

  return (
    <div className="mobile-notice-overlay">
      <div className="mobile-notice-card glass-panel" role="dialog" aria-modal="true">
        {/* Top Control Row */}
        <div className="mobile-notice-topbar">
          <div className="mobile-notice-badge">
            <Monitor size={14} />
            <span>{t('badge')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Quick Language Toggle */}
            <button 
              className="glass-button" 
              onClick={toggleLocale}
              title="Switch language"
              style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Globe size={13} />
              <span>{locale.toUpperCase()}</span>
            </button>

            {/* Dismiss Close Icon */}
            <button 
              className="glass-button" 
              onClick={handleDismiss}
              aria-label="Close notification"
              style={{ padding: '6px', borderRadius: '50%', display: 'flex' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Hero Visual Icon Badge */}
        <div className="mobile-notice-hero">
          <div className="mobile-notice-icon-wrapper">
            <Monitor size={36} color="var(--color-primary)" />
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

        {/* Action Buttons */}
        <div className="mobile-notice-actions">
          <a 
            href="https://hnylytskyi.dev" 
            className="glass-button primary mobile-notice-hub-btn"
          >
            <ArrowLeft size={16} />
            <span>{t('hubBtn')}</span>
          </a>

          <button 
            onClick={handleDismiss} 
            className="glass-button mobile-notice-continue-btn"
          >
            {t('continueBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
