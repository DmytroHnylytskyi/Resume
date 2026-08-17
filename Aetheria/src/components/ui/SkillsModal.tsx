'use client';

import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { X, Award, CheckCircle2 } from 'lucide-react';

export default function SkillsModal(): React.ReactElement | null {
  const { activeModal, setActiveModal, language } = useGameStore();
  if (activeModal !== 'skills') return null;

  const profile = developerProfiles[language];
  const t = translations[language].modals;

  return (
    <div className="modal-backdrop-blur" onClick={() => setActiveModal(null)}>
      <div className="resume-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-badge-group">
            <div className="modal-badge-icon" style={{ backgroundColor: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
              <Award size={18} />
            </div>
            <div>
              <h2 className="modal-title">{t.skillsAndTech}</h2>
              <p className="modal-subtitle">{language === 'uk' ? 'Навички та Інструменти' : 'Core Skills & Tooling'}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setActiveModal(null)} title={t.close}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="skills-grid">
            {profile.skills.map((group, idx) => (
              <div key={idx} className="skill-category-card">
                <h3 className="skill-category-title">{group.category}</h3>
                <div className="skill-tags-wrap">
                  {group.items.map((skill, sIdx) => (
                    <span key={sIdx} className="skill-tag-pill">
                      <CheckCircle2 size={12} className="skill-check-icon" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
