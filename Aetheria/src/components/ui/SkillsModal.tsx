'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { X, Award, CheckCircle2, ShieldCheck, Layers, Code2, Cpu, Wrench } from 'lucide-react';
import { useModalFocus } from '../../hooks/useModalFocus';

/**
 * SkillsModal — skills & certifications dialog (Skills Altar `[E]` target).
 * Two tabs: categorized tech-stack chips and verified certificates with
 * verification links. Focus, Tab trap and Escape are owned by useModalFocus.
 */
export default function SkillsModal(): React.ReactElement | null {
  const { activeModal, setActiveModal, language } = useGameStore();
  const [activeTab, setActiveTab] = useState<'skills' | 'certifications'>('skills');

  const isOpen = activeModal === 'skills';
  const panelRef = useModalFocus<HTMLDivElement>(isOpen, () => setActiveModal(null));

  if (activeModal !== 'skills') return null;

  const profile = developerProfiles[language];
  const t = translations[language].modals;

  const getCategoryIcon = (idx: number) => {
    switch (idx) {
      case 0: return <Code2 size={16} className="category-icon violet" />;
      case 1: return <Layers size={16} className="category-icon violet" />;
      case 2: return <Cpu size={16} className="category-icon violet" />;
      default: return <Wrench size={16} className="category-icon violet" />;
    }
  };

  return (
    <div className="modal-backdrop-blur" onClick={() => setActiveModal(null)}>
      <div
        ref={panelRef}
        className="resume-modal-card obsidian-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.skillsAndTech}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Line */}
        <div className="modal-accent-line violet" />

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-badge-group">
            <div className="modal-badge-icon violet-badge">
              <Award size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="modal-title">{t.skillsAndTech}</h2>
              <p className="modal-subtitle">
                {language === 'uk' ? 'Стек розробки та підтверджені кваліфікації' : 'Tech stack & verified certifications'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setActiveModal(null)} title={t.close} aria-label={t.close}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Tabs (Skills vs Certifications) */}
        <div className="modal-tabs-bar">
          <button
            className={`modal-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            <Layers size={14} />
            <span>{language === 'uk' ? 'Стек & Технології' : 'Tech Stack'}</span>
            <span className="tab-count-badge">4</span>
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'certifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('certifications')}
          >
            <ShieldCheck size={14} />
            <span>{t.certifications}</span>
            <span className="tab-count-badge count-gold">{profile.certifications.length}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body custom-scrollbar">
          {activeTab === 'skills' ? (
            /* ── SKILLS TAB ── */
            <div className="skills-grid-modern">
              {profile.skills.map((group, idx) => (
                <div key={idx} className="skill-category-box">
                  <div className="skill-category-head">
                    <div className="category-icon-wrapper">
                      {getCategoryIcon(idx)}
                    </div>
                    <h3 className="skill-category-name">{group.category}</h3>
                  </div>
                  <div className="skill-tags-modern-wrap">
                    {group.items.map((skill, sIdx) => (
                      <span key={sIdx} className="skill-tag-pill-modern">
                        <CheckCircle2 size={12} className="skill-check-bullet" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── CERTIFICATIONS TAB ── */
            <div className="certifications-grid-modern">
              <div className="certifications-banner">
                <ShieldCheck size={18} className="cert-banner-icon" />
                <div>
                  <h4 className="cert-banner-title">
                    {language === 'uk' ? 'Офіційно підтверджені навички' : 'Officially Verified Credentials'}
                  </h4>
                  <p className="cert-banner-desc">
                    {language === 'uk'
                      ? 'Всі сертифікати видані міжнародними платформами HackerRank та EF Standard English Test.'
                      : 'All assessments verified and issued by HackerRank & EF Standard English Test.'}
                  </p>
                </div>
              </div>

              <div className="cert-cards-list">
                {profile.certifications.map((cert) => (
                  <div key={cert.id} className="cert-item-card">
                    <div className="cert-left-accent" />
                    <div className="cert-card-body">
                      <div className="cert-header-row">
                        <span className="cert-issuer-badge">{cert.issuer}</span>
                        <span className="cert-level-badge">{cert.level}</span>
                      </div>
                      <h4 className="cert-item-title">{cert.title}</h4>
                      <div className="cert-footer-row">
                        <span className="cert-verified-pill">
                          <CheckCircle2 size={12} />
                          <span>{language === 'uk' ? 'Підтверджено' : 'Verified'}</span>
                        </span>
                        <span className="cert-category-tag">{cert.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

