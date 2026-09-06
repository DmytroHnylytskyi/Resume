'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations, getProjectUrl } from '../../data/resumeData';
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
  Sparkles,
  Printer,
  ArrowUp
} from 'lucide-react';

/** Section ids watched by the scroll-spy (order matches the sticky nav). */
const SECTION_IDS = ['about', 'education', 'certifications', 'skills', 'projects', 'contacts'];

/**
 * Clipboard fallback for non-secure contexts (plain HTTP previews) and older
 * browsers where `navigator.clipboard` is unavailable: a hidden textarea +
 * the deprecated-but-universal execCommand path.
 */
function legacyCopyEmail(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

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
  const [activeSection, setActiveSection] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const profile = developerProfiles[language];
  const t = translations[language].landing;
  const navT = translations[language].nav;
  const edu = profile.education[0];

  const handleCopyEmail = () => {
    const email = profile.contacts.email;
    const done = () => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    };
    // Clipboard API exists only in secure contexts; the legacy path covers
    // plain-HTTP previews and older browsers.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(done).catch(() => {
        if (legacyCopyEmail(email)) done();
      });
    } else if (legacyCopyEmail(email)) {
      done();
    }
  };

  // Scroll-spy: highlight the nav link of the section currently in view.
  // The sticky header is 64px tall, so sections activate only once their
  // title clears it; the lower margin keeps the last section reachable.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-72px 0px -55% 0px', threshold: 0 }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Scroll reveal: sections fade up as they enter the viewport. The CSS
  // hidden state only applies once `reveal-ready` is set here, so the page
  // renders fully without JS.
  useEffect(() => {
    const container = wrapperRef.current?.querySelector('.classic-main-content');
    if (!container) return undefined;
    container.classList.add('reveal-ready');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06 }
    );
    container.querySelectorAll('.classic-section').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Back-to-top: the classic wrapper is the scroll container (body is locked).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return undefined;
    const onScroll = () => setShowBackToTop(el.scrollTop > 600);
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    wrapperRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Count-up animation for the hero stat numbers (0 → target) on mount.
  // Skipped entirely for reduced-motion users, who see the final values.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const nodes = wrapperRef.current?.querySelectorAll<HTMLElement>('.hero-stat-value');
    if (!nodes || nodes.length === 0) return undefined;
    const targets = heroStats.map((stat) => parseInt(stat.value, 10));
    const suffixes = heroStats.map((stat) => stat.value.replace(/^\d+/, ''));
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      nodes.forEach((node, i) => {
        node.textContent = String(Math.round(targets[i] * eased)) + suffixes[i];
      });
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isUk = language === 'uk';

  const navItems = [
    { id: 'about', label: isUk ? 'Про мене' : 'About' },
    { id: 'education', label: isUk ? 'Освіта' : 'Education' },
    { id: 'certifications', label: isUk ? 'Сертифікати' : 'Certificates' },
    { id: 'skills', label: isUk ? 'Навички' : 'Skills' },
    { id: 'projects', label: isUk ? 'Проєкти' : 'Projects' },
    { id: 'contacts', label: isUk ? 'Контакти' : 'Contacts' }
  ];

  // Quick-credibility metrics derived from the existing profile data
  // (the "2+" mirrors the hands-on experience claim in the summary).
  const skillCount = profile.skills.reduce((sum, cat) => sum + cat.items.length, 0);
  const heroStats = [
    { value: '2+', label: t.statYears },
    { value: String(Object.keys(profile.projects).length), label: t.statProjects },
    { value: String(skillCount), label: t.statTechs }
  ];

  const getCategoryIcon = (idx: number) => {
    switch (idx) {
      case 0: return <Code2 size={18} className="skill-icon" />;
      case 1: return <Layers size={18} className="skill-icon" />;
      case 2: return <Cpu size={18} className="skill-icon" />;
      default: return <Wrench size={18} className="skill-icon" />;
    }
  };

  return (
    <div className="classic-landing-wrapper" ref={wrapperRef}>
      {/* ── Classic Top Navigation Bar ── */}
      <header className="classic-header glass-panel">
        <div className="classic-brand">
          <div className="brand-dot" />
          <span className="brand-name">{profile.name}</span>
          <span className="brand-tag">{navT.brandTag}</span>
        </div>

        <nav className="classic-nav-links">
          {navItems.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`classic-nav-link${activeSection === id ? ' active' : ''}`}
              aria-current={activeSection === id ? 'true' : undefined}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="classic-header-actions">
          {/* Unified Controls Cluster: Theme Toggle + Language Switcher */}
          <div className="header-controls-cluster">
            {/* Theme Toggle */}
            <button
              className="nav-shortcut-btn theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? (language === 'uk' ? 'Світла тема' : 'Light Mode') : (language === 'uk' ? 'Темна тема' : 'Dark Mode')}
              aria-label={theme === 'dark' ? 'Toggle light mode' : 'Toggle dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Language Switcher */}
            <div className="lang-toggle-group mini">
              <button
                className={`lang-btn ${language === 'uk' ? 'active' : ''}`}
                onClick={() => setLanguage('uk')}
                aria-label="Українська версія"
              >
                UA
              </button>
              <button
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
                aria-label="English version"
              >
                EN
              </button>
            </div>
          </div>

          {/* Switch back to 3D World */}
          <button
            className="switch-3d-btn"
            onClick={() => setViewMode('3d')}
            title={navT.view3D}
          >
            <Compass size={15} />
            <span className="switch-3d-text-full">{t.viewIn3D}</span>
            <span className="switch-3d-text-compact">{isUk ? '3D Світ' : '3D World'}</span>
          </button>
        </div>
      </header>

      {/* ── Mobile section nav: the desktop links hide ≤1080px, so phones get
          a sticky horizontally-scrollable chip row (same scroll-spy state) ── */}
      <nav className="classic-mobile-nav" aria-label="Sections">
        {navItems.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`classic-mobile-chip${activeSection === id ? ' active' : ''}`}
            aria-current={activeSection === id ? 'true' : undefined}
          >
            {label}
          </a>
        ))}
      </nav>

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
              <span>{t.heroFocus}</span>
            </div>
          </div>

          <p className="hero-bio">{profile.bio}</p>

          <div className="hero-stats-strip">
            {heroStats.map((stat, idx) => (
              <div key={idx} className="hero-stat-card">
                <span className="hero-stat-value">{stat.value}</span>
                <span className="hero-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>

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

            <button className="btn-ghost" onClick={() => window.print()}>
              <Printer size={16} />
              <span>{t.downloadPdf}</span>
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
              {/* Top Meta: Icon + Type Tag + Period */}
              <div className="edu-classic-top">
                <div className="edu-type-badge">
                  <div className="edu-icon-circle">
                    <GraduationCap size={16} />
                  </div>
                  <span className="edu-type-text">
                    {language === 'uk' ? 'Вища освіта' : 'Higher Education'}
                  </span>
                </div>
                <span className="edu-period-badge">{edu.period}</span>
              </div>

              {/* Institution and Faculty Full-Width */}
              <div className="edu-classic-main">
                <h3 className="edu-classic-institution">{edu.institution}</h3>
                <p className="edu-classic-faculty">{edu.faculty}</p>
              </div>

              {/* Footer: Specialty and Status */}
              <div className="edu-classic-footer">
                <div className="edu-spec-tag">
                  <Briefcase size={14} />
                  <span>{edu.specialty}</span>
                </div>
                <div className="edu-status-tag">
                  <span className="edu-status-dot" />
                  <span>{edu.degree} • {edu.status}</span>
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
                  {cert.url ? (
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cert-verified-tag cert-verified-link"
                      title={t.openLink}
                    >
                      <CheckCircle2 size={13} />
                      <span>{language === 'uk' ? 'Підтверджено' : 'Verified'}</span>
                      <ExternalLink size={11} className="cert-verified-arrow" />
                    </a>
                  ) : (
                    <span className="cert-verified-tag">
                      <CheckCircle2 size={13} />
                      <span>{language === 'uk' ? 'Підтверджено' : 'Verified'}</span>
                    </span>
                  )}
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
                        href={getProjectUrl(proj.id, proj.url)}
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

      {/* ── Floating back-to-top (the wrapper is the scroll container) ── */}
      <button
        className={`back-to-top-btn${showBackToTop ? ' visible' : ''}`}
        onClick={scrollToTop}
        aria-label={t.backToTop}
        title={t.backToTop}
      >
        <ArrowUp size={18} />
      </button>
    </div>
  );
}

