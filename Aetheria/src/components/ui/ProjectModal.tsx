'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations, getProjectUrl } from '../../data/resumeData';
import { X, ExternalLink, Sparkles, Layers, Box } from 'lucide-react';

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function ProjectModal(): React.ReactElement | null {
  const { selectedProject, setSelectedProject, language } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedProject) {
        setSelectedProject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject, setSelectedProject]);

  if (!selectedProject) return null;

  const profile = developerProfiles[language];
  const t = translations[language].modals;
  const project = profile.projects[selectedProject];

  if (!project) return null;

  const getAccentClass = (id: string) => {
    switch (id) {
      case 'forma': return 'emerald';
      case 'terrascope': return 'sapphire';
      case 'lumina': return 'coral';
      case 'aetheria': return 'gold';
      default: return 'emerald';
    }
  };

  const accent = getAccentClass(project.id);

  return (
    <div className="modal-backdrop-blur" onClick={() => setSelectedProject(null)}>
      <div className="resume-modal-card obsidian-modal project-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Ambient Glow Line */}
        <div className={`modal-accent-line ${accent}`} />

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-badge-group">
            <div className={`modal-badge-icon ${accent}-badge`}>
              <Box size={20} />
            </div>
            <div>
              <span className="project-modal-pill-tag">{project.tagline}</span>
              <h2 className="modal-title">{project.title}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setSelectedProject(null)} title={t.close}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body custom-scrollbar">
          {/* Main Description */}
          <div className="project-modal-desc-box">
            <p className="project-modal-desc-text">{project.description}</p>
          </div>

          {/* Key Features Block */}
          <div className="project-modal-features-section">
            <h3 className="modal-section-title">
              <Sparkles size={16} className={`section-sparkle-icon ${accent}`} />
              <span>{translations[language].landing.keyFeatures}</span>
            </h3>
            <div className="project-modal-features-grid">
              {project.features.map((feat, idx) => (
                <div key={idx} className="project-feature-card">
                  <div className={`feature-dot-accent ${accent}`} />
                  <p className="feature-card-text">{feat}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack Tags */}
          <div className="project-modal-stack-section">
            <h3 className="modal-section-title">
              <Layers size={16} className={`section-sparkle-icon ${accent}`} />
              <span>{translations[language].landing.skillsTitle}</span>
            </h3>
            <div className="project-tags-modal-wrap">
              {project.tags.map((tag, idx) => (
                <span key={idx} className="project-modal-tech-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Links */}
        <div className="modal-footer project-modal-footer">
          {project.url && (
            <a
              href={getProjectUrl(project.id, project.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-action-btn primary"
            >
              <span>{t.viewDemo}</span>
              <ExternalLink size={15} />
            </a>
          )}

          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-action-btn secondary"
            >
              <GithubIcon size={15} />
              <span>{t.viewCode}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
