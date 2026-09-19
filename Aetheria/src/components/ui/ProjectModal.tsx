'use client';

import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations, getProjectUrl } from '../../data/resumeData';
import { X, ExternalLink, Sparkles, Layers, Box } from 'lucide-react';
import { useModalFocus } from '../../hooks/useModalFocus';
import { GithubIcon } from './icons';

/**
 * ProjectModal — detailed project showcase dialog (opened from portals,
 * project cards, and the tactical map pins). Shows the feature list and
 * Live Demo / Source Code actions for the project id in the store.
 * Focus, Tab trap and Escape are owned by useModalFocus.
 */
const PROJECT_SHOTS: Record<string, string> = {
  forma: '/shots/forma.jpg',
  terrascope: '/shots/terrascope.jpg',
  lumina: '/shots/lumina.jpg',
  aetheria: '/shots/aetheria.jpg'
};

export default function ProjectModal(): React.ReactElement | null {
  const { selectedProject, setSelectedProject, language } = useGameStore();
  const [failedImg, setFailedImg] = React.useState(false);

  React.useEffect(() => {
    setFailedImg(false);
  }, [selectedProject]);

  const isOpen = selectedProject !== null;
  const panelRef = useModalFocus<HTMLDivElement>(isOpen, () => setSelectedProject(null));

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
      <div
        ref={panelRef}
        className="resume-modal-card obsidian-modal project-modal-card glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow Line */}
        <div className={`modal-accent-line ${accent}`} />

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-badge-group">
            <div className={`modal-badge-icon ${accent}-badge`}>
              <Box size={20} aria-hidden="true" />
            </div>
            <div>
              <span className="project-modal-pill-tag">{project.tagline}</span>
              <h2 className="modal-title">{project.title}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setSelectedProject(null)} title={t.close} aria-label={t.close}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body custom-scrollbar">
          {/* Live-demo screenshot (shared with the classic card preview) in macOS window frame */}
          <div className="project-modal-window">
            <div className="project-modal-chrome" aria-hidden="true">
              <div className="project-modal-dots">
                <span className="dot-close" />
                <span className="dot-min" />
                <span className="dot-max" />
              </div>
              <span className="project-modal-url">
                <span className="project-modal-url-dot" />
                {project.url ? project.url.replace(/^https?:\/\//, '') : `${project.id}.dev`}
              </span>
              <span className="project-modal-chrome-tag">{project.id} / preview</span>
            </div>
            <div className="project-modal-shot">
              {failedImg ? (
                <div className="project-modal-shot-fallback">
                  <span>{project.title}</span>
                  <small>{language === 'uk' ? 'Попередній перегляд інтерфейсу' : 'Interface preview'}</small>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={PROJECT_SHOTS[project.id] ?? `/shots/${project.id}.jpg`}
                  alt={project.title}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  onError={() => setFailedImg(true)}
                />
              )}
            </div>
          </div>

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
