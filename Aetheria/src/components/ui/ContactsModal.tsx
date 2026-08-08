'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { developerProfile } from '../../data/resumeData';
import {
  X,
  Send,
  Mail,
  Phone,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles,
  LucideIcon
} from 'lucide-react';

// Custom Crisp Brand SVGs
const GithubIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const LinkedinIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

interface ContactItem {
  key: string;
  title: string;
  value: string;
  href: string;
  icon: LucideIcon | React.ComponentType<{ size?: number }>;
  color: string;
  desc: string;
}

export default function ContactsModal(): React.ReactElement | null {
  const { activeModal, closeModal, showToast } = useGameStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (activeModal !== 'contacts') return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showToast(`Скопійовано: ${text}`);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const contactList: ContactItem[] = [
    {
      key: 'telegram',
      title: 'Telegram',
      value: developerProfile.contacts.telegram,
      href: developerProfile.contacts.telegramUrl,
      icon: Send,
      color: '#38bdf8',
      desc: 'Найшвидший спосіб зв\'язатися зі мною'
    },
    {
      key: 'email',
      title: 'Email',
      value: developerProfile.contacts.email,
      href: `mailto:${developerProfile.contacts.email}`,
      icon: Mail,
      color: '#f43f5e',
      desc: 'Для пропозицій роботи та співпраці'
    },
    {
      key: 'phone',
      title: 'Телефон',
      value: developerProfile.contacts.phoneFormatted,
      href: `tel:${developerProfile.contacts.phone}`,
      icon: Phone,
      color: '#10b981',
      desc: 'Прямий контакт / дзвінки / месенджери'
    },
    {
      key: 'github',
      title: 'GitHub',
      value: 'github.com/mokydjin',
      href: developerProfile.contacts.github,
      icon: GithubIcon,
      color: '#f1f5f9',
      desc: 'Репозиторії, відкритий код та експерименти'
    },
    {
      key: 'linkedin',
      title: 'LinkedIn',
      value: 'Dmytro Hnylytskyi',
      href: developerProfile.contacts.linkedin,
      icon: LinkedinIcon,
      color: '#0ea5e9',
      desc: 'Професійний профіль та кар\'єра'
    }
  ];

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={closeModal}>
        <motion.div
          className="glass-modal-card contacts-modal"
          initial={{ opacity: 0, scale: 0.92, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="modal-close-btn" onClick={closeModal} aria-label="Close">
            <X size={20} />
          </button>

          <div className="modal-header-section">
            <div className="icon-badge-glow">
              <MessageSquare size={26} color="#38bdf8" />
            </div>
            <div>
              <h2 className="modal-headline">Зв'язатися зі мною</h2>
              <p className="modal-subtext">
                Оберіть зручний для вас канал зв'язку. Відповідаю швидко!
              </p>
            </div>
          </div>

          <div className="modal-divider" />

          {/* Grid of Interactive Contact Cards */}
          <div className="contacts-card-grid">
            {contactList.map((c) => {
              const Icon = c.icon;
              const isCopied = copiedKey === c.key;

              return (
                <div
                  key={c.key}
                  className="contact-interactive-card glass-panel"
                  style={{ '--accent': c.color } as React.CSSProperties}
                >
                  <div className="contact-card-left">
                    <div className="contact-icon-bubble" style={{ background: `${c.color}22`, color: c.color }}>
                      <Icon size={20} />
                    </div>
                    <div className="contact-card-info">
                      <div className="contact-card-header">
                        <span className="contact-title">{c.title}</span>
                      </div>
                      <span className="contact-value">{c.value}</span>
                      <span className="contact-desc">{c.desc}</span>
                    </div>
                  </div>

                  <div className="contact-card-actions">
                    <button
                      className="contact-action-btn copy-btn"
                      onClick={() => handleCopy(c.value, c.key)}
                      title="Скопіювати в буфер"
                    >
                      {isCopied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                      <span>{isCopied ? 'Скопійовано' : 'Копіювати'}</span>
                    </button>

                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-action-btn open-btn"
                      title="Перейти за посиланням"
                    >
                      <ExternalLink size={16} />
                      <span>Відкрити</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="contacts-footer-badge">
            <Sparkles size={16} color="#38bdf8" />
            <span>Локація: <b>{developerProfile.contacts.location}</b> • {developerProfile.contacts.status}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
