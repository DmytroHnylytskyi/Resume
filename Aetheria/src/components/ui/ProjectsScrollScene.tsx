'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Sparkles } from 'lucide-react';
import type { ProjectItem } from '../../types/portfolio';
import { getProjectUrl } from '../../data/resumeData';
import { GithubIcon } from './icons';
import styles from './ProjectsScrollScene.module.css';

const MOTION_QUERY =
  '(min-width: 900px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

const PROJECT_SHOTS: Record<string, string> = {
  forma: '/shots/forma.jpg',
  terrascope: '/shots/terrascope.jpg',
  lumina: '/shots/lumina.jpg',
  aetheria: '/shots/aetheria.jpg'
};

const MOTION_PROPERTIES = [
  '--media-rx',
  '--media-ry',
  '--light-x',
  '--light-y'
];

interface ProjectsScrollSceneProps {
  projects: ProjectItem[];
  scrollRoot: { readonly current: HTMLDivElement | null };
  isUk: boolean;
  selectedSkill: string | null;
  liveDemoLabel: string;
  sourceCodeLabel: string;
  detailsLabel: string;
  onSelectProject: (id: string) => void;
  onSelectSkill: (skill: string) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ProjectImage({
  project,
  isUk
}: {
  project: ProjectItem;
  isUk: boolean;
}): React.ReactElement {
  const source = PROJECT_SHOTS[project.id] ?? `/shots/${project.id}.jpg`;
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (failedSource === source) {
    return (
      <div className={styles.imageFallback}>
        <span>{project.title}</span>
        <small>{isUk ? 'Ідея, втілена в коді' : 'An idea brought to life'}</small>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailedSource(source)}
    />
  );
}

export default function ProjectsScrollScene({
  projects,
  scrollRoot,
  isUk,
  selectedSkill,
  liveDemoLabel,
  sourceCodeLabel,
  detailsLabel,
  onSelectProject,
  onSelectSkill
}: ProjectsScrollSceneProps): React.ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);
  const projectKey = JSON.stringify(projects.map((project) => project.id));

  useEffect(() => {
    const root = scrollRoot.current;
    const scene = sceneRef.current;
    if (!root || !scene) return;

    const preference = window.matchMedia(MOTION_QUERY);
    const media = Array.from(
      scene.querySelectorAll<HTMLElement>('[data-project-media]')
    );
    const visible = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;
    let frame = 0;
    let disposed = false;
    let hovered: HTMLElement | null = null;
    let previousHovered: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const reset = (element: HTMLElement) => {
      MOTION_PROPERTIES.forEach((property) => {
        element.style.removeProperty(property);
      });
    };

    const paint = () => {
      frame = 0;
      if (disposed || document.hidden || !preference.matches) return;

      // All geometry reads precede style writes.
      const rootRect = root.getBoundingClientRect();
      const viewportTop = rootRect.top + root.clientTop;
      const viewportHeight = Math.max(1, root.clientHeight);
      const measurements = Array.from(visible, (element) => ({
        element,
        rect: element.getBoundingClientRect()
      }));

      if (previousHovered && previousHovered !== hovered) {
        previousHovered.style.removeProperty('--media-rx');
        previousHovered.style.removeProperty('--media-ry');
        previousHovered.style.removeProperty('--light-x');
        previousHovered.style.removeProperty('--light-y');
      }
      previousHovered = hovered;

      measurements.forEach(({ element, rect }) => {
        const relative = clamp(
          (rect.top + rect.height / 2 - viewportTop - viewportHeight / 2)
            / ((viewportHeight + rect.height) / 2),
          -1,
          1
        );

        if (element !== hovered) return;

        // The measured button never tilts; only its inner visual does.
        const x = clamp((pointerX - rect.left) / Math.max(1, rect.width), 0, 1);
        const y = clamp((pointerY - rect.top) / Math.max(1, rect.height), 0, 1);

        element.style.setProperty('--media-rx', `${((0.5 - y) * 8).toFixed(2)}deg`);
        element.style.setProperty('--media-ry', `${((x - 0.5) * 10).toFixed(2)}deg`);
        element.style.setProperty('--light-x', `${(x * 100).toFixed(2)}%`);
        element.style.setProperty('--light-y', `${(y * 100).toFixed(2)}%`);
      });
    };

    const schedule = () => {
      if (!disposed && preference.matches && !document.hidden && !frame) {
        frame = requestAnimationFrame(paint);
      }
    };

    const clearPointer = () => {
      hovered = null;
      schedule();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!preference.matches || event.pointerType !== 'mouse') return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-project-media]')
        : null;

      hovered = target && visible.has(target) ? target : null;
      pointerX = event.clientX;
      pointerY = event.clientY;
      schedule();
    };

    const onScroll = () => {
      hovered = null;
      schedule();
    };

    const configure = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      observer?.disconnect();
      observer = null;
      visible.clear();
      hovered = null;
      previousHovered = null;
      media.forEach(reset);

      if (!preference.matches) return;

      if (typeof IntersectionObserver !== 'undefined') {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const element = entry.target as HTMLElement;
            if (entry.isIntersecting) {
              visible.add(element);
            } else {
              visible.delete(element);
              if (hovered === element) hovered = null;
              reset(element);
            }
          });
          schedule();
        }, { root, rootMargin: '100px 0px', threshold: 0 });

        media.forEach((element) => observer?.observe(element));
      } else {
        media.forEach((element) => visible.add(element));
      }

      schedule();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        hovered = null;
        previousHovered = null;
        media.forEach(reset);
      } else {
        schedule();
      }
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(schedule)
      : null;

    resizeObserver?.observe(root);
    resizeObserver?.observe(scene);

    root.addEventListener('scroll', onScroll, { passive: true });
    scene.addEventListener('pointermove', onPointerMove, { passive: true });
    scene.addEventListener('pointerleave', clearPointer);
    scene.addEventListener('pointercancel', clearPointer);
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', onVisibility);
    preference.addEventListener('change', configure);
    configure();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resizeObserver?.disconnect();
      root.removeEventListener('scroll', onScroll);
      scene.removeEventListener('pointermove', onPointerMove);
      scene.removeEventListener('pointerleave', clearPointer);
      scene.removeEventListener('pointercancel', clearPointer);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', onVisibility);
      preference.removeEventListener('change', configure);
      media.forEach(reset);
    };
  }, [projectKey, scrollRoot]);

  if (projects.length === 0) return <></>;

  return (
    <div className={styles.scene} ref={sceneRef}>
      <div className={styles.sceneHeader}>
        <span className={styles.sceneLabel}>
          <span className={styles.liveDot} aria-hidden="true" />
          {isUk ? 'Цифрові експерименти / Реальні продукти' : 'Digital experiments / Real products'}
        </span>
        <span className={styles.sceneHint}>
          {isUk ? 'Кожен проєкт — нова перспектива' : 'Every project, a new perspective'}
          <ArrowDown size={14} aria-hidden="true" />
        </span>
      </div>

      <div className={styles.projects}>
        {projects.map((project, index) => (
          <article
            key={project.id}
            className={styles.project}
            style={{
              '--project-color': project.color || 'var(--tod-glow)'
            } as React.CSSProperties}
          >
            <div className={styles.visualColumn}>
              <div className={styles.projectCaption} aria-hidden="true">
                <span className={styles.projectNumber}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>SELECTED WORK / {String(projects.length).padStart(2, '0')}</span>
                <span className={styles.captionLine} />
              </div>

              <button
                type="button"
                className={styles.media}
                data-project-media
                onClick={() => onSelectProject(project.id)}
                aria-label={`${detailsLabel}: ${project.title}`}
              >
                <span className={styles.mediaVisual}>
                  <span className={styles.mediaChrome} aria-hidden="true">
                    <span className={styles.trafficLights}>
                      <span className={styles.dotClose} />
                      <span className={styles.dotMin} />
                      <span className={styles.dotMax} />
                    </span>
                    <span className={styles.chromeLabel}>
                      <span className={styles.chromeDot} />
                      {project.url ? project.url.replace(/^https?:\/\//, '') : `${project.id}.dev`}
                    </span>
                    <span className={styles.chromeAction}>preview</span>
                  </span>
                  <span className={styles.imageWindow}>
                    <span className={styles.imagePlane}>
                      <ProjectImage project={project} isUk={isUk} />
                    </span>
                  </span>
                  <span className={styles.mediaAction}>
                    {isUk ? 'Дослідити проєкт' : 'Explore project'}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </span>
                  <span className={styles.specular} aria-hidden="true" />
                </span>
              </button>

              <div
                className={styles.tags}
                role="group"
                aria-label={isUk
                  ? `Технології: ${project.title}`
                  : `Technologies: ${project.title}`}
              >
                {project.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selectedSkill?.toLocaleLowerCase() === tag.toLocaleLowerCase()}
                    title={isUk ? `Фільтрувати за ${tag}` : `Filter by ${tag}`}
                    onClick={() => onSelectSkill(tag)}
                  >
                    {tag}
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.body}>
              <p className={styles.tagline}>{project.tagline}</p>
              <h3>{project.title}</h3>
              <p className={styles.description}>{project.description}</p>

              <ul className={styles.features}>
                {project.features.slice(0, 3).map((feature, featureIndex) => (
                  <li key={featureIndex}>
                    <Check size={15} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className={styles.actions}>
                {project.url && (
                  <a
                    className={styles.primaryAction}
                    href={getProjectUrl(project.id, project.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {liveDemoLabel}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GithubIcon size={16} />
                    {sourceCodeLabel}
                  </a>
                )}
                <button type="button" onClick={() => onSelectProject(project.id)}>
                  <Sparkles size={16} aria-hidden="true" />
                  {detailsLabel}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
