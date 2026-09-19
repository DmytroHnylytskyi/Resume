import { dayNightState, subscribeToDayNight } from '../store/dayNightState';
import { useGameStore } from '../store/useGameStore';
import { createCyberAudio } from './cyberAudio';
import styles from '../components/ui/CyberArtifact.module.css';

type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};

export const CYBER_GYRO_EVENT = 'cyber-artifact:gyro';

export interface CyberGyroDetail {
  active: boolean;
  beta: number;
  gamma: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  channel: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const icon = (body: string) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${styles.dockIcon}">${body}</svg>`;
const speaker = '<path d="m11 5-5 4H2v6h4l5 4Z"/>';
const audioOn = icon(`${speaker}<path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>`);
const audioOff = icon(`${speaker}<path d="m16 9 6 6m0-6-6 6"/>`);
const gyroIcon = icon('<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>');

export function mountCyberArtifact(root: HTMLElement): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const audio = createCyberAudio();
  const particles: Particle[] = [];
  let disposed = false;
  let frame = 0;
  let lastFrame = 0;
  let width = 1;
  let height = 1;
  let pointerX = 0;
  let pointerY = 0;
  let pointerPresent = false;
  let lensX = 0;
  let lensY = 0;
  let lensStrength = 0;
  let velocity = 0;
  let acceleration = 0;
  let previousScroll = root.scrollTop;
  let emission = 0;
  let phase = 0;
  let dirty = true;
  let soundEnabled = false;
  let gyroAttached = false;
  let gyroPending = false;
  let gyroState: 'off' | 'waiting' | 'active' | 'unavailable' = 'off';
  let gyroTimer: ReturnType<typeof setTimeout> | undefined;
  let beta = 0;
  let gamma = 0;
  let gyroX = 0;
  let gyroY = 0;
  let baseline: { beta: number; gamma: number; angle: number } | null = null;
  let language = useGameStore.getState().language;

  root.classList.add(styles.host);
  const overlay = document.createElement('div');
  overlay.className = styles.overlay;
  overlay.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = styles.field;
  const context = canvas.getContext('2d');
  overlay.append(canvas);

  const dock = document.createElement('div');
  dock.className = styles.dock;
  dock.setAttribute('role', 'group');
  const soundBtn = document.createElement('button');
  const gyroBtn = document.createElement('button');
  soundBtn.type = gyroBtn.type = 'button';
  soundBtn.className = gyroBtn.className = styles.dockButton;
  dock.append(soundBtn, gyroBtn);
  root.append(overlay, dock);

  const publishGyro = (active: boolean) => {
    root.dispatchEvent(new CustomEvent<CyberGyroDetail>(CYBER_GYRO_EVENT, {
      detail: { active, beta, gamma }
    }));
  };

  const labels = () => {
    const uk = language === 'uk';
    dock.setAttribute('aria-label', uk ? 'Керування ефектами' : 'Interactive controls');
    soundBtn.setAttribute('aria-pressed', String(soundEnabled));
    soundBtn.setAttribute('aria-label', soundEnabled
      ? (uk ? 'Вимкнути звук' : 'Mute sound')
      : (uk ? 'Увімкнути звук' : 'Enable sound'));
    soundBtn.innerHTML = `${soundEnabled ? audioOn : audioOff}<span class="${styles.dockLabel}">${uk ? 'Звук' : 'Audio'}</span><span class="${styles.dockDot}" aria-hidden="true"></span>`;
    gyroBtn.setAttribute('aria-pressed', String(gyroAttached));
    gyroBtn.setAttribute('data-state', gyroState);
    gyroBtn.setAttribute('aria-busy', String(gyroPending || gyroState === 'waiting'));
    gyroBtn.setAttribute('aria-label', gyroAttached
      ? (uk ? 'Вимкнути гіроскоп' : 'Disable gyroscope')
      : (uk ? 'Дозволити гіроскоп' : 'Enable gyroscope'));
    gyroBtn.title = gyroState === 'unavailable'
      ? (uk ? 'Датчик недоступний або доступ заборонено' : 'Sensor unavailable or permission denied')
      : reduced.matches ? (uk ? 'Рух вимкнено налаштуваннями системи' : 'Motion disabled by system preference') : '';
    const text = gyroState === 'unavailable' ? (uk ? 'Н/Д' : 'N/A') : (uk ? 'Гіро' : 'Gyro');
    gyroBtn.innerHTML = `${gyroIcon}<span class="${styles.dockLabel}">${text}</span><span class="${styles.dockDot}" aria-hidden="true"></span>`;
  };

  const targets = () => {
    if (pointerPresent && fine.matches) return [pointerX, pointerY, 1];
    if (gyroState === 'active') {
      return [width * (0.5 + gyroX * 0.34), height * (0.5 + gyroY * 0.34), 1];
    }
    return [width / 2, height / 2, 0];
  };

  const resize = () => {
    const bounds = overlay.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const dpr = Math.min(window.devicePixelRatio || 1, fine.matches ? 1.4 : 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles.length = 0;
    lensX = width / 2;
    lensY = height / 2;
    dirty = true;
  };

  const draw = (dt: number) => {
    if (!context) return;
    const ctx = context;
    ctx.clearRect(0, 0, width, height);
    const [targetX, targetY, targetStrength] = targets();
    const alpha = 1 - Math.exp(-10 * dt);
    lensX += (targetX - lensX) * alpha;
    lensY += (targetY - lensY) * alpha;
    lensStrength += (targetStrength - lensStrength) * alpha;

    const { sky, sunElev } = dayNightState;
    const night = clamp((0.12 - sunElev) / 0.5, 0, 1);
    const mix = (a: readonly number[], b: readonly number[], weight: number) =>
      a.map((value, index) => Math.round(clamp(value * (1 - weight) + b[index] * weight, 0, 255))).join(',');
    const colors = [
      mix(sky.sunTint, sky.horizon, night * 0.65),
      mix(sky.horizon, sky.sunTint, 0.3),
      mix(sky.zenith, sky.sunTint, 0.65)
    ];
    const speed = Math.abs(velocity);
    const energy = clamp(speed / 2400, 0, 1);
    phase += dt * (0.12 + energy * 0.8);
    const radius = Math.min(300, width * 0.4);
    const spacing = fine.matches ? Math.max(78, Math.ceil(width / 24)) : 110;
    const step = fine.matches ? 30 : 48;

    const point = (x: number, y: number): [number, number] => {
      const dx = lensX - x;
      const dy = lensY - y;
      const distance2 = dx * dx + dy * dy;
      const force = Math.exp(-distance2 / (radius * radius)) * lensStrength * 0.38;
      return [x + dx * force, y + dy * force];
    };

    ctx.lineWidth = 0.65;
    ctx.strokeStyle = `rgba(${colors[0]},${0.12 + night * 0.05})`;
    ctx.beginPath();
    for (let x = 0; x <= width + spacing; x += spacing) {
      for (let y = 0; y <= height + step; y += step) {
        const p = point(x, y);
        if (y === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
    }
    for (let y = 0; y <= height + spacing; y += spacing) {
      for (let x = 0; x <= width + step; x += step) {
        const p = point(x, y);
        if (x === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
    }
    ctx.stroke();

    // Short scanner arcs, never a full-screen flashing overlay.
    for (let channel = 0; channel < 3; channel += 1) {
      const opacity = lensStrength * 0.12 + acceleration * 0.12;
      ctx.strokeStyle = `rgba(${colors[channel]},${opacity.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(
        lensX, lensY, 60 + channel * 25 + energy * 35,
        30 + channel * 18, phase + channel,
        phase * 0.5, phase * 0.5 + Math.PI * 1.3
      );
      ctx.stroke();
    }

    const limit = fine.matches ? 64 : 30;
    if (speed > 80) emission += dt * (10 + energy * 65);
    else emission = 0;
    const count = Math.max(0, Math.min(Math.floor(emission), limit - particles.length));
    emission = Math.min(1, emission - count);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 45 + Math.random() * Math.min(width, height) * 0.65;
      particles.push({
        x: lensX + Math.cos(angle) * distance,
        y: lensY + Math.sin(angle) * distance,
        vx: Math.cos(angle) * (50 + energy * 160),
        vy: -Math.sign(velocity) * (90 + energy * 350),
        age: 0,
        life: 0.5 + Math.random() * 0.6,
        channel: i % 3
      });
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      const dx = lensX - p.x;
      const dy = lensY - p.y;
      const attraction = 35 * lensStrength / Math.max(40, Math.hypot(dx, dy));
      p.vx = (p.vx + dx * attraction * dt) * Math.exp(-1.3 * dt);
      p.vy = (p.vy + dy * attraction * dt) * Math.exp(-0.8 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const fade = Math.sin(Math.PI * p.age / p.life) * 0.65;
      ctx.strokeStyle = `rgba(${colors[p.channel]},${fade.toFixed(3)})`;
      ctx.lineWidth = p.channel === 0 ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.07, p.y - p.vy * 0.07);
      ctx.stroke();
    }
  };

  const tick = (now: number) => {
    frame = 0;
    if (disposed || document.hidden || reduced.matches) return;
    const dt = lastFrame ? clamp((now - lastFrame) / 1000, 0.001, 0.05) : 1 / 60;
    lastFrame = now;
    const scroll = root.scrollTop;
    const delta = scroll - previousScroll;
    previousScroll = scroll;
    const measured = clamp(delta / dt, -6500, 6500);
    const oldVelocity = velocity;
    velocity += (measured - velocity) * (1 - Math.exp(-8 * dt));
    if (Math.abs(velocity) < 1) velocity = 0;
    acceleration = Math.max(
      acceleration * Math.exp(-6 * dt),
      clamp(Math.abs(velocity - oldVelocity) / 1800, 0, 1)
    );
    if (delta !== 0) audio.play('scroll', clamp(Math.abs(measured) / 4500, 0, 1));

    draw(dt);
    dirty = false;
    const [x, y, strength] = targets();
    const settling = Math.abs(x - lensX) > 0.15 || Math.abs(y - lensY) > 0.15
      || Math.abs(strength - lensStrength) > 0.002;
    if (velocity !== 0 || particles.length > 0 || acceleration > 0.002 || settling) {
      frame = requestAnimationFrame(tick);
    } else lastFrame = 0;
  };

  const schedule = () => {
    if (!frame && !disposed && !document.hidden && !reduced.matches && context) {
      frame = requestAnimationFrame(tick);
    }
  };

  const onScroll = () => {
    if (reduced.matches) {
      previousScroll = root.scrollTop;
      return;
    }
    schedule();
  };

  const onPointer = (event: PointerEvent) => {
    if (reduced.matches || event.pointerType !== 'mouse') return;
    const bounds = overlay.getBoundingClientRect();
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
    pointerPresent = true;
    schedule();
  };

  const onLeave = () => {
    pointerPresent = false;
    schedule();
  };

  const onResize = () => {
    resize();
    schedule();
  };

  const onPreference = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    velocity = acceleration = emission = 0;
    particles.length = 0;
    previousScroll = root.scrollTop;
    baseline = null;
    publishGyro(false);
    context?.clearRect(0, 0, width, height);
    overlay.hidden = reduced.matches;
    labels();
    dirty = true;
    schedule();
  };

  const onSound = async () => {
    soundBtn.disabled = true;
    const enabled = await audio.setEnabled(!soundEnabled);
    if (disposed) return;
    soundEnabled = enabled;
    soundBtn.disabled = false;
    labels();
  };

  const detachGyro = () => {
    window.removeEventListener('deviceorientation', onOrientation);
    clearTimeout(gyroTimer);
    gyroAttached = false;
    baseline = null;
    publishGyro(false);
  };

  const onOrientation = (event: DeviceOrientationEvent) => {
    if (disposed || document.hidden || !gyroAttached || event.beta === null
      || event.gamma === null || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    beta = event.beta;
    gamma = event.gamma;
    const angle = window.screen.orientation?.angle ?? 0;
    if (!baseline || baseline.angle !== angle) baseline = { beta, gamma, angle };
    const db = ((beta - baseline.beta + 540) % 360) - 180;
    const dg = gamma - baseline.gamma;
    const radians = angle * Math.PI / 180;
    gyroX = clamp((dg * Math.cos(radians) + db * Math.sin(radians)) / 28, -1, 1);
    gyroY = clamp((db * Math.cos(radians) - dg * Math.sin(radians)) / 28, -1, 1);
    if (gyroState !== 'active') {
      gyroState = 'active';
      clearTimeout(gyroTimer);
      labels();
    }
    publishGyro(!reduced.matches);
    schedule();
  };

  const onGyro = async () => {
    if (gyroPending) return;
    if (gyroAttached) {
      detachGyro();
      gyroState = 'off';
      labels();
      schedule();
      return;
    }
    const constructor = window.DeviceOrientationEvent as OrientationConstructor | undefined;
    if (!window.isSecureContext || !constructor) {
      gyroState = 'unavailable';
      labels();
      return;
    }
    gyroPending = true;
    gyroBtn.disabled = true;
    labels();
    try {
      if (constructor.requestPermission && await constructor.requestPermission() !== 'granted') {
        throw new Error('Permission denied');
      }
      if (disposed) return;
      gyroAttached = true;
      gyroState = 'waiting';
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
      gyroTimer = setTimeout(() => {
        if (gyroState !== 'waiting' || disposed) return;
        detachGyro();
        gyroState = 'unavailable';
        labels();
      }, 5000);
    } catch {
      if (!disposed) gyroState = 'unavailable';
    } finally {
      gyroPending = false;
      if (!disposed) {
        gyroBtn.disabled = false;
        labels();
      }
    }
  };

  const onHover = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;
    const target = event.target.closest(
      '[data-project-media], [data-quantum-card], [data-contact-link], button, a'
    );
    if (!target || dock.contains(target)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    audio.play('hover');
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest('button, a') : null;
    if (target && !dock.contains(target)) audio.play('click');
  };

  const onInput = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'range'
      || !target.closest('.header-slider-wrap')) return;
    const min = Number(target.min || 0);
    const max = Number(target.max || 100);
    const value = (target.valueAsNumber - min) / Math.max(0.001, max - min);
    if (Number.isFinite(value)) audio.play('sky', value);
  };

  const onVisibility = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    velocity = acceleration = emission = 0;
    particles.length = 0;
    pointerPresent = false;
    baseline = null;
    previousScroll = root.scrollTop;
    publishGyro(false);
    if (document.hidden) audio.suspend();
    else {
      audio.resume();
      dirty = true;
      schedule();
    }
  };

  const unsubscribeSky = subscribeToDayNight(() => {
    dirty = true;
    schedule();
  });
  const unsubscribeStore = useGameStore.subscribe((state) => {
    if (state.language === language) return;
    language = state.language;
    labels();
  });

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(onResize) : null;
  resizeObserver?.observe(overlay);
  soundBtn.addEventListener('click', onSound);
  gyroBtn.addEventListener('click', onGyro);
  root.addEventListener('scroll', onScroll, { passive: true });
  root.addEventListener('pointermove', onPointer, { passive: true });
  root.addEventListener('pointerleave', onLeave);
  root.addEventListener('pointercancel', onLeave);
  root.addEventListener('pointerover', onHover, { passive: true });
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);
  reduced.addEventListener('change', onPreference);
  fine.addEventListener('change', onPreference);
  labels();
  resize();
  overlay.hidden = reduced.matches;
  if (dirty) schedule();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    detachGyro();
    resizeObserver?.disconnect();
    unsubscribeSky();
    unsubscribeStore();
    audio.dispose();
    particles.length = 0;
    soundBtn.removeEventListener('click', onSound);
    gyroBtn.removeEventListener('click', onGyro);
    root.removeEventListener('scroll', onScroll);
    root.removeEventListener('pointermove', onPointer);
    root.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('pointercancel', onLeave);
    root.removeEventListener('pointerover', onHover);
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', onResize);
    reduced.removeEventListener('change', onPreference);
    fine.removeEventListener('change', onPreference);
    root.classList.remove(styles.host);
    overlay.remove();
    dock.remove();
  };
}
