'use client';

import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { X, User, MapPin, Sparkles } from 'lucide-react';

export default function BioModal(): React.ReactElement | null {
  const { activeModal, setActiveModal, language } = useGameStore();
  if (activeModal !== 'bio') return null;

  const profile = developerProfiles[language];
  const t = translations[language].modals;

  return (
    <div className="modal-backdrop-blur" onClick={() => setActiveModal(null)}>
      <div className="resume-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-badge-group">
            <div className="modal-badge-icon" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <User size={18} />
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

        <div className="modal-body">
          <div className="bio-location-tag">
            <MapPin size={14} />
            <span>{profile.location}</span>
          </div>

          <p className="bio-main-text">{profile.bio}</p>

          <h3 className="modal-section-title">{language === 'uk' ? 'Ключовий досвід та досягнення:' : 'Key Experience & Highlights:'}</h3>
          <ul className="bio-summary-list">
            {profile.summary.map((item, idx) => (
              <li key={idx} className="bio-summary-item">
                <Sparkles size={14} className="bullet-sparkle" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
