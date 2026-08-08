'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameStore } from '../../store/useGameStore';
import { developerProfile } from '../../data/resumeData';
import {
  X,
  Download,
  GraduationCap,
  Sparkles,
  Code,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function BioModal(): React.ReactElement | null {
  const { activeModal, closeModal, setActiveModal, showToast } = useGameStore();

  if (activeModal !== 'bio') return null;

  const handleDownloadPDF = () => {
    // Trigger celebratory confetti burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 }
    });

    showToast("Завантаження PDF-резюме...");
    const link = document.createElement('a');
    link.href = '/resume.pdf';
    link.download = 'Dmytro_Hnylytskyi_Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={closeModal}>
        <motion.div
          className="glass-modal-card bio-modal"
          initial={{ opacity: 0, scale: 0.92, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button className="modal-close-btn" onClick={closeModal} aria-label="Close">
            <X size={20} />
          </button>

          {/* Modal Header & Hero Info */}
          <div className="modal-hero-header">
            <div className="avatar-ring-wrapper">
              <div className="avatar-badge">
                <Sparkles size={28} className="avatar-icon" />
              </div>
              <div className="status-dot-pulse" title="Available for work" />
            </div>

            <div className="hero-text-block">
              <div className="hero-badge-pill">
                <Code size={13} />
                <span>{developerProfile.title}</span>
              </div>
              <h2 className="hero-name">{developerProfile.name}</h2>
              <span className="hero-name-en">{developerProfile.nameEn}</span>
              <p className="hero-tagline">{developerProfile.tagline}</p>
            </div>
          </div>

          <div className="modal-divider" />

          {/* Education & KPI Section */}
          <div className="education-card glass-panel">
            <div className="edu-icon-box">
              <GraduationCap size={24} />
            </div>
            <div className="edu-info">
              <span className="edu-uni">{developerProfile.university.fullName}</span>
              <h4 className="edu-inst">{developerProfile.university.institute}</h4>
              <p className="edu-dept">{developerProfile.university.department}</p>
              <div className="edu-meta-tags">
                <span className="edu-pill">{developerProfile.university.specialty}</span>
                <span className="edu-pill active">{developerProfile.university.degree}</span>
              </div>
            </div>
          </div>

          {/* About Me Story Blocks */}
          <div className="about-paragraphs">
            <h3 className="section-title">
              <Layers size={16} />
              <span>Про мене та підхід до інженерії</span>
            </h3>
            {developerProfile.about.map((p, idx) => (
              <p key={idx} className="about-text">
                {p}
              </p>
            ))}
          </div>

          {/* Modal Actions Footer */}
          <div className="modal-actions-footer">
            <button className="primary-action-btn" onClick={handleDownloadPDF}>
              <Download size={18} />
              <span>Завантажити Резюме (PDF)</span>
            </button>

            <button
              className="secondary-action-btn"
              onClick={() => setActiveModal('contacts')}
            >
              <span>Зв'язатися зі мною</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
