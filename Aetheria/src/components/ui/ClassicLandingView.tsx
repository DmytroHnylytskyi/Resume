'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Compass,
  Copy,
  Cpu,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  Moon,
  Printer,
  Send,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Wrench,
  X
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles, translations } from '../../data/resumeData';
import { dayNightState, subscribeToDayNight } from '../../store/dayNightState';
import useSpatialResume from '../../hooks/useSpatialResume';
import { getGlobalCyberAudio } from '../../hooks/cyberAudio';
import OrbitalArtifact from './OrbitalArtifact';
import ResumePrintDocument from './ResumePrintDocument';
import TimeOfDaySlider from './TimeOfDaySlider';
import TypedBio from './TypedBio';
import RotatingRole from './RotatingRole';
import ProjectsScrollScene from './ProjectsScrollScene';
import { GithubIcon } from './icons';
import styles from './ClassicLandingView.module.css';
import dynamic from 'next/dynamic';

const SingularityBackground = dynamic(
  () => import('../singularity/SingularityBackground'),
  { ssr: false }
);

const SECTION_IDS = [
  'projects',
  'about',
  'education',
  'skills',
  'certifications',
  'interactive-3d',
  'contacts'
];

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function legacyCopyEmail(text: string): boolean {
  const textarea = document.createElement('textarea');
  const focused = document.activeElement;
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';

  try {
    document.body.appendChild(textarea);
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
  }
}

/** Pointer lighting does not transform text or cause React renders. */
function updateSpotlight(event: React.PointerEvent<HTMLElement>): void {
  if (
    event.pointerType !== 'mouse'
    || prefersReducedMotion()
    || !window.matchMedia('(pointer: fine)').matches
  ) return;

  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  element.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
  element.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
}

/** Interactive 3D micro-tilt and dynamic specular lighting for showpiece cards. */
function updateCardTilt(event: React.PointerEvent<HTMLElement>): void {
  if (
    event.pointerType !== 'mouse'
    || prefersReducedMotion()
    || !window.matchMedia('(pointer: fine)').matches
  ) return;

  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const normX = (x / rect.width - 0.5) * 2;
  const normY = (y / rect.height - 0.5) * 2;

  element.style.setProperty('--pointer-x', `${x}px`);
  element.style.setProperty('--pointer-y', `${y}px`);
  element.style.setProperty('--tilt-x', `${normY * -4.5}deg`);
  element.style.setProperty('--tilt-y', `${normX * 5.5}deg`);
  element.style.setProperty('--glare-opacity', '0.28');
}

function resetCardTilt(event: React.PointerEvent<HTMLElement>): void {
  const element = event.currentTarget;
  element.style.setProperty('--tilt-x', '0deg');
  element.style.setProperty('--tilt-y', '0deg');
  element.style.setProperty('--glare-opacity', '0');
}

/** Keep the one-second clock updates out of the main page component. */
function KyivClock(): React.ReactElement | null {
  const [time, setTime] = useState('');

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Kyiv',
      hour: '2-digit',
      minute: '2-digit'
    });
    const update = () => setTime(formatter.format(new Date()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <span className={styles.clock}>
      <Clock size={13} aria-hidden="true" />
      <span>Kyiv {time}</span>
    </span>
  );
}

interface SectionHeadingProps {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
}

function SectionHeading({
  number,
  eyebrow,
  title,
  description
}: SectionHeadingProps): React.ReactElement {
  return (
    <div className={styles.sectionHeading}>
      <div className={styles.sectionEyebrow}>
        <span aria-hidden="true">{number}</span>
        <span>{eyebrow}</span>
      </div>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description && <p className={styles.sectionDescription}>{description}</p>}
    </div>
  );
}

function CategoryIcon({ index }: { index: number }): React.ReactElement {
  const Icon = [Code2, Layers, Cpu, Wrench][index % 4];
  return <Icon size={20} aria-hidden="true" />;
}

export default function ClassicLandingView(): React.ReactElement {
  const {
    language,
    setLanguage,
    setViewMode,
    setSelectedProject,
    theme,
    toggleTheme,
    isAudioMuted,
    toggleAudio
  } = useGameStore();

  const profile = developerProfiles[language];
  const t = translations[language].landing;
  const navT = translations[language].nav;
  const isUk = language === 'uk';
  const allProjects = Object.values(profile.projects);

  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [toast, setToast] = useState('');
  const [warpActive, setWarpActive] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const isPrintingRef = useRef(false);

  useEffect(() => {
    const onBefore = () => { isPrintingRef.current = true; };
    const onAfter = () => { isPrintingRef.current = false; };
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
    };
  }, []);

  useEffect(() => {
    const checkDesktop = () => {
      if (isPrintingRef.current) return;
      setIsDesktop(window.innerWidth >= 900);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleNavigate3D = () => {
    const audio = getGlobalCyberAudio();
    // Entering 3D is an explicit user gesture: ensure audio engine is unlocked and unmuted
    if (useGameStore.getState().isAudioMuted) {
      void audio.setEnabled(true).then((enabled) => {
        useGameStore.setState({ isAudioMuted: !enabled });
        if (enabled) {
          audio.play('warp');
        }
      });
    } else {
      audio.play('warp');
    }

    if (!isDesktop) {
      const isLoaded = useGameStore.getState().isSceneLoaded;
      if (isLoaded) {
        useGameStore.setState({ isIntroPlaying: true });
      } else {
        useGameStore.setState({ pendingIntro: true, isIntroPlaying: false });
      }
      setViewMode('3d');
      return;
    }
    if (warpActive) return;
    setWarpActive(true);
  };

  const handleWarpComplete = () => {
    getGlobalCyberAudio().play('portal');
    const isLoaded = useGameStore.getState().isSceneLoaded;
    if (isLoaded) {
      useGameStore.setState({ isIntroPlaying: true });
    } else {
      useGameStore.setState({ pendingIntro: true, isIntroPlaying: false });
    }
    setViewMode('3d');
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLElement>(null);
  const pendingProjectNavigationRef = useRef(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const copyVersionRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSpatialResume(wrapperRef, isDesktop);

  const navItems = [
    { id: 'projects', label: navT.projects },
    { id: 'about', label: navT.about },
    { id: 'education', label: navT.education },
    { id: 'skills', label: navT.skills },
    { id: 'certifications', label: navT.certifications },
    { id: 'contacts', label: navT.contacts }
  ].filter((item) => item.id !== 'education' || profile.education.length > 0);

  const normalizedSkill = selectedSkill?.toLocaleLowerCase();
  const filteredProjects = allProjects.filter((project) => {
    if (!normalizedSkill) return true;
    return [
      ...project.tags,
      ...project.features,
      project.description
    ].some((text) => text.toLocaleLowerCase().includes(normalizedSkill));
  });

  const isSkillSelected = (skill: string) =>
    normalizedSkill === skill.toLocaleLowerCase();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      copyVersionRef.current += 1;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Navigate after the filtered scene has committed its new height.
  useEffect(() => {
    if (!pendingProjectNavigationRef.current) return;
    pendingProjectNavigationRef.current = false;

    const frame = requestAnimationFrame(() => {
      projectsRef.current?.focus({ preventScroll: true });
      projectsRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedSkill]);

  const notify = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(''), 3200);
  };

  const handleCopyEmail = async () => {
    const version = ++copyVersionRef.current;
    const email = profile.contacts.email;
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        copied = true;
      }
    } catch {
      // Continue to the synchronous fallback if permission was denied.
    }

    if (!mountedRef.current || version !== copyVersionRef.current) return;
    if (!copied) copied = legacyCopyEmail(email);

    if (copied) {
      setCopiedEmail(true);
      notify(isUk ? 'Email скопійовано' : 'Email copied to clipboard');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedEmail(false), 2200);
    } else {
      notify(
        isUk
          ? 'Не вдалося скопіювати. Скористайтеся посиланням Email.'
          : 'Could not copy. Please use the Email link.'
      );
    }
  };

  /*
   * The existing day/night engine remains the only source of sky colors.
   * DOM-only painting avoids rerendering the page during slider animation.
   */
  useEffect(() => {
    let frame = 0;
    const rgba = (color: readonly number[], alpha: number) =>
      `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${alpha})`;

    const paint = () => {
      const { sky, sunElev } = dayNightState;
      const night = Math.max(0, Math.min(1, (0.05 - sunElev) / 0.35));
      const glow = night > 0.5 ? sky.horizon : sky.sunTint;

      if (skyRef.current) {
        skyRef.current.style.background = [
          `radial-gradient(120% 42% at 50% -8%, ${rgba(glow, 1)} 0%, ${rgba(glow, 0)} 55%)`,
          `linear-gradient(180deg, ${rgba(sky.horizon, 1)} 0%, ${rgba(sky.horizon, 1)} 26%, ${rgba(sky.zenith, 1)} 58%, ${rgba(sky.zenith, 0)} 88%)`
        ].join(', ');
        skyRef.current.style.opacity = String(0.35 + 0.3 * night);
      }

      if (auraRef.current) {
        auraRef.current.style.background =
          `radial-gradient(ellipse 90% 65% at 80% 0%, ${rgba(glow, 0.14 + 0.1 * (1 - night))} 0%, ${rgba(glow, 0)} 75%)`;
      }
    };

    paint();
    const unsubscribe = subscribeToDayNight(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        paint();
      });
    });

    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, []);

  /*
   * Measure sticky chrome and paint progress without rendering every frame.
   */
  useEffect(() => {
    const root = wrapperRef.current;
    const main = mainRef.current;
    if (!root || !main) return;

    let frame = 0;
    let stickyHeight = 64;
    let currentSection = '';
    let currentBackToTop = false;

    const update = () => {
      frame = 0;
      const maxScroll = root.scrollHeight - root.clientHeight;
      const progress = maxScroll > 0 ? root.scrollTop / maxScroll : 0;
      if (progressRef.current) {
        progressRef.current.style.transform =
          `scaleX(${Math.max(0, Math.min(1, progress))})`;
      }

      const rootTop = root.getBoundingClientRect().top;
      const readingLine = rootTop + stickyHeight + Math.min(160, root.clientHeight * 0.2);
      let nextSection = 'hero';

      SECTION_IDS.forEach((id) => {
        const section = root.querySelector<HTMLElement>(`#${id}`);
        if (section && section.getBoundingClientRect().top <= readingLine) {
          nextSection = id;
        }
      });

      if (maxScroll > 0 && root.scrollTop >= maxScroll - 4) {
        nextSection = 'contacts';
      }

      if (nextSection !== currentSection) {
        currentSection = nextSection;
        setActiveSection(nextSection);
      }

      const nextBackToTop = root.scrollTop > root.clientHeight * 0.6;
      if (nextBackToTop !== currentBackToTop) {
        currentBackToTop = nextBackToTop;
        setShowBackToTop(nextBackToTop);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const measure = () => {
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 64;
      const mobileHeight = mobileNavRef.current?.getBoundingClientRect().height ?? 0;
      stickyHeight = headerHeight + mobileHeight;
      root.style.setProperty('--resume-header-height', `${headerHeight}px`);
      root.style.setProperty('--resume-sticky-height', `${stickyHeight}px`);
      schedule();
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;

    resizeObserver?.observe(root);
    resizeObserver?.observe(main);
    if (headerRef.current) resizeObserver?.observe(headerRef.current);
    if (mobileNavRef.current) resizeObserver?.observe(mobileNavRef.current);

    root.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    measure();

    return () => {
      root.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      resizeObserver?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  /*
   * Projects use their own sticky timeline, without reveal transforms on
   * its ancestors. The remaining sections retain their entrance animation.
   */
  useEffect(() => {
    const root = wrapperRef.current;
    const main = mainRef.current;
    if (!root || !main || typeof IntersectionObserver === 'undefined') return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | null = null;

    const configure = () => {
      observer?.disconnect();
      main.removeAttribute('data-reveal-ready');
      if (preference.matches) return;

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-revealed', 'true');
          observer?.unobserve(entry.target);
        });
      }, {
        root,
        threshold: 0,
        rootMargin: '0px 0px -36px 0px'
      });

      main.querySelectorAll('[data-reveal]').forEach((element) => {
        if (element.getAttribute('data-revealed') !== 'true') {
          observer?.observe(element);
        }
      });
      main.setAttribute('data-reveal-ready', 'true');
    };

    configure();
    preference.addEventListener('change', configure);

    return () => {
      observer?.disconnect();
      main.removeAttribute('data-reveal-ready');
      preference.removeEventListener('change', configure);
    };
  }, []);

  const selectSkill = (skill: string) => {
    pendingProjectNavigationRef.current = true;
    setSelectedSkill(isSkillSelected(skill) ? null : skill);
  };

  const clearSkill = () => {
    pendingProjectNavigationRef.current = true;
    setSelectedSkill(null);
  };

  return (
    <div
      className={`classic-landing-wrapper ${styles.root}`}
      ref={wrapperRef}
      data-warp-active={isDesktop && warpActive ? 'true' : undefined}
    >
      {/* ── Live Spatial Engine: Gravitational Singularity / Quasar Background (Desktop Only) ── */}
      {isDesktop && (
        <SingularityBackground
          scrollContainerRef={wrapperRef}
          warpActive={warpActive}
          onWarpComplete={handleWarpComplete}
        />
      )}

      <div className={`classic-sky-tint ${styles.sky}`} ref={skyRef} aria-hidden="true" />
      <div className={`hero-ambient-aura ${styles.aura}`} ref={auraRef} aria-hidden="true" />

      <div
        className={`${styles.toast} ${toast ? styles.toastVisible : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast}
      </div>

      <div className="classic-web-view">
        <a className={styles.skipLink} href="#resume-main">
          {isUk ? 'Перейти до вмісту' : 'Skip to content'}
        </a>

        <header className={`classic-header ${styles.header}`} ref={headerRef}>
          <a
            href="#hero"
            className={styles.brand}
            aria-label={`${profile.name} — ${isUk ? 'На початок' : 'Back to top'}`}
          >
            <span className={styles.monogram}>DH<span aria-hidden="true">.</span></span>
            <span className={styles.brandCaption}>
              {profile.name}
              <small>{isUk ? 'Цифрове портфоліо' : 'Digital portfolio'}</small>
            </span>
          </a>

          <nav className={styles.desktopNav} aria-label={isUk ? 'Основна навігація' : 'Main navigation'}>
            {navItems.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className={activeSection === id ? styles.navActive : undefined}
                aria-current={activeSection === id ? 'location' : undefined}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <div className="header-slider-wrap">
              <TimeOfDaySlider />
            </div>
            <button
              type="button"
              className="theme-toggle-btn slider-fallback-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark'
                ? (isUk ? 'Увімкнути світлу тему' : 'Use light theme')
                : (isUk ? 'Увімкнути темну тему' : 'Use dark theme')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              className={`theme-toggle-btn audio-toggle-btn ${!isAudioMuted ? 'active' : ''}`}
              onClick={() => {
                getGlobalCyberAudio().play('click');
                toggleAudio();
              }}
              title={!isAudioMuted
                ? (isUk ? 'Вимкнути звук' : 'Mute sound')
                : (isUk ? 'Увімкнути звук' : 'Enable sound')}
              aria-label={!isAudioMuted ? 'Mute sound' : 'Enable sound'}
            >
              {!isAudioMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <div className={styles.languageGroup} role="group" aria-label={isUk ? 'Мова' : 'Language'}>
              <button type="button" onClick={() => setLanguage('en')} aria-pressed={language === 'en'} lang="en">
                EN
              </button>
              <button type="button" onClick={() => setLanguage('uk')} aria-pressed={language === 'uk'} lang="uk">
                UA
              </button>
            </div>

            <button
              type="button"
              className={styles.worldButton}
              onClick={handleNavigate3D}
              title={navT.view3D}
              aria-label={navT.view3D}
            >
              <Compass size={17} aria-hidden="true" />
              <span>3D</span>
            </button>
          </div>

          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} ref={progressRef} />
          </div>
        </header>

        <nav
          className={styles.mobileNav}
          ref={mobileNavRef}
          aria-label={isUk ? 'Навігація розділами' : 'Section navigation'}
        >
          {navItems.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeSection === id ? 'location' : undefined}
            >
              {label}
            </a>
          ))}
        </nav>

        <main id="resume-main" className={styles.main} ref={mainRef} tabIndex={-1}>
          <section id="hero" className={styles.hero} aria-label={profile.name}>
            <div className={styles.heroTopline}>
              <span className={styles.availability}>
                <span className={styles.statusDot} aria-hidden="true" />
                {profile.status}
              </span>
              <KyivClock />
            </div>

            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>
                  <span aria-hidden="true">01 /</span>
                  {isUk ? 'Ідеї. Код. Досвід.' : 'Ideas. Code. Experience.'}
                </p>

                <h1 className={styles.name}>
                  {profile.name.split(' ').map((word, index) => (
                    <span
                      key={`${word}-${index}`}
                      style={{ '--word-index': index } as React.CSSProperties}
                    >
                      {word}{' '}
                    </span>
                  ))}
                </h1>

                <p className={styles.role}>{profile.role}</p>
                <div className={styles.rotatingRole}><RotatingRole /></div>

                <div className={styles.bio}>
                  <TypedBio />
                </div>

                <div className={styles.heroActions}>
                  <a href="#projects" className={styles.primaryButton}>
                    {isUk ? 'Дивитися проєкти' : 'Explore my work'}
                    <ArrowDown size={17} aria-hidden="true" />
                  </a>
                  <a href="#contacts" className={styles.secondaryButton}>
                    {isUk ? 'Давайте співпрацювати' : "Let's collaborate"}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </a>
                </div>

                <div className={styles.heroMeta}>
                  <span><MapPin size={14} aria-hidden="true" />{profile.location}</span>
                  <button type="button" onClick={() => window.print()}>
                    <Printer size={14} aria-hidden="true" />{t.downloadPdf}
                  </button>
                  <a href={profile.contacts.github} target="_blank" rel="noopener noreferrer">
                    <GithubIcon size={14} />GitHub<ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <OrbitalArtifact isUk={isUk} onNavigate3D={handleNavigate3D} />
            </div>

            <div className={styles.stats}>
              <div>
                <strong>{String(allProjects.length).padStart(2, '0')}</strong>
                <span>{t.statProjects}</span>
              </div>
              <div>
                <strong>{String(profile.skills.length).padStart(2, '0')}</strong>
                <span>{t.statDisciplines}</span>
              </div>
              <div>
                <strong>{String(profile.certifications.length).padStart(2, '0')}</strong>
                <span>{t.statCertifications}</span>
              </div>
              <a href="#projects" className={styles.scrollCue}>
                <span>{isUk ? 'Більше нижче' : 'Scroll to discover'}</span>
                <ArrowDown size={20} aria-hidden="true" />
              </a>
            </div>
          </section>

          <section
            id="projects"
            className={styles.section}
            ref={projectsRef}
            tabIndex={-1}
            aria-label={t.projectsTitle}
          >
            <SectionHeading
              number="02"
              eyebrow={isUk ? 'Обрані роботи' : 'Selected work'}
              title={t.projectsTitle}
              description={t.projectsSubtitle}
            />

            <div className={styles.projectToolbar}>
              <p role="status" aria-live="polite">
                {isUk ? 'Показано' : 'Showing'} {filteredProjects.length} / {allProjects.length}
                {selectedSkill && <> — <strong>{selectedSkill}</strong></>}
              </p>
              {selectedSkill && (
                <button type="button" className={styles.resetButton} onClick={clearSkill}>
                  <X size={14} aria-hidden="true" />
                  {isUk ? 'Скинути фільтр' : 'Clear filter'}
                </button>
              )}
            </div>

            {filteredProjects.length > 0 ? (
              <ProjectsScrollScene
                projects={filteredProjects}
                scrollRoot={wrapperRef}
                isUk={isUk}
                selectedSkill={selectedSkill}
                liveDemoLabel={t.liveDemo}
                sourceCodeLabel={t.sourceCode}
                detailsLabel={translations[language].modals.projectDetails}
                onSelectProject={setSelectedProject}
                onSelectSkill={selectSkill}
              />
            ) : (
              <div className={styles.emptyState}>
                <Code2 size={30} aria-hidden="true" />
                <h3>{isUk ? 'Поки що немає збігів' : 'No matching projects yet'}</h3>
                <p>
                  {isUk
                    ? 'Ця технологія є у стеку, але не згадується в описах поточних проєктів.'
                    : 'This technology is part of the stack, but is not mentioned in the current project descriptions.'}
                </p>
                <button type="button" className={styles.secondaryButton} onClick={clearSkill}>
                  {isUk ? 'Показати всі проєкти' : 'Show all projects'}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>

          <section id="about" className={styles.section} data-reveal>
            <SectionHeading
              number="03"
              eyebrow={isUk ? 'Людина за кодом' : 'Behind the code'}
              title={t.aboutTitle}
              description={t.aboutSubtitle}
            />
            <div className={styles.aboutGrid}>
              {profile.summary.map((item, index) => {
                const icons = [
                  <Layers key="layers" size={24} aria-hidden="true" />,
                  <Sparkles key="sparkles" size={24} aria-hidden="true" />,
                  <Cpu key="cpu" size={24} aria-hidden="true" />,
                  <Code2 key="code2" size={24} aria-hidden="true" />
                ];
                return (
                  <div
                    key={index}
                    className={`${styles.aboutCard} ${styles.surface}`}
                    onPointerMove={updateSpotlight}
                  >
                    <span className={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</span>
                    <p>{item}</p>
                    <span className={styles.aboutIcon}>{icons[index] || icons[0]}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {profile.education.length > 0 && (
            <section id="education" className={styles.section} data-reveal>
              <SectionHeading
                number="04"
                eyebrow={isUk ? 'Фундамент' : 'Foundations'}
                title={t.educationTitle}
                description={t.educationSubtitle}
              />
              <div className={styles.educationList}>
                {profile.education.map((education, index) => (
                  <div
                    key={`${education.institution}-${index}`}
                    className={`${styles.educationCard} ${styles.surface}`}
                    onPointerMove={updateSpotlight}
                  >
                    <span className={styles.iconTile}><GraduationCap size={25} aria-hidden="true" /></span>
                    <div className={styles.educationBody}>
                      <span className={styles.eyebrow}>{education.degree}</span>
                      <h3>{education.institution}</h3>
                      <p>{education.faculty} • {education.specialty}</p>
                      <span className={styles.educationLocation}>
                        <MapPin size={14} aria-hidden="true" />{education.location}
                      </span>
                    </div>
                    <div className={styles.educationMeta}>
                      <strong>{education.period}</strong>
                      <span><span className={styles.statusDot} aria-hidden="true" />{education.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="skills" className={styles.section} data-reveal>
            <SectionHeading
              number="05"
              eyebrow={isUk ? 'Інструментарій' : 'The toolkit'}
              title={t.skillsTitle}
              description={isUk
                ? 'Оберіть технологію — перегляньте проєкти, де вона використовується.'
                : 'Choose a technology to discover the projects built with it.'}
            />
            <div className={styles.skillsGrid}>
              {profile.skills.map((category, index) => (
                <div
                  key={category.category}
                  className={`${styles.skillCard} ${styles.surface}`}
                  onPointerMove={updateSpotlight}
                >
                  <div className={styles.skillHeader}>
                    <span className={styles.iconTile}><CategoryIcon index={index} /></span>
                    <span className={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{category.category}</h3>
                  <div className={styles.tags}>
                    {category.items.map((skill) => (
                      <button
                        type="button"
                        key={skill}
                        aria-pressed={isSkillSelected(skill)}
                        onClick={() => selectSkill(skill)}
                      >
                        {skill}<ArrowUpRight size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="certifications" className={styles.section} data-reveal>
            <SectionHeading
              number="06"
              eyebrow={isUk ? 'Навчання без зупинки' : 'Always learning'}
              title={t.certificationsTitle}
              description={t.certificationsSubtitle}
            />
            <div className={styles.certGrid}>
              {profile.certifications.map((certificate) => (
                <div
                  key={certificate.id}
                  className={`${styles.certCard} ${styles.surface}`}
                  onPointerMove={updateSpotlight}
                >
                  <div className={styles.certTopline}>
                    <span>{certificate.issuer}</span>
                    {certificate.level && <span className={styles.certLevel}>{certificate.level}</span>}
                  </div>
                  <h3>{certificate.title}</h3>
                  <div className={styles.certFooter}>
                    <span>{certificate.category}</span>
                    {certificate.url ? (
                      <a href={certificate.url} target="_blank" rel="noopener noreferrer">
                        {certificate.verified && <CheckCircle2 size={14} aria-hidden="true" />}
                        {certificate.verified
                          ? (isUk ? 'Підтверджено' : 'Verified')
                          : (isUk ? 'Переглянути' : 'View credential')}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                    ) : certificate.verified ? (
                      <span className={styles.verified}>
                        <CheckCircle2 size={14} aria-hidden="true" />
                        {isUk ? 'Підтверджено' : 'Verified'}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 07. Interactive 3D World Showcase Banner ── */}
          <section id="interactive-3d" className={styles.section} data-reveal>
            <div
              className={`${styles.worldCtaBanner} ${styles.surface}`}
              onPointerMove={updateCardTilt}
              onPointerLeave={resetCardTilt}
            >
              {/* Dynamic perspective cyber-grid lines on card floor */}
              <div className={styles.worldCtaGridBackground} aria-hidden="true" />
              {/* Dynamic interactive glare sheen */}
              <div className={styles.worldCtaGlare} aria-hidden="true" />

              <div className={styles.worldCtaContent}>
                <div className={styles.sectionEyebrow}>
                  <span aria-hidden="true">07</span>
                  <span>{isUk ? 'Інтерактивний досвід' : 'Interactive Experience'}</span>
                </div>

                <div className={styles.worldCtaBadges}>
                  {['Three.js', 'React Three Fiber', 'Rapier Physics', 'GLSL Shaders'].map((tech) => (
                    <span key={tech} className={styles.worldCtaBadge}>
                      <span className={styles.worldCtaBadgeDot} />
                      {tech}
                    </span>
                  ))}
                </div>

                <h2>
                  {isUk
                    ? 'Хочете побачити цей стек у дії?'
                    : 'Want to experience this stack live?'}
                </h2>

                <p>
                  {isUk
                    ? 'Перейдіть в інтерактивний 3D-світ Aetheria: вільне переміщення персонажа, фізика в реальному часі, процедурні GLSL-шейдери та WebGL-архітектура прямо у вашому браузері.'
                    : 'Step into Aetheria 3D — control a character, explore the island, test physics and spatial WebGL interactions right in your browser.'}
                </p>

                <div className={styles.worldCtaActions}>
                  <button
                    type="button"
                    className={styles.worldCtaButton}
                    onClick={handleNavigate3D}
                    onPointerEnter={() => getGlobalCyberAudio().play('hover')}
                  >
                    <span className={styles.worldCtaBeacon}>
                      <span className={styles.worldCtaPing} />
                      <span className={styles.worldCtaBeaconDot} />
                    </span>
                    <Compass size={20} aria-hidden="true" />
                    <span>{isUk ? 'Зануритися в 3D світ' : 'Launch 3D Experience'}</span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Holographic 3D Portal Chamber */}
              <div className={styles.worldCtaGraphic} aria-hidden="true">
                {/* Floating Telemetry HUD Badges */}
                <div className={`${styles.worldCtaHudPill} ${styles.worldCtaHudTop}`}>
                  <span className={styles.hudPillDot} />
                  <span>60 FPS WEBGL</span>
                </div>
                <div className={`${styles.worldCtaHudPill} ${styles.worldCtaHudRight}`}>
                  <span>RAPIER 3D</span>
                </div>
                <div className={`${styles.worldCtaHudPill} ${styles.worldCtaHudBottom}`}>
                  <span>GLSL SHADERS</span>
                </div>

                {/* Radar sweep beam */}
                <div className={styles.worldCtaRadarBeam} />

                {/* Rotating Gyro Rings with Cardinal Coordinates */}
                <div className={styles.worldCtaRingOuter}>
                  <span className={styles.ringDegreeTop}>000°</span>
                  <span className={styles.ringDegreeRight}>090°</span>
                  <span className={styles.ringDegreeBottom}>180°</span>
                  <span className={styles.ringDegreeLeft}>270°</span>
                </div>
                <div className={styles.worldCtaRingMiddle} />
                <div className={styles.worldCtaRingInner} />

                {/* Orbiting Tech Nodes */}
                <div className={styles.worldCtaOrbitNodeA} />
                <div className={styles.worldCtaOrbitNodeB} />

                {/* Singularity Event Horizon Core */}
                <div className={styles.worldCtaCoreGlow} />
                <div className={styles.worldCtaSingularity} />

                {/* 3D Wireframe Floating Island Graphic */}
                <svg
                  className={styles.worldCtaWireframeIsland}
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon
                    points="100,58 156,86 142,138 100,168 58,138 44,86"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                    className={styles.wireframeBase}
                  />
                  <polygon
                    points="100,78 140,98 128,136 100,152 72,136 60,98"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    className={styles.wireframeInner}
                  />
                  <line x1="100" y1="78" x2="100" y2="152" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="140" y1="98" x2="100" y2="152" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="60" y1="98" x2="100" y2="152" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="100" y1="58" x2="100" y2="78" stroke="currentColor" strokeWidth="1.5" />
                  {/* Central Floating Obelisk Spire */}
                  <polygon
                    points="100,28 108,66 100,72 92,66"
                    fill="currentColor"
                    fillOpacity="0.4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={styles.wireframeObelisk}
                  />
                  <line x1="100" y1="28" x2="100" y2="72" stroke="currentColor" strokeWidth="1.2" />
                </svg>

                <Compass className={styles.worldCtaCompassBg} size={110} />
              </div>
            </div>
          </section>

          {/* ── 08. Contacts & Collaboration ── */}
          <section id="contacts" className={styles.section} data-reveal>
            <div
              className={`${styles.contactBanner} ${styles.surface}`}
              onPointerMove={updateCardTilt}
              onPointerLeave={resetCardTilt}
            >
              {/* Dynamic interactive glare sheen */}
              <div className={styles.contactGlare} aria-hidden="true" />

              <div className={styles.contactBannerHeader}>
                <div className={styles.sectionEyebrow}>
                  <span aria-hidden="true">08</span>
                  <span>{isUk ? 'Наступний крок' : 'The next chapter'}</span>
                </div>
                <div className={styles.contactLiveTelemetry}>
                  <span className={styles.telemetryPulse} />
                  <span className={styles.telemetryText}>
                    {isUk
                      ? 'ВІДКРИТИЙ ДО ПРОПОЗИЦІЙ • KYIV (UTC+2) • ВІДПОВІДЬ < 24 ГОД'
                      : 'AVAILABLE FOR HIRE • KYIV (UTC+2) • FAST RESPONSE < 24H'}
                  </span>
                </div>
              </div>

              <h2>{t.ctaHeadline}</h2>
              <p>{t.ctaText}</p>

              <div className={styles.contactActions}>
                <a
                  className={styles.primaryButton}
                  href={`mailto:${profile.contacts.email}`}
                  onPointerEnter={() => getGlobalCyberAudio().play('hover')}
                >
                  <Mail size={18} aria-hidden="true" />
                  <span>{profile.contacts.email}</span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleCopyEmail}
                  onPointerEnter={() => getGlobalCyberAudio().play('hover')}
                >
                  {copiedEmail ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {copiedEmail ? t.copied : t.copyEmail}
                </button>
              </div>
            </div>

            {/* 3 Interactive Cyber Contact Pods */}
            <div className={styles.contactGrid}>
              <a
                href={`mailto:${profile.contacts.email}`}
                className={`${styles.contactPod} ${styles.contactPodEmail}`}
                onPointerMove={updateSpotlight}
                onPointerEnter={() => getGlobalCyberAudio().play('hover')}
              >
                <div className={styles.contactPodLaser} />
                <div className={styles.contactPodIconWrap}>
                  <Mail size={22} aria-hidden="true" />
                </div>
                <div className={styles.contactPodBody}>
                  <div className={styles.contactPodCategory}>
                    <span>{isUk ? 'Прямий контакт' : 'Direct Channel'}</span>
                    <span className={styles.contactPodBadge}>{isUk ? '< 24 год' : '< 24h'}</span>
                  </div>
                  <strong>{profile.contacts.email}</strong>
                  <span className={styles.contactPodHint}>
                    {isUk ? 'Надіслати листа в один клік' : 'Send an email directly'}
                  </span>
                </div>
                <span className={styles.contactPodArrow} aria-hidden="true">
                  <ArrowUpRight size={20} />
                </span>
              </a>

              <a
                href={profile.contacts.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.contactPod} ${styles.contactPodTelegram}`}
                onPointerMove={updateSpotlight}
                onPointerEnter={() => getGlobalCyberAudio().play('hover')}
              >
                <div className={styles.contactPodLaser} />
                <div className={styles.contactPodIconWrap}>
                  <Send size={22} aria-hidden="true" />
                </div>
                <div className={styles.contactPodBody}>
                  <div className={styles.contactPodCategory}>
                    <span>{isUk ? 'Швидкий зв\'язок' : 'Fastest Dialogue'}</span>
                    <span className={`${styles.contactPodBadge} ${styles.contactPodBadgeActive}`}>
                      {isUk ? 'Онлайн' : 'Online'}
                    </span>
                  </div>
                  <strong>{profile.contacts.telegramHandle || '@mokydjin'}</strong>
                  <span className={styles.contactPodHint}>
                    {isUk ? 'Миттєвий діалог у Telegram' : 'Instant chat on Telegram'}
                  </span>
                </div>
                <span className={styles.contactPodArrow} aria-hidden="true">
                  <ArrowUpRight size={20} />
                </span>
              </a>

              <a
                href={profile.contacts.github}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.contactPod} ${styles.contactPodGithub}`}
                onPointerMove={updateSpotlight}
                onPointerEnter={() => getGlobalCyberAudio().play('hover')}
              >
                <div className={styles.contactPodLaser} />
                <div className={styles.contactPodIconWrap}>
                  <GithubIcon size={22} />
                </div>
                <div className={styles.contactPodBody}>
                  <div className={styles.contactPodCategory}>
                    <span>{isUk ? 'Репозиторії та OSS' : 'Code & Architecture'}</span>
                    <span className={styles.contactPodBadge}>40+ Repos</span>
                  </div>
                  <strong>github.com/DmytroHnylytskyi</strong>
                  <span className={styles.contactPodHint}>
                    {isUk ? 'Дослідити код та архітектуру' : 'Explore production code'}
                  </span>
                </div>
                <span className={styles.contactPodArrow} aria-hidden="true">
                  <ArrowUpRight size={20} />
                </span>
              </a>
            </div>
          </section>

          <footer className={styles.footer}>
            <a href="#hero" className={styles.footerBrand}>DH<span>.</span></a>
            <p>&copy; {new Date().getFullYear()} {profile.name}. {t.rightsReserved}</p>
            <button type="button" onClick={handleNavigate3D}>
              <Compass size={16} aria-hidden="true" />
              {isUk ? 'Зустрінемось у 3D' : 'See you in 3D'}
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </footer>
        </main>

        {showBackToTop && (
          <button
            type="button"
            className={styles.backToTop}
            onClick={() => wrapperRef.current?.scrollTo({
              top: 0,
              behavior: prefersReducedMotion() ? 'auto' : 'smooth'
            })}
            title={t.backToTop}
            aria-label={t.backToTop}
          >
            <ArrowUp size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      <ResumePrintDocument language={language} />
    </div>
  );
}
