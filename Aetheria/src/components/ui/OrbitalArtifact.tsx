'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, ArrowUpRight } from 'lucide-react';
import styles from './OrbitalArtifact.module.css';

interface OrbitalArtifactProps {
  isUk: boolean;
  onNavigate3D?: () => void;
}

const ORBITS = Array.from({ length: 9 }, (_, index) => index);
const FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'];

export default function OrbitalArtifact({
  isUk,
  onNavigate3D
}: OrbitalArtifactProps): React.ReactElement {
  const hostRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    if (!host || !stage) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let visible = true;
    let frame = 0;
    let x = 0;
    let y = 0;

    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      stage.style.removeProperty('--look-x');
      stage.style.removeProperty('--look-y');
    };

    const sync = () => {
      setReduced(preference.matches);
      host.dataset.running = String(
        visible && !document.hidden && !preference.matches && !paused
      );

      if (
        paused ||
        preference.matches ||
        document.hidden ||
        !visible ||
        !finePointer.matches
      ) {
        reset();
      }
    };

    const paint = () => {
      frame = 0;

      if (
        paused ||
        preference.matches ||
        document.hidden ||
        !visible ||
        !finePointer.matches
      ) return;

      stage.style.setProperty('--look-x', `${(-y * 14).toFixed(2)}deg`);
      stage.style.setProperty('--look-y', `${(x * 18).toFixed(2)}deg`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (
        event.pointerType !== 'mouse' ||
        paused ||
        preference.matches ||
        !finePointer.matches ||
        document.hidden ||
        !visible
      ) return;

      const bounds = host.getBoundingClientRect();

      x = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1)
      );
      y = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 - 1)
      );

      if (!frame) frame = requestAnimationFrame(paint);
    };

    const scrollRoot = host.closest<HTMLElement>('.classic-landing-wrapper');

    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          sync();
        }, {
          root: scrollRoot,
          threshold: 0
        })
      : null;

    observer?.observe(host);
    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerleave', reset);
    host.addEventListener('pointercancel', reset);
    scrollRoot?.addEventListener('scroll', reset, { passive: true });
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', sync);
    finePointer.addEventListener('change', sync);

    sync();

    return () => {
      reset();
      observer?.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', reset);
      host.removeEventListener('pointercancel', reset);
      scrollRoot?.removeEventListener('scroll', reset);
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', sync);
      finePointer.removeEventListener('change', sync);
      host.dataset.running = 'false';
    };
  }, [paused]);

  return (
    <aside
      className={styles.host}
      ref={hostRef}
      data-running="false"
      aria-label={isUk ? 'Кінетична лабораторія' : 'Kinetic laboratory'}
    >
      <div className={styles.topline}>
        <span className={styles.serial}>OBJECT / 001</span>
        <span className={styles.material}>
          {isUk ? 'Кінетична геометрія' : 'Kinetic geometry'}
        </span>
      </div>

      <div className={styles.viewport} aria-hidden="true">
        <div className={styles.grid} />
        <div className={styles.halo} />
        <div className={styles.reticle} />

        <span className={`${styles.coordinate} ${styles.north}`}>Y +</span>
        <span className={`${styles.coordinate} ${styles.east}`}>X +</span>
        <span className={`${styles.coordinate} ${styles.south}`}>Z / 009</span>

        <div className={styles.stage} ref={stageRef}>
          <div className={styles.precession}>
            {ORBITS.map((index) => (
              <div
                key={index}
                className={styles.orbitPlane}
                style={{
                  '--inclination': `${36 + index * 13}deg`,
                  '--azimuth': `${index * 40}deg`,
                  '--duration': `${18 + index * 2.75}s`,
                  '--delay': `${-index * 3.1}s`
                } as React.CSSProperties}
              >
                <div className={styles.orbit}>
                  <span className={styles.satellite} />
                </div>
              </div>
            ))}

            <div className={styles.corePosition}>
              <div className={styles.core}>
                {FACES.map((face) => (
                  <div
                    key={face}
                    className={styles.face}
                    data-face={face}
                  >
                    <span>DH</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.shadow} />
      </div>

      <div className={styles.footer}>
        <div className={styles.caption}>
          <strong>ORBITAL ATELIER</strong>
          <span>
            {reduced
              ? (isUk ? 'Статична композиція' : 'Static composition')
              : (isUk ? 'Код у трьох вимірах' : 'Code in three dimensions')}
          </span>
        </div>

        <button
          type="button"
          className={styles.motionButton}
          onClick={() => setPaused((value) => !value)}
          disabled={reduced}
          aria-pressed={paused || reduced}
          aria-label={isUk ? 'Призупинити анімацію об’єкта' : 'Pause object animation'}
          title={reduced
            ? (isUk ? 'Рух вимкнено системними налаштуваннями' : 'Motion disabled by system preference')
            : paused
              ? (isUk ? 'Продовжити анімацію' : 'Resume animation')
              : (isUk ? 'Призупинити анімацію' : 'Pause animation')}
        >
          {paused || reduced
            ? <Play size={15} aria-hidden="true" />
            : <Pause size={15} aria-hidden="true" />}
        </button>
      </div>

      <div className={styles.links}>
        <a href="#projects" className={styles.linkItem}>
          <span className={styles.linkNumber}>01</span>
          <span className={styles.linkLabel}>
            {isUk ? 'Від ідеї до продукту' : 'From idea to product'}
          </span>
          <ArrowUpRight size={17} aria-hidden="true" className={styles.linkArrow} />
        </a>

        <a href="#skills" className={styles.linkItem}>
          <span className={styles.linkNumber}>02</span>
          <span className={styles.linkLabel}>
            {isUk ? 'Архітектура та технології' : 'Architecture & technology'}
          </span>
          <ArrowUpRight size={17} aria-hidden="true" className={styles.linkArrow} />
        </a>

        <button
          type="button"
          className={styles.linkItem}
          onClick={onNavigate3D}
        >
          <span className={styles.linkNumber}>03</span>
          <span className={styles.linkLabel}>
            {isUk ? 'Дослідити 3D-світ' : 'Step into the 3D world'}
          </span>
          <ArrowUpRight size={17} aria-hidden="true" className={styles.linkArrow} />
        </button>
      </div>
    </aside>
  );
}
