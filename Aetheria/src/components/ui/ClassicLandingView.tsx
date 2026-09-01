'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import {
  Compass,
  Mail,
  Send,
  ExternalLink,
  Check,
  Copy,
  MapPin,
  Briefcase,
  Layers,
  Code2,
  Cpu,
  Wrench,
  Sun,
  Moon,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function ClassicLandingView(): React.ReactElement {
  const { language, setLanguage, setViewMode, setSelectedProject, theme, toggleTheme } = useGameStore();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const profile = developerProfiles[language];
  const t = translations[language].landing;
  const navT = translations[language].nav;
  const edu = profile.education[0];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profile.contacts.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2200);
  };

  const getCategoryIcon = (idx: number) => {
    switch (idx) {
      case 0: return <Code2 size={18} className="skill-icon" />;
      case 1: return <Layers size={18} className="skill-icon" />;
      case 2: return <Cpu size={18} className="skill-icon" />;
      default: return <Wrench size={18} className="skill-icon" />;
    }
  };

  return (
    <div className="classic-landing-wrapper">
      {/* ── Classic Top Navigation Bar ── */}
      <header className="classic-header glass-panel">
        <div className="classic-brand">
          <div className="brand-dot" />
          <span className="brand-name">{profile.name}</span>
          <span className="brand-tag">{navT.brandTag}</span>
        </div>

        <nav className="classic-nav-links">
          <a href="#about" className="classic-nav-link">{t.aboutTitle}</a>
          <a href="#education" className="classic-nav-link">{t.educationTitle}</a>
          <a href="#certifications" className="classic-nav-link">{t.certificationsTitle}</a>
          <a href="#skills" className="classic-nav-link">{t.skillsTitle}</a>
          <a href="#projects" className="classic-nav-link">{t.projectsTitle}</a>
          <a href="#contacts" className="classic-nav-link">{t.contactsTitle}</a>
        </nav>

        <div className="classic-header-actions">
          {/* Theme Toggle */}
          <button
            className="nav-shortcut-btn theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? (language === 'uk' ? 'Світла тема' : 'Light Mode') : (language === 'uk' ? 'Темна тема' : 'Dark Mode')}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Language Switcher */}
          <div className="lang-toggle-group mini">
            <button
              className={`lang-btn ${language === 'uk' ? 'active' : ''}`}
              onClick={() => setLanguage('uk')}
            >
              UA
            </button>
            <button
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>

          {/* Switch back to 3D World */}
          <button
            className="switch-3d-btn"
            onClick={() => setViewMode('3d')}
            title={navT.view3D}
          >
            <Compass size={16} />
            <span>{t.viewIn3D}</span>
          </button>
        </div>
      </header>

      {/* ── Main Scrollable Content Container ── */}
      <main className="classic-main-content">
        {/* ── HERO SECTION ── */}
        <section className="classic-hero-section">
          <div className="hero-badge">
            <span className="status-dot pulse-dot" />
            <span>{profile.status}</span>
          </div>

          <h1 className="hero-name">{profile.name}</h1>
          <h2 className="hero-role">{profile.role}</h2>

          <div className="hero-meta">
            <div className="hero-meta-item">
              <MapPin size={15} />
              <span>{profile.location}</span>
            </div>
            <div className="hero-meta-item">
              <Briefcase size={15} />
              <span>Full-Stack & Creative 3D</span>
            </div>
          </div>

          <p className="hero-bio">{profile.bio}</p>

          <div className="hero-action-buttons">
            <a href="#contacts" className="btn-primary">
              <Mail size={16} />
              <span>{t.contactMe}</span>
            </a>

            <button className="btn-secondary" onClick={() => setViewMode('3d')}>
              <Compass size={16} />
              <span>{t.viewIn3D}</span>
            </button>

            <button className="btn-ghost" onClick={handleCopyEmail}>
              {copiedEmail ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedEmail ? t.copied : t.copyEmail}</span>
            </button>
          </div>
        </section>

        {/* ── SUMMARY / ABOUT SECTION ── */}
        <section id="about" className="classic-section">
          <div className="section-header">
            <h2 className="section-title">{t.aboutTitle}</h2>
            <p className="section-subtitle">{t.aboutSubtitle}</p>
          </div>

          <div className="summary-cards-grid">
            {profile.summary.map((item, idx) => (
              <div key={idx} className="summary-card glass-panel">
                <div className="summary-card-index">0{idx + 1}</div>
                <p className="summary-card-text">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── EDUCATION SECTION ── */}
        {edu && (
          <section id="education" className="classic-section">
            <div className="section-header">
              <h2 className="section-title">{t.educationTitle}</h2>
              <p className="section-subtitle">{t.educationSubtitle}</p>
            </div>

            <div className="education-classic-card glass-panel">
              <div className="education-classic-header">
                <div className="edu-icon-circle">
                  <GraduationCap size={22} />
                </div>
                <div className="edu-header-text">
                  <h3 className="edu-classic-institution">{edu.institution}</h3>
                  <p className="edu-classic-faculty">{edu.faculty}</p>
                </div>
                <span className="edu-period-badge">{edu.period}</span>
              </div>
              <div className="edu-classic-body">
                <div className="edu-badge-row">
                  <span className="edu-spec-tag">
                    <Briefcase size={14} />
                    <span>{edu.specialty}</span>
                  </span>
                  <span className="edu-status-tag">{edu.degree} • {edu.status}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── CERTIFICATIONS SECTION ── */}
        <section id="certifications" className="classic-section">
          <div className="section-header">
            <h2 className="section-title">{t.certificationsTitle}</h2>
            <p className="section-subtitle">{t.certificationsSubtitle}</p>
          </div>

          <div className="certifications-classic-grid">
            {profile.certifications.map((cert) => (
              <div key={cert.id} className="cert-classic-card glass-panel">
                <div className="cert-classic-top">
                  <span className="cert-classic-issuer">{cert.issuer}</span>
                  <span className="cert-classic-level">{cert.level}</span>
                </div>
                <h3 className="cert-classic-title">{cert.title}</h3>
                <div className="cert-classic-bottom">
                  <span className="cert-verified-tag">
                    <CheckCircle2 size={13} />
                    <span>{language === 'uk' ? 'Підтверджено' : 'Verified'}</span>
                  </span>
                  <span className="cert-category-label">{cert.category}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SKILLS & TECH STACK SECTION ── */}
        <section id="skills" className="classic-section">
          <div className="section-header">
            <h2 className="section-title">{t.skillsTitle}</h2>
            <p className="section-subtitle">{t.skillsSubtitle}</p>
          </div>

          <div className="skills-category-grid">
            {profile.skills.map((cat, idx) => (
              <div key={idx} className="skills-group-card glass-panel">
                <div className="skills-group-header">
                  {getCategoryIcon(idx)}
                  <h3 className="skills-group-title">{cat.category}</h3>
                </div>
                <div className="skill-tags-list">
                  {cat.items.map((skill, sIdx) => (
                    <span key={sIdx} className="skill-tag-badge">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURED PROJECTS SECTION ── */}
        <section id="projects" className="classic-section">
          <div className="section-header">
            <h2 className="section-title">{t.projectsTitle}</h2>
            <p className="section-subtitle">{t.projectsSubtitle}</p>
          </div>

          <div className="projects-grid">
            {Object.values(profile.projects).map((proj) => (
              <article key={proj.id} className="project-card glass-panel">
                <div className="project-accent-bar" />

                <div className="project-card-header">
                  <span className="project-tagline">
                    {proj.tagline}
                  </span>
                  <h3 className="project-title">{proj.title}</h3>
                </div>

                <p className="project-description">{proj.description}</p>

                {/* Feature Highlights */}
                <div className="project-features-block">
                  <span className="features-label">{t.keyFeatures}</span>
                  <ul className="features-list">
                    {proj.features.map((feat, fIdx) => (
                      <li key={fIdx} className="feature-item">
                        <span className="feature-bullet" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tech Tags */}
                <div className="project-tags">
                  {proj.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="project-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Links Toolbar */}
                <div className="project-actions-toolbar-wrapper">
                  <div
                    className="project-actions-toolbar custom-scrollbar-horizontal"
                    onWheel={(e) => {
                      if (e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY;
                      }
                    }}
                  >
                    <button
                      className="project-btn primary"
                      onClick={() => setSelectedProject(proj.id)}
                    >
                      <Sparkles size={14} />
                      <span>{translations[language].modals.projectDetails}</span>
                    </button>

                    {proj.url && (
                      <a
                        href={proj.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-btn secondary"
                      >
                        <span>{t.liveDemo}</span>
                        <ExternalLink size={14} />
                      </a>
                    )}

                    {proj.githubUrl && (
                      <a
                        href={proj.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-btn secondary"
                      >
                        <GithubIcon size={14} />
                        <span>{t.sourceCode}</span>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── CONTACTS & SOCIALS FOOTER ── */}
        <section id="contacts" className="classic-section contacts-section">
          <div className="contacts-card glass-panel">
            <div className="section-header center">
              <h2 className="section-title">{t.contactsTitle}</h2>
              <p className="section-subtitle">{t.contactsSubtitle}</p>
            </div>

            <div className="contacts-links-grid">
              <a
                href={`mailto:${profile.contacts.email}`}
                className="contact-channel-btn"
              >
                <div className="channel-icon-box">
                  <Mail size={20} />
                </div>
                <div className="channel-info">
                  <span className="channel-name">Email</span>
                  <span className="channel-value">{profile.contacts.email}</span>
                </div>
                <ExternalLink size={16} className="channel-arrow" />
              </a>

              <a
                href={profile.contacts.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-channel-btn"
              >
                <div className="channel-icon-box">
                  <Send size={20} />
                </div>
                <div className="channel-info">
                  <span className="channel-name">
                    {language === 'uk' ? 'Telegram (Основний канал)' : 'Telegram (Primary)'}
                  </span>
                  <span className="channel-value">@mokydjin</span>
                </div>
                <ExternalLink size={16} className="channel-arrow" />
              </a>

              <a
                href={profile.contacts.github}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-channel-btn"
              >
                <div className="channel-icon-box">
                  <GithubIcon size={20} />
                </div>
                <div className="channel-info">
                  <span className="channel-name">GitHub</span>
                  <span className="channel-value">github.com/DmytroHnylytskyi</span>
                </div>
                <ExternalLink size={16} className="channel-arrow" />
              </a>
            </div>

            <div className="classic-footer-bar">
              <p className="footer-copy">
                &copy; {new Date().getFullYear()} {profile.name}. {t.rightsReserved}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

