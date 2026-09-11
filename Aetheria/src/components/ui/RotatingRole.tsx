'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles } from '../../data/resumeData';

/**
 * RotatingRole — specialty carousel under the hero role line.
 *
 * Fades between short specialty phrases ("3D World Builder", "Rapier
 * Physics", …) every ~3s. One rotating line only — never a list — and it
 * pauses entirely under prefers-reduced-motion, showing the first phrase.
 */

const ROTATE_MS = 3200;
const FADE_MS = 420;

export default function RotatingRole(): React.ReactElement {
  const language = useGameStore((s) => s.language);
  const isUk = language === 'uk';

  const phrases = isUk
    ? ['3D World Builder', 'WebGL Performance', 'Rapier Physics', 'Full-Stack Engineer', 'TypeScript Craftsman']
    : ['3D World Builder', 'WebGL Performance', 'Rapier Physics', 'Full-Stack Engineer', 'TypeScript Craftsman'];

  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {}
    if (reduced || phrases.length <= 1) return undefined;

    let cycle: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      cycle = setTimeout(() => {
        setFading(true);
        const fadeTimer = setTimeout(() => {
          setIndex((i) => (i + 1) % phrases.length);
          setFading(false);
          schedule();
        }, FADE_MS);
        timersRef.current.push(fadeTimer);
      }, ROTATE_MS);
      if (cycle) timersRef.current.push(cycle);
    };
    schedule();

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Keep the static profile role in sync for SEO/no-JS: rendered phrase
  // is decorative, aria-label carries the primary role from the profile.
  const primaryRole = developerProfiles[language].role;

  return (
    <span className="rotating-role" aria-label={primaryRole}>
      <span
        className={`rotating-role-text${fading ? ' fading' : ''}`}
        aria-hidden="true"
      >
        {phrases[index]}
      </span>
    </span>
  );
}
