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
  Clock,
  Layers,
  Code2,
  Cpu,
  Wrench,
  Sun,
  Moon,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  Printer,
  ArrowUp,
  ArrowUpRight
} from 'lucide-react';
import ResumePrintDocument from './ResumePrintDocument';
import TimeOfDaySlider from './TimeOfDaySlider';
import { dayNightState, subscribeToDayNight } from '../../store/dayNightState';

/** Section ids watched by the scroll-spy (order matches the sticky nav). */
const SECTION_IDS = ['projects', 'about', 'education', 'skills', 'certifications', 'contacts'];

/** Live-demo screenshots for project cards (captured from the deployed apps). */
const PROJECT_SHOTS: Record<string, string> = {
  forma: '/shots/forma.jpg',
  terrascope: '/shots/terrascope.jpg',
  lumina: '/shots/lumina.jpg',
  aetheria: '/shots/aetheria.jpg'
};

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
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function ClassicLandingView(): React.ReactElement {
  const { language, setLanguage, setViewMode, setSelectedProject, theme, toggleTheme } = useGameStore();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [activeSection, setActiveSection] = useState('projects');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [kyivTime, setKyivTime] = useState<string>('');
  const [ambientGlow, setAmbientGlow] = useState<string>('rgba(99, 102, 241, 0.12)');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const profile = developerProfiles[language];
  const t = translations[language].landing;
  const navT = translations[language].nav;
  const edu = profile.education[0];
  const isUk = language === 'uk';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2800);
  };

  const handleCopyEmail = () => {
    const email = profile.contacts.email;
    const done = () => {
      setCopiedEmail(true);
      showToast(isUk ? `Email скопійовано: ${email}` : `Copied to clipboard: ${email}`);
      setTimeout(() => setCopiedEmail(false), 2200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(done).catch(() => {
        if (legacyCopyEmail(email)) done();
      });
    } else if (legacyCopyEmail(email)) {
      done();
    }
  };

  // Live Kyiv digital clock
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', {
          timeZone: 'Europe/Kyiv',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        setKyivTime(timeStr);
      } catch (_) {}
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ambient sky glow reacting live to dayNightState slider scrubbing!
  useEffect(() => {
    const updateAura = () => {
      const { sky, sunElev } = dayNightState;
      const nf = Math.max(0, Math.min(1, (0.05 - sunElev) / 0.35));
      const c = nf > 0.5 ? sky.horizon : sky.sunTint;
      const alpha = 0.14 + 0.1 * (1 - nf);
      setAmbientGlow(`rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha.toFixed(2)})`);
    };
    updateAura();
    return subscribeToDayNight(updateAura)();
  }, []);

  // Sky tint: a full-viewport backdrop mirroring the current cycle sky even
  // without the WebGL canvas mounted (glow + horizon→zenith arc, dissolving
  // into the page base color toward the bottom — one continuous background
  // with no seam). Runs off the same LUT the dome samples; nights breathe
  // stronger (opacity follows the night factor) so dark-mode panels settle
  // onto a distinctly moonlit page. ~30 Hz repaint keeps scrubbing fluid.
  const skyTintRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = skyTintRef.current;
    if (!el) return undefined;
    const rgba = (c: readonly number[], a: number) =>
      `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;
    const paint = () => {
      const { zenith, horizon, sunTint } = dayNightState.sky;
      const night = Math.max(0, Math.min(1, (0.05 - dayNightState.sunElev) / 0.35));
      const glowC = night > 0.5 ? horizon : sunTint;
      // The arc dissolves into the page's own --bg-app near the bottom; the
      // final stop is the ZENITH color at alpha 0 (plain `transparent` is
      // rgba(0,0,0,0) and would fade bright skies through a muddy gray).
      el.style.background = [
        `radial-gradient(120% 42% at 50% -8%, ${rgba(glowC, 1)} 0%, ${rgba(glowC, 0)} 55%)`,
        `linear-gradient(180deg, ${rgba(horizon, 1)} 0%, ${rgba(horizon, 1)} 26%, ${rgba(zenith, 1)} 58%, ${rgba(zenith, 0)} 88%)`
      ].join(', ');
      el.style.opacity = String(0.35 + 0.3 * night);
    };
    paint();
    let lastPaint = 0;
    return subscribeToDayNight(() => {
      const now = performance.now();
      if (now - lastPaint < 33) return; // ~30 Hz: smooth gradient flow while scrubbing
      lastPaint = now;
      paint();
    });
  }, []);

  // Scroll-spy: highlight nav link currently in view
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

  // Scroll reveal: sections fade up gracefully as they enter the viewport
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
      { threshold: 0.08 }
    );
    container.querySelectorAll('.classic-section').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Back-to-top handler
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return undefined;
    const onScroll = () => setShowBackToTop(el.scrollTop > 500);
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    wrapperRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Card cursor spotlight & 3D tilt
  const handleCardMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = -((y - centerY) / centerY) * 2.8;
    const rotateY = ((x - centerX) / centerX) * 2.8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    card.style.transform = '';
  };

  const navItems = [
    { id: 'projects', label: isUk ? 'Проєкти' : 'Work' },
    { id: 'about', label: isUk ? 'Про мене' : 'About' },
    { id: 'education', label: isUk ? 'Освіта' : 'Education' },
    { id: 'skills', label: isUk ? 'Навички' : 'Skills' },
    { id: 'certifications', label: isUk ? 'Сертифікати' : 'Certificates' },
    { id: 'contacts', label: isUk ? 'Контакти' : 'Contact' }
  ];

  const heroStats = [
    { value: '2+', label: isUk ? 'роки комерційної та продуктової розробки' : 'years of product engineering' },
    { value: '4', label: isUk ? 'флагманські веб-додатки (3D WebGL, LMS)' : 'flagship WebGL & full-stack apps' },
    { value: 'KPI', label: isUk ? 'Інженерія програмного забезпечення (4 курс)' : 'Software Engineering (NTUU KPI)' },
    { value: 'C2', label: isUk ? 'EF SET English Proficient (78/100)' : 'EF SET English Proficient (78/100)' }
  ];

  const getCategoryIcon = (idx: number) => {
    switch (idx) {
      case 0: return <Code2 size={18} className="skill-cat-icon" />;
      case 1: return <Layers size={18} className="skill-cat-icon" />;
      case 2: return <Cpu size={18} className="skill-cat-icon" />;
      default: return <Wrench size={18} className="skill-cat-icon" />;
    }
  };

  // Filter projects by the active skill chip (clicked from tech tags)
  const allProjects = Object.values(profile.projects);
  const filteredProjects = allProjects.filter((proj) => {
    if (selectedSkillFilter) {
      const filterLower = selectedSkillFilter.toLowerCase();
      const hasTag = proj.tags.some((t) => t.toLowerCase().includes(filterLower));
      const hasFeature = proj.features.some((f) => f.toLowerCase().includes(filterLower));
      const hasDesc = proj.description.toLowerCase().includes(filterLower);
      if (!hasTag && !hasFeature && !hasDesc) return false;
    }
    return true;
  });

  return (
    <div className="classic-landing-wrapper" ref={wrapperRef}>
      {/* ── Live Sky Backdrop: the full page background mirrors the current
          cycle sky (glow + horizon→zenith arc, dissolving toward the bottom).
          Repainted at ~30 Hz from the same LUT the WebGL dome samples, so
          scrubbing the TimeOfDaySlider flows the CLASSIC theme continuously
          instead of flipping it — the 3D world and the resume share one sky. ── */}
      <div className="classic-sky-tint" ref={skyTintRef} aria-hidden="true" />

      {/* ── Dynamic Ambient Aura responding to TimeOfDaySlider ── */}
      <div
        className="hero-ambient-aura"
        style={{
          background: `radial-gradient(ellipse 90% 45% at 50% -12%, ${ambientGlow} 0%, transparent 70%)`
        }}
        aria-hidden="true"
      />

      {/* ── Floating Interactive Toast ── */}
      {toastMessage && (
        <div className="interactive-toast-pill" role="status" aria-live="polite">
          <Sparkles size={14} className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Screen Interactive Web View ── */}
      <div className="classic-web-view">
        {/* ── Minimalist Editorial Navigation ── */}
        <header className="classic-header glass-panel">
          <div className="header-left">
            {/* Brand Monogram */}
            <a href="#hero" className="header-brand">
              <span className="brand-monogram">DH</span>
              <span className="brand-name">{profile.name}</span>
            </a>

            {/* Live Availability Status Indicator */}
            <a href="#contacts" className="header-status-pill" title={profile.status}>
              <span className="status-dot pulse-dot" />
              <span className="header-status-text">
                <span className="status-text-full">{isUk ? 'Доступний до проєктів' : 'Available for work'}</span>
                <span className="status-text-compact">{isUk ? 'Доступний' : 'Available'}</span>
              </span>
            </a>
          </div>

          {/* Desktop Nav Links */}
          <nav className="classic-nav-links" aria-label="Main Navigation">
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

          {/* Right Header Controls Cluster */}
          <div className="classic-header-actions">
            {/* Time of Day Continuous Scrubber (The user's favorite signature feature!) */}
            <div className="header-slider-wrap" title={isUk ? 'Потягніть для плавного налаштування часу доби та теми' : 'Drag to adjust time of day and continuous theme'}>
              <TimeOfDaySlider />
            </div>

            {/* Fallback Theme Toggle (Mobile <= 640px) */}
            <button
              className="theme-toggle-btn slider-fallback-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? (isUk ? 'Світла тема' : 'Light Mode') : (isUk ? 'Темна тема' : 'Dark Mode')}
              aria-label={theme === 'dark' ? 'Toggle light mode' : 'Toggle dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Language Switcher */}
            <div className="lang-toggle-group mini">
              <button
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
                aria-label="English version"
              >
                EN
              </button>
              <button
                className={`lang-btn ${language === 'uk' ? 'active' : ''}`}
                onClick={() => setLanguage('uk')}
                aria-label="Українська версія"
              >
                UA
              </button>
            </div>

            {/* Let's Talk CTA */}
            <a href="#contacts" className="header-cta-pill">
              <span>{isUk ? 'Обговорити' : "Let's Talk"}</span>
              <ArrowUpRight size={14} className="cta-arrow" />
            </a>

            {/* Switch to 3D Mode */}
            <button
              className="switch-3d-btn"
              onClick={() => setViewMode('3d')}
              title={navT.view3D}
            >
              <Compass size={15} />
              <span className="switch-3d-text-full">{isUk ? '3D Світ' : '3D World'}</span>
              <span className="switch-3d-text-compact">3D</span>
            </button>
          </div>
        </header>

        {/* ── Main Scrollable Content ── */}
        <main className="classic-main-content">
          {/* ── HERO SECTION ── */}
          <section id="hero" className="classic-hero-section">
            <div className="hero-eyebrow-row">
              <div className="hero-status-tag">
                <span className="status-dot pulse-dot" />
                <span>{profile.location} • {profile.status}</span>
              </div>

              {/* Digital Kyiv Clock */}
              {kyivTime && (
                <div className="hero-clock-tag" title="Kyiv Local Time (UTC+3)">
                  <Clock size={12} />
                  <span>Kyiv {kyivTime}</span>
                </div>
              )}
            </div>

            {/* Big, Crisp Editorial Headline */}
            <div className="hero-headline-block">
              <h1 className="hero-name-display">{profile.name}</h1>
              <h2 className="hero-role-display">{profile.role}</h2>
            </div>

            <p className="hero-bio-lead">{profile.bio}</p>

            {/* Action Buttons & Socials */}
            <div className="hero-actions-container">
              <div className="hero-action-buttons">
                <a href="#contacts" className="btn-primary">
                  <span>{isUk ? 'Давайте співпрацювати' : "Let's collaborate"}</span>
                  <ArrowUpRight size={16} className="cta-arrow" />
                </a>

                <button className="btn-secondary" onClick={() => setViewMode('3d')}>
                  <Compass size={15} />
                  <span>{t.viewIn3D}</span>
                </button>

                <button className="btn-ghost" onClick={() => window.print()}>
                  <Printer size={15} />
                  <span>{t.downloadPdf}</span>
                </button>

                <button className="btn-ghost" onClick={handleCopyEmail}>
                  {copiedEmail ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedEmail ? t.copied : t.copyEmail}</span>
                </button>
              </div>

              <div className="hero-socials-row">
                <a
                  href={`mailto:${profile.contacts.email}`}
                  className="hero-social-pill"
                  title="Email"
                >
                  <Mail size={15} />
                  <span>Email</span>
                </a>
                <a
                  href={profile.contacts.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-social-pill"
                  title="Telegram"
                >
                  <Send size={15} />
                  <span>Telegram</span>
                </a>
                <a
                  href={profile.contacts.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-social-pill"
                  title="GitHub"
                >
                  <GithubIcon size={15} />
                  <span>GitHub</span>
                </a>
              </div>
            </div>

            {/* Credibility Highlights Strip */}
            <div className="hero-stats-grid">
              {heroStats.map((stat, idx) => (
                <div key={idx} className="hero-stat-card">
                  <div className="hero-stat-value">{stat.value}</div>
                  <div className="hero-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── SELECTED WORK / FEATURED PROJECTS ── */}
          <section id="projects" className="classic-section projects-section">
            <div className="section-header-row">
              <div className="section-header">
                <div className="section-tag">{isUk ? 'Портфоліо' : 'Selected Works'}</div>
                <h2 className="section-title">{t.projectsTitle}</h2>
                <p className="section-subtitle">{t.projectsSubtitle}</p>
              </div>
            </div>

            <div className="editorial-projects-list">
              {filteredProjects.map((proj, idx) => (
                <article
                  key={proj.id}
                  className="editorial-project-card spotlight-card glass-panel"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  {/* Media Preview Container with Click-to-Modal Lightbox */}
                  <div
                    className="editorial-project-media"
                    onClick={() => setSelectedProject(proj.id)}
                    title={isUk ? 'Натисніть для детального перегляду' : 'Click to inspect project details'}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={PROJECT_SHOTS[proj.id] ?? `/shots/${proj.id}.jpg`}
                      alt={proj.title}
                      loading="lazy"
                      draggable={false}
                    />

                    <div className="media-quick-inspect">
                      <Sparkles size={14} />
                      <span>{isUk ? 'Огляд деталей' : 'Quick Details'}</span>
                    </div>
                  </div>

                  {/* Project Info & Description */}
                  <div className="editorial-project-body">
                    <div className="editorial-project-header">
                      <span className="project-index">0{idx + 1}</span>
                      <div className="project-heading-wrap">
                        <span className="project-tagline">{proj.tagline}</span>
                        <h3 className="project-title">{proj.title}</h3>
                      </div>
                    </div>

                    <p className="project-description">{proj.description}</p>

                    {/* Key Technical Highlights */}
                    <div className="project-features-list">
                      {proj.features.slice(0, 3).map((feat, fIdx) => (
                        <div key={fIdx} className="project-feature-bullet">
                          <span className="bullet-dot" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Interactive Tech Badges (Click to cross-filter!) */}
                    <div className="project-tags">
                      {proj.tags.map((tag, tIdx) => {
                        const isTagSelected = selectedSkillFilter?.toLowerCase() === tag.toLowerCase();
                        return (
                          <button
                            key={tIdx}
                            className={`project-tag-pill interactive ${isTagSelected ? 'selected' : ''}`}
                            onClick={() => {
                              const next = isTagSelected ? null : tag;
                              setSelectedSkillFilter(next);
                              showToast(next ? `${isUk ? 'Фільтр:' : 'Filtered:'} ${tag}` : (isUk ? 'Фільтр скинуто' : 'Filter reset'));
                            }}
                            title={isUk ? `Фільтрувати за ${tag}` : `Filter by ${tag}`}
                          >
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Action Links */}
                    <div className="editorial-project-actions">
                      {proj.url && (
                        <a
                          href={getProjectUrl(proj.id, proj.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-action-link primary"
                        >
                          <span>{t.liveDemo}</span>
                          <ArrowUpRight size={14} />
                        </a>
                      )}

                      {proj.githubUrl && (
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-action-link secondary"
                        >
                          <GithubIcon size={14} />
                          <span>{t.sourceCode}</span>
                        </a>
                      )}

                      <button
                        className="project-action-link ghost"
                        onClick={() => setSelectedProject(proj.id)}
                      >
                        <Sparkles size={14} />
                        <span>{translations[language].modals.projectDetails}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ── ABOUT ME & ARCHITECTURE PHILOSOPHY ── */}
          <section id="about" className="classic-section">
            <div className="section-header">
              <div className="section-tag">{isUk ? 'Експертиза' : 'Expertise'}</div>
              <h2 className="section-title">{t.aboutTitle}</h2>
              <p className="section-subtitle">{t.aboutSubtitle}</p>
            </div>

            <div className="editorial-about-grid">
              {profile.summary.map((item, idx) => (
                <div
                  key={idx}
                  className="editorial-about-card spotlight-card glass-panel"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <span className="about-card-number">0{idx + 1}</span>
                  <p className="about-card-text">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── EDUCATION & ACADEMIC BACKGROUND ── */}
          {edu && (
            <section id="education" className="classic-section">
              <div className="section-header">
                <div className="section-tag">{isUk ? 'Академічний бекграунд' : 'Academic Background'}</div>
                <h2 className="section-title">{t.educationTitle}</h2>
                <p className="section-subtitle">{t.educationSubtitle}</p>
              </div>

              <div
                className="editorial-edu-card spotlight-card glass-panel"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="edu-top-row">
                  <div className="edu-main-info">
                    <span className="edu-badge">
                      <GraduationCap size={15} />
                      <span>{edu.degree}</span>
                    </span>
                    <h3 className="edu-institution-name">{edu.institution}</h3>
                    <p className="edu-faculty-name">
                      {edu.faculty} • {edu.specialty}
                    </p>
                  </div>

                  <div className="edu-meta-block">
                    <span className="edu-period-badge">{edu.period}</span>
                    <span className="edu-status-pill">
                      <span className="status-dot pulse-dot" />
                      <span>{edu.status}</span>
                    </span>
                    <span className="edu-location">
                      <MapPin size={13} />
                      <span>{edu.location}</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── SKILLS & TECH STACK ── */}
          <section id="skills" className="classic-section">
            <div className="section-header">
              <div className="section-tag">{isUk ? 'Технологічний стек' : 'Technology Stack'}</div>
              <h2 className="section-title">{t.skillsTitle}</h2>
              <p className="section-subtitle">
                {isUk
                  ? 'Натисніть на будь-яку технологію, щоб миттєво підсвітити проєкти, у яких вона застосовується'
                  : 'Click any technology to instantly cross-filter and highlight matching projects'}
              </p>
            </div>

            <div className="editorial-skills-grid">
              {profile.skills.map((cat, idx) => (
                <div
                  key={idx}
                  className="editorial-skill-category spotlight-card glass-panel"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <div className="skill-cat-header">
                    <div className="skill-cat-icon-wrap">
                      {getCategoryIcon(idx)}
                    </div>
                    <h3 className="skill-cat-title">{cat.category}</h3>
                  </div>

                  <div className="skill-pills-wrap">
                    {cat.items.map((skill, sIdx) => {
                      const isSelected = selectedSkillFilter === skill;
                      return (
                        <button
                          key={sIdx}
                          className={`skill-pill interactive-skill-tag ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            const next = isSelected ? null : skill;
                            setSelectedSkillFilter(next);
                            showToast(next ? `${isUk ? 'Підсвічено проєкти з' : 'Spotlighted projects with'} ${next}` : (isUk ? 'Фільтр скинуто' : 'Filter reset'));
                            const el = document.getElementById('projects');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          title={isUk ? `Натисніть, щоб підсвітити проєкти з ${skill}` : `Click to spotlight projects using ${skill}`}
                        >
                          <span>{skill}</span>
                          <span className="pill-arrow-hint">↗</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── VERIFIED CERTIFICATIONS ── */}
          <section id="certifications" className="classic-section">
            <div className="section-header">
              <div className="section-tag">{isUk ? 'Кваліфікація' : 'Credentials'}</div>
              <h2 className="section-title">{t.certificationsTitle}</h2>
              <p className="section-subtitle">{t.certificationsSubtitle}</p>
            </div>

            <div className="editorial-cert-grid">
              {profile.certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="editorial-cert-card spotlight-card glass-panel"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <div className="cert-top-row">
                    <span className="cert-issuer">{cert.issuer}</span>
                    <span className="cert-level">{cert.level}</span>
                  </div>

                  <h3 className="cert-title">{cert.title}</h3>

                  <div className="cert-bottom-row">
                    {cert.url ? (
                      <a
                        href={cert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cert-verify-link"
                      >
                        <CheckCircle2 size={14} />
                        <span>{isUk ? 'Підтверджено' : 'Verified'}</span>
                        <ArrowUpRight size={13} />
                      </a>
                    ) : (
                      <span className="cert-verify-tag">
                        <CheckCircle2 size={14} />
                        <span>{isUk ? 'Підтверджено' : 'Verified'}</span>
                      </span>
                    )}
                    <span className="cert-category">{cert.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CONTACTS & CALL TO ACTION ── */}
          <section id="contacts" className="classic-section contacts-section">
            {/* Minimalist Editorial CTA Banner */}
            <div
              className="editorial-cta-banner spotlight-card glass-panel"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <div className="cta-status-badge">
                <span className="status-dot pulse-dot" />
                <span>{isUk ? 'Доступний до співпраці' : 'Available for opportunities'}</span>
              </div>

              <h2 className="cta-headline">{t.ctaHeadline}</h2>
              <p className="cta-text">{t.ctaText}</p>

              <div className="cta-action-row">
                <a href={`mailto:${profile.contacts.email}`} className="cta-big-btn">
                  <Mail size={17} />
                  <span>{profile.contacts.email}</span>
                  <ArrowUpRight size={16} />
                </a>

                <button className="cta-copy-btn" onClick={handleCopyEmail}>
                  {copiedEmail ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedEmail ? t.copied : t.copyEmail}</span>
                </button>
              </div>
            </div>

            {/* Direct Reach Channels */}
            <div className="contacts-grid">
              <a
                href={`mailto:${profile.contacts.email}`}
                className="contact-card spotlight-card glass-panel"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="contact-icon-box">
                  <Mail size={20} />
                </div>
                <div className="contact-details">
                  <span className="contact-label">Email</span>
                  <span className="contact-value">{profile.contacts.email}</span>
                </div>
                <ArrowUpRight size={18} className="contact-arrow" />
              </a>

              <a
                href={profile.contacts.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-card spotlight-card glass-panel"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="contact-icon-box">
                  <Send size={20} />
                </div>
                <div className="contact-details">
                  <span className="contact-label">
                    {isUk ? 'Telegram (Прямий звʼязок)' : 'Telegram (Direct)'}
                  </span>
                  <span className="contact-value">@mokydjin</span>
                </div>
                <ArrowUpRight size={18} className="contact-arrow" />
              </a>

              <a
                href={profile.contacts.github}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-card spotlight-card glass-panel"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="contact-icon-box">
                  <GithubIcon size={20} />
                </div>
                <div className="contact-details">
                  <span className="contact-label">GitHub</span>
                  <span className="contact-value">github.com/DmytroHnylytskyi</span>
                </div>
                <ArrowUpRight size={18} className="contact-arrow" />
              </a>
            </div>

            {/* Footer */}
            <footer className="editorial-footer">
              <p className="footer-copyright">
                &copy; {new Date().getFullYear()} {profile.name}. {t.rightsReserved}
              </p>
            </footer>
          </section>
        </main>

        {/* ── Floating Back to Top ── */}
        <button
          className={`back-to-top-btn${showBackToTop ? ' visible' : ''}`}
          onClick={scrollToTop}
          aria-label={t.backToTop}
          title={t.backToTop}
        >
          <ArrowUp size={18} />
        </button>
      </div>

      {/* ── Print-Only Executive CV Document (Rendered only on window.print()) ── */}
      <ResumePrintDocument language={language} />
    </div>
  );
}
