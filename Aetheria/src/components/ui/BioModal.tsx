'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { X, User, MapPin, Sparkles, GraduationCap, Briefcase } from 'lucide-react';

export default function BioModal(): React.ReactElement | null {
  const { activeModal, setActiveModal, language } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal === 'bio') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, setActiveModal]);

  if (activeModal !== 'bio') return null;

  const profile = developerProfiles[language];
  const t = translations[language].modals;
  const edu = profile.education[0];

  return (
    <div className="modal-backdrop-blur" onClick={() => setActiveModal(null)}>
      <div className="resume-modal-card obsidian-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Ambient Top Glow Line */}
        <div className="modal-accent-line gold" />

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-badge-group">
            <div className="modal-badge-icon gold-badge">
              <User size={20} />
            </div>
            <div>
              <h2 className="modal-title">{profile.name}</h2>
              <p className="modal-subtitle">{profile.role}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setActiveModal(null)} title={t.close}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body custom-scrollbar">
          {/* Location & Academic Meta Row */}
          <div className="modal-tags-row">
            <div className="modal-meta-pill">
              <MapPin size={13} />
              <span>{profile.location}</span>
            </div>
            <div className="modal-meta-pill">
              <GraduationCap size={13} />
              <span>{language === 'uk' ? 'КПІ (121 «Інженерія ПЗ»)' : 'KPI (121 "Software Engineering")'}</span>
            </div>
          </div>

          {/* Main Bio Paragraph */}
          <div className="modal-bio-quote">
            <p>{profile.bio}</p>
          </div>

          {/* Academic Background Card */}
          {edu && (
            <div className="modal-subcard education-card">
              <div className="subcard-header">
                <div className="subcard-header-left">
                  <div className="subcard-icon-box gold">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="subcard-title">{t.education}</h3>
                    <p className="subcard-subtitle">{edu.faculty}</p>
                  </div>
                </div>
                <span className="subcard-period-pill">{edu.period}</span>
              </div>
              <div className="education-body">
                <h4 className="edu-institution-name">{edu.institution}</h4>
                <div className="edu-pills-wrap">
                  <span className="edu-pill specialty">
                    <Briefcase size={12} />
                    <span>{edu.specialty}</span>
                  </span>
                  <span className="edu-pill degree">
                    <span>{edu.degree}</span>
                  </span>
                  <span className="edu-pill status">
                    <span className="status-dot-mini" />
                    <span>{edu.status}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Key Experience Highlights */}
          <div className="modal-highlights-block">
            <h3 className="modal-section-title">
              <Sparkles size={16} className="section-sparkle-icon gold" />
              <span>{language === 'uk' ? 'Ключовий інженерний досвід:' : 'Key Engineering Highlights:'}</span>
            </h3>
            <div className="highlights-list">
              {profile.summary.map((item, idx) => (
                <div key={idx} className="highlight-item-card">
                  <div className="highlight-index-badge">0{idx + 1}</div>
                  <p className="highlight-text">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

