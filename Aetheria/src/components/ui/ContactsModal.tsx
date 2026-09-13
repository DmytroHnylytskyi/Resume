'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { X, Share2, Mail, Send, ExternalLink, Copy, Check, Clock } from 'lucide-react';
import { useModalFocus } from '../../hooks/useModalFocus';
import { GithubIcon } from './icons';

/**
 * ContactsModal — contacts dialog (Contacts Statue `[E]` target).
 * Direct links (email, Telegram, GitHub) with one-click copy feedback for
 * email and the Telegram handle. Focus, Tab trap and Escape are owned by
 * useModalFocus.
 */
export default function ContactsModal(): React.ReactElement | null {
  const { activeModal, setActiveModal, language } = useGameStore();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);

  const isOpen = activeModal === 'contacts';
  const panelRef = useModalFocus<HTMLDivElement>(isOpen, () => setActiveModal(null));

  if (activeModal !== 'contacts') return null;

  const profile = developerProfiles[language];
  const t = translations[language].modals;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(profile.contacts.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2200);
  };

  const handleCopyTg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText('@mokydjin');
    setCopiedTg(true);
    setTimeout(() => setCopiedTg(false), 2200);
  };

  return (
    <div className="modal-backdrop-blur" onClick={() => setActiveModal(null)}>
      <div
        ref={panelRef}
        className="resume-modal-card obsidian-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.contactsAndSocial}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Line */}
        <div className="modal-accent-line cyan" />

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-badge-group">
            <div className="modal-badge-icon cyan-badge">
              <Share2 size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="modal-title">{t.contactsAndSocial}</h2>
              <p className="modal-subtitle">
                {language === 'uk' ? 'Прямий зв\'язок та відкритість до співпраці' : 'Direct reach & open to new opportunities'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setActiveModal(null)} title={t.close} aria-label={t.close}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body custom-scrollbar">
          {/* Status Badge */}
          <div className="contacts-status-banner">
            <div className="status-live-indicator">
              <span className="live-status-dot pulse" />
              <span className="status-text">{profile.status}</span>
            </div>
            <div className="contacts-timezone-pill">
              <Clock size={13} />
              <span>Kyiv (UTC+2 / UTC+3)</span>
            </div>
          </div>

          {/* Contacts Interactive Cards */}
          <div className="contacts-cards-stack">
            {/* Telegram Card */}
            <div className="contact-card-modern highlight">
              <a
                href={profile.contacts.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-card-main-link"
              >
                <div className="contact-icon-box-modern tg">
                  <Send size={20} />
                </div>
                <div className="contact-info-block">
                  <span className="contact-role-label">
                    {language === 'uk' ? 'Telegram (Швидка відповідь / Основний канал)' : 'Telegram (Fast Response / Primary)'}
                  </span>
                  <span className="contact-primary-text">@mokydjin</span>
                </div>
                <ExternalLink size={16} className="contact-link-arrow" />
              </a>
              <button
                className="contact-quick-copy-btn"
                onClick={handleCopyTg}
                title={language === 'uk' ? 'Скопіювати @mokydjin' : 'Copy @mokydjin'}
                aria-label={language === 'uk' ? 'Скопіювати Telegram @mokydjin' : 'Copy Telegram handle @mokydjin'}
              >
                {copiedTg ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Email Card */}
            <div className="contact-card-modern">
              <a
                href={`mailto:${profile.contacts.email}`}
                className="contact-card-main-link"
              >
                <div className="contact-icon-box-modern email">
                  <Mail size={20} />
                </div>
                <div className="contact-info-block">
                  <span className="contact-role-label">
                    {language === 'uk' ? 'Email (Офіційні пропозиції)' : 'Email (Official Inquiries)'}
                  </span>
                  <span className="contact-primary-text">{profile.contacts.email}</span>
                </div>
                <ExternalLink size={16} className="contact-link-arrow" />
              </a>
              <button
                className="contact-quick-copy-btn"
                onClick={handleCopyEmail}
                title={language === 'uk' ? 'Скопіювати Email' : 'Copy Email'}
                aria-label={language === 'uk' ? 'Скопіювати email-адресу' : 'Copy email address'}
              >
                {copiedEmail ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
              </button>
            </div>

            {/* GitHub Card */}
            <div className="contact-card-modern">
              <a
                href={profile.contacts.github}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-card-main-link"
              >
                <div className="contact-icon-box-modern gh">
                  <GithubIcon size={20} />
                </div>
                <div className="contact-info-block">
                  <span className="contact-role-label">
                    {language === 'uk' ? 'GitHub (Вихідний код та репозиторії)' : 'GitHub (Source Code & Repositories)'}
                  </span>
                  <span className="contact-primary-text">github.com/DmytroHnylytskyi</span>
                </div>
                <ExternalLink size={16} className="contact-link-arrow" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

