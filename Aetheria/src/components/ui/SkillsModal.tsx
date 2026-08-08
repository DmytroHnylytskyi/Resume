'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { developerProfile } from '../../data/resumeData';
import {
  X,
  Award,
  Layers,
  Sparkles,
  Box,
  Cuboid,
  Activity,
  Code2,
  FileCode,
  Database,
  Terminal,
  Server,
  HardDrive,
  Cpu,
  LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Box,
  Cuboid,
  Activity,
  Layers,
  Code2,
  FileCode,
  Database,
  Sparkles,
  Terminal,
  Server,
  HardDrive,
  Cpu
};

export default function SkillsModal(): React.ReactElement | null {
  const { activeModal, closeModal } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (activeModal !== 'skills') return null;

  const categories = Object.keys(developerProfile.skillsMatrix);

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={closeModal}>
        <motion.div
          className="glass-modal-card skills-modal"
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
            <div className="icon-badge-glow purple">
              <Award size={26} color="#c084fc" />
            </div>
            <div>
              <h2 className="modal-headline">Стек Технологій & Навички</h2>
              <p className="modal-subtext">
                Інженерний арсенал для побудови сучасних, 3D та високонавантажених додатків
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="category-filter-pills">
            <button
              className={`filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Всі Навички
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="modal-divider" />

          {/* Skills Grid */}
          <div className="skills-scroll-container">
            {categories
              .filter((cat) => selectedCategory === 'all' || selectedCategory === cat)
              .map((cat) => (
                <div key={cat} className="skill-category-group">
                  <h3 className="category-header-title">{cat}</h3>
                  <div className="skill-items-grid">
                    {developerProfile.skillsMatrix[cat].map((skill) => {
                      const Icon = ICON_MAP[skill.icon] || Box;

                      return (
                        <div key={skill.name} className="skill-card glass-panel">
                          <div className="skill-card-top">
                            <div className="skill-icon-bubble">
                              <Icon size={18} />
                            </div>
                            <div className="skill-name-wrap">
                              <span className="skill-title">{skill.name}</span>
                              <span className="skill-desc">{skill.desc}</span>
                            </div>
                            <span className="skill-percent">{skill.level}%</span>
                          </div>

                          {/* Progress Meter Bar */}
                          <div className="skill-meter-track">
                            <motion.div
                              className="skill-meter-fill"
                              initial={{ width: 0 }}
                              animate={{ width: `${skill.level}%` }}
                              transition={{ duration: 0.9, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          <div className="skills-footer-note">
            <Sparkles size={15} color="#c084fc" />
            <span>Фокус на чистій архітектурі, продуктивності 60 FPS та преміальній естетиці UI/UX</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
