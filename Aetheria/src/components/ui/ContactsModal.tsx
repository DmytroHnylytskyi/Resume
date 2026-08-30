'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { X, Share2, Mail, Send, ExternalLink, Copy, Check, Clock } from 'lucide-react';

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function ContactsModal(): React.ReactElement | null {
  const { activeModal, setActiveModal, language } = useGameStore();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal === 'contacts') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, setActiveModal]);

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
      <div className="resume-modal-card obsidian-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Ambient Top Glow Line */}
        <div className="modal-accent-line cyan" />

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-badge-group">
            <div className="modal-badge-icon cyan-badge">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="modal-title">{t.contactsAndSocial}</h2>
              <p className="modal-subtitle">
                {language === 'uk' ? 'Прямий зв\'язок та відкритість до співпраці' : 'Direct reach & open to new opportunities'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setActiveModal(null)} title={t.close}>
            <X size={18} />
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
                    {language === 'uk' ? 'Telegram (Швидка відповідь / Primary)' : 'Telegram (Fast Response / Primary)'}
                  </span>
                  <span className="contact-primary-text">@mokydjin</span>
                </div>
                <ExternalLink size={16} className="contact-link-arrow" />
              </a>
              <button
                className="contact-quick-copy-btn"
                onClick={handleCopyTg}
                title={language === 'uk' ? 'Скопіювати @mokydjin' : 'Copy @mokydjin'}
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

