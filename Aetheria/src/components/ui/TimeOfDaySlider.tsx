'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import {
  dayNightState,
  setTimeOfDay,
  flyToDayNight,
  subscribeToDayNight,
  SLIDER_TRACK_CSS,
  getTimeOfDayLabel
} from '../../store/dayNightState';

/**
 * TimeOfDaySlider
 *
 * Theme control disguised as a day/night cycle scrubber:
 * - The gradient TRACK previews the sky of every position (same LUT as the
 *   WebGL dome), with tick marks at dawn / noon / sunset.
 * - The MOON and SUN icons on the sides are buttons: click = cinematic
 *   forward flight to midnight / noon; drag the thumb for any position.
 * - The thumb glows with the current sky color (live `--tod-glow`), and the
 *   period label carries a same-colored dot — the control narrates what the
 *   UI will look like before you release it.
 * - Native <input type="range"> keeps touch, keyboard and aria for free.
 */
export default function TimeOfDaySlider(): React.ReactElement {
  const language = useGameStore((s) => s.language);
  // Render-neutral initial state (0.5/Noon matches SSR; see dayNightState
  // bootstrap note) — the mount effect adopts the restored position at once.
  const [value, setValue] = useState(0.5);
  const [label, setLabel] = useState('Noon');
  const [glow, setGlow] = useState('#cfe8fa');
  const [litPole, setLitPole] = useState<'moon' | 'sun' | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const isUk = language === 'uk';

  useEffect(() => {
    const sync = () => {
      const { t, sky } = dayNightState;
      setValue(t);
      setLabel(getTimeOfDayLabel(t, language));
      // Sun tint by day, horizon tone by night — the thumb announces the sky.
      const nf = Math.max(0, Math.min(1, (0.05 - dayNightState.sunElev) / 0.35));
      const c = nf > 0.5 ? sky.horizon : sky.sunTint;
      setGlow(`rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`);
      // Which pole are we resting at? (affordance: this control IS the theme)
      const sunElev = dayNightState.sunElev;
      setLitPole(sunElev > 0.06 ? 'sun' : sunElev < -0.04 ? 'moon' : null);
    };
    sync();
    return subscribeToDayNight(sync);
  }, [language]);

  // One-time static paints: track gradient never changes (it previews the cycle).
  useEffect(() => {
    if (trackRef.current) trackRef.current.style.setProperty('--sky-track', SLIDER_TRACK_CSS);
  }, []);

  const handleChange = (v: number) => {
    setValue(v);
    setLabel(getTimeOfDayLabel(v, language));
    setTimeOfDay(v);
  };

  const moonTip = isUk ? 'Ніч' : 'Night';
  const sunTip = isUk ? 'День' : 'Day';
  const sliderTip = isUk ? 'Час доби — потягніть, щоб змінити тему' : 'Time of day — drag to change the theme';

  return (
    <div
      ref={rootRef}
      className="time-of-day-slider"
      role="group"
      aria-label={isUk ? 'Час доби' : 'Time of day'}
      title={sliderTip}
      style={{ '--tod-glow': glow } as React.CSSProperties}
    >
      <button
        type="button"
        className={`tod-slider-cap tod-cap-moon${litPole === 'moon' ? ' lit' : ''}`}
        onClick={() => flyToDayNight(1)}
        title={moonTip}
        aria-label={isUk ? 'Перейти до ночі' : 'Fly to night'}
        aria-pressed={litPole === 'moon'}
      >
        <Moon size={12} />
      </button>

      <div className="tod-slider-track-wrapper" ref={trackRef}>
        {/* Period tick marks: dawn · noon · sunset (reading aid, not stops) */}
        <span className="tod-tick" style={{ left: '25%' }} aria-hidden="true" />
        <span className="tod-tick" style={{ left: '50%' }} aria-hidden="true" />
        <span className="tod-tick" style={{ left: '75%' }} aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={0.999}
          step={0.001}
          value={value}
          onChange={(e) => handleChange(Number.parseFloat(e.target.value))}
          aria-label={isUk ? 'Час доби' : 'Time of day'}
        />
      </div>

      <button
        type="button"
        className={`tod-slider-cap tod-cap-sun${litPole === 'sun' ? ' lit' : ''}`}
        onClick={() => flyToDayNight(0.5)}
        title={sunTip}
        aria-label={isUk ? 'Перейти до дня' : 'Fly to day'}
        aria-pressed={litPole === 'sun'}
      >
        <Sun size={12} />
      </button>

      <span className="tod-slider-label" aria-hidden="true">
        <span className="tod-label-dot" />
        {label}
      </span>
    </div>
  );
}
