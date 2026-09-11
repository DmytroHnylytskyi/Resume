'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { developerProfiles } from '../../data/resumeData';

/**
 * TypedBio — terminal-style first-paint of the hero bio.
 *
 * The lead paragraph types itself out character by character with a
 * blinking block cursor, then hands the full static text back to the DOM
 * (screen readers get the complete bio instantly via aria-label; the
 * typing layer is purely decorative). Skipped entirely under
 * prefers-reduced-motion or after the visitor has already seen it once
 * this session — the bio should never hold up a returning reader.
 */

const TYPING_PACE_MS = 14;
const CURSOR_BLINK_MS = 530;
const STORAGE_KEY = 'aetheria_bio_typed';

export default function TypedBio(): React.ReactElement {
  const language = useGameStore((s) => s.language);
  const profile = developerProfiles[language];
  const fullText = profile.bio;

  const [visibleChars, setVisibleChars] = useState<number | null>(null);
  const [typingDone, setTypingDone] = useState(false);
  const [cursorOn, setCursorOn] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shouldType = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return false;
      return true;
    } catch (_) {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!shouldType) return undefined;

    setVisibleChars(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      setVisibleChars(i);
      if (i >= fullText.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTypingDone(true);
        try {
          sessionStorage.setItem(STORAGE_KEY, '1');
        } catch (_) {}
      }
    }, TYPING_PACE_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shouldType, fullText]);

  // Cursor blink: steady while typing, blink after the last character
  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), CURSOR_BLINK_MS);
    return () => clearInterval(id);
  }, []);

  if (!shouldType || visibleChars === null) {
    // Static path (reduced-motion / repeat visit / SSR)
    return <p className="hero-bio-lead">{fullText}</p>;
  }

  return (
    <p className="hero-bio-lead typed" aria-label={fullText}>
      <span aria-hidden="true">{fullText.slice(0, visibleChars)}</span>
      <span
        className={`typed-cursor${typingDone ? ' done' : ''}${cursorOn ? ' on' : ''}`}
        aria-hidden="true"
      />
    </p>
  );
}
