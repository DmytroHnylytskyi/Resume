'use client';

import { useEffect } from 'react';
import classic from '../components/ui/ClassicLandingView.module.css';
import spatial from '../components/ui/SpatialResume.module.css';
import details from '../components/ui/CreativeDetails.module.css';
import quantum from '../components/ui/QuantumExperience.module.css';
import { mountCyberArtifact } from './cyberArtifact';

interface ScrollRoot {
  readonly current: HTMLDivElement | null;
}

interface Card {
  element: HTMLElement;
  orbit: boolean;
  index: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function useSpatialResume(scrollRoot: ScrollRoot): void {
  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const decorations = new Map<HTMLElement, Map<string, string | null>>();
    const cards = new Map<HTMLElement, Card>();
    const visible = new Set<Card>();
    const properties = [
      '--spatial-y', '--spatial-z', '--spatial-rx', '--spatial-ry',
      '--quantum-light-x', '--quantum-light-y', '--quantum-depth'
    ];

    let disposed = false;
    let frame = 0;
    let lastTime = 0;
    let hover: HTMLElement | null = null;
    let mouseX = 0;
    let mouseY = 0;
    let previousScroll = root.scrollTop;
    let velocity = 0;
    let atmosphereY = 0;
    let atmosphereTarget = 0;

    root.classList.add(spatial.host, details.host, quantum.host);

    const decorate = (element: HTMLElement, attribute: string) => {
      let attributes = decorations.get(element);
      if (!attributes) {
        attributes = new Map();
        decorations.set(element, attributes);
      }
      if (!attributes.has(attribute)) {
        attributes.set(attribute, element.getAttribute(attribute));
      }
      element.setAttribute(attribute, 'true');
    };

    const restore = (element: HTMLElement) => {
      decorations.get(element)?.forEach((value, attribute) => {
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      });
      decorations.delete(element);
    };

    const reset = (card: Card) => {
      card.y = card.z = card.rx = card.ry = 0;
      properties.forEach((property) => card.element.style.removeProperty(property));
      card.element.removeAttribute('data-spatial-moving');
    };

    const atmosphere = document.createElement('div');
    atmosphere.className = spatial.atmosphere;
    atmosphere.setAttribute('aria-hidden', 'true');
    const glow = document.createElement('div');
    glow.className = spatial.glow;
    const sky = document.createElement('div');
    sky.className = spatial.sky;
    atmosphere.append(glow, sky);
    root.append(atmosphere);

    const tick = (now: number) => {
      frame = 0;
      if (disposed || document.hidden || reduced.matches) return;

      const dt = lastTime ? clamp((now - lastTime) / 1000, 0.001, 0.05) : 1 / 60;
      lastTime = now;
      const alpha = 1 - Math.exp(-11 * dt);
      const scroll = root.scrollTop;
      const measuredVelocity = clamp((scroll - previousScroll) / dt, -4000, 4000);
      previousScroll = scroll;
      velocity += (measuredVelocity - velocity) * (1 - Math.exp(-8 * dt));
      if (Math.abs(velocity) < 1) velocity = 0;

      const rect = root.getBoundingClientRect();
      const height = Math.max(1, root.clientHeight);
      const compact = root.clientWidth < 900 || !fine.matches;
      const rootTop = rect.top + root.clientTop;

      // Read all geometry before writing any animated styles.
      const measurements = Array.from(visible, (card) => ({
        card,
        rect: card.element.getBoundingClientRect()
      }));

      let moving = velocity !== 0;

      measurements.forEach(({ card, rect: bounds }) => {
        const relative = clamp(
          (bounds.top + bounds.height / 2 - card.y - rootTop - height / 2)
            / ((height + bounds.height) / 2),
          -1,
          1
        );
        const pointed = fine.matches && hover === card.element;
        // Bounded screen-space input avoids offsetParent assumptions.
        const inputX = pointed
          ? clamp((mouseX - bounds.left) / Math.max(1, bounds.width) * 2 - 1, -1, 1)
          : 0;
        const inputY = pointed
          ? clamp((mouseY - bounds.top) / Math.max(1, bounds.height) * 2 - 1, -1, 1)
          : 0;
        const active = pointed;
        const direction = card.index % 2 ? 1 : -1;
        const drift = Math.min(10, Math.abs(velocity) * 0.004);
        const targetY = -relative * (compact ? 6 : 18);
        const targetZ = (active ? (compact ? 4 : 10) : 0)
          - Math.abs(relative) * (compact ? 3 : 8) - drift;
        const targetRx = clamp(relative * 2.5 - inputY * (compact ? 5 : 8), -10, 10);
        const targetRy = clamp(relative * direction * 1.8 + inputX * (compact ? 6 : 9), -10, 10);

        let changed = false;
        const approach = (value: number, target: number) => {
          if (Math.abs(target - value) < 0.025) return target;
          changed = true;
          return value + (target - value) * alpha;
        };

        card.y = approach(card.y, targetY);
        card.z = approach(card.z, targetZ);
        card.rx = approach(card.rx, targetRx);
        card.ry = approach(card.ry, targetRy);
        moving ||= changed;

        const element = card.element;
        element.toggleAttribute('data-spatial-moving', changed);
        element.style.setProperty('--spatial-y', `${card.y.toFixed(2)}px`);
        element.style.setProperty('--spatial-z', `${card.z.toFixed(2)}px`);
        element.style.setProperty('--spatial-rx', `${card.rx.toFixed(2)}deg`);
        element.style.setProperty('--spatial-ry', `${card.ry.toFixed(2)}deg`);
        element.style.setProperty('--quantum-light-x', `${(50 + card.ry * 2.4).toFixed(2)}%`);
        element.style.setProperty('--quantum-light-y', `${(50 - card.rx * 2.4).toFixed(2)}%`);
        element.style.setProperty('--quantum-depth', String(
          (active ? 1 : 0.65) + Math.min(0.16, Math.abs(velocity) / 15000)
        ));
      });

      atmosphereTarget = clamp(scroll / Math.max(1, root.scrollHeight - height), 0, 1);
      if (Math.abs(atmosphereTarget - atmosphereY) > 0.0005) {
        atmosphereY += (atmosphereTarget - atmosphereY) * alpha;
        moving = true;
      } else atmosphereY = atmosphereTarget;

      glow.style.transform = `translate3d(${Math.sin(atmosphereY * 5) * 12}vw,${atmosphereY * 18}vh,0)`;
      sky.style.transform = `translate3d(${-atmosphereY * 15}vw,${-atmosphereY * 12}vh,0)`;

      if (moving) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    };

    const schedule = () => {
      if (!frame && !disposed && !document.hidden && !reduced.matches) {
        frame = requestAnimationFrame(tick);
      }
    };

    const intersection = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const card = cards.get(entry.target as HTMLElement);
          if (!card) return;
          if (entry.isIntersecting) {
            visible.add(card);
            card.element.setAttribute('data-spatial-active', 'true');
          } else {
            visible.delete(card);
            card.element.removeAttribute('data-spatial-active');
            reset(card);
          }
        });
        schedule();
      }, { root, rootMargin: '40px', threshold: 0 })
      : null;

    const bindings: [string, string][] = [
      [classic.name, 'data-cinematic-name'],
      [classic.aboutGrid, 'data-editorial-grid'],
      [classic.aboutCard, 'data-editorial-card'],
      [classic.cardNumber, 'data-editorial-number'],
      [classic.aboutArrow, 'data-editorial-arrow'],
      [classic.contactBanner, 'data-contact-console'],
      [classic.contactActions, 'data-contact-actions'],
      [classic.contactGrid, 'data-contact-grid'],
      [classic.contactLink, 'data-contact-link'],
      [classic.sectionEyebrow, 'data-section-caption'],
      [classic.primaryButton, 'data-action-primary'],
      [classic.secondaryButton, 'data-action-secondary'],
      [classic.tags, 'data-technology-tags'],
      [classic.skillsGrid, 'data-spatial-grid'],
      [classic.certGrid, 'data-spatial-grid'],
      [classic.educationList, 'data-spatial-grid'],
      [classic.lab, 'data-orbit-lab'],
      [classic.orbitCore, 'data-orbit-core'],
      [classic.orbitHalo, 'data-orbit-halo'],
      [classic.orbitRing, 'data-orbit-ring'],
      [classic.orbitRingSecondary, 'data-orbit-secondary'],
      [classic.orbitSatellite, 'data-orbit-satellite']
    ];

    const refresh = () => {
      if (disposed) return;
      decorations.forEach((_attributes, element) => {
        if (!root.contains(element)) restore(element);
      });
      cards.forEach((card, element) => {
        if (root.contains(element)) return;
        intersection?.unobserve(element);
        visible.delete(card);
        reset(card);
        cards.delete(element);
      });
      bindings.forEach(([className, attribute]) => {
        root.querySelectorAll<HTMLElement>(`.${className}`).forEach((element) => {
          decorate(element, attribute);
        });
      });

      const selector = [
        classic.skillCard, classic.certCard, classic.educationCard,
        classic.contactBanner, classic.orbitScene
      ].map((name) => `.${name}`).join(',');

      root.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        if (cards.has(element)) return;
        const orbit = element.classList.contains(classic.orbitScene);
        const console = element.classList.contains(classic.contactBanner);
        decorate(element, orbit ? 'data-spatial-orbit' : console ? 'data-quantum-console' : 'data-spatial-card');
        decorate(element, 'data-quantum-card');
        const heading = element.querySelector<HTMLElement>('h3');
        if (heading) decorate(heading, 'data-spatial-title');
        const header = element.querySelector<HTMLElement>(`.${classic.skillHeader}`);
        if (header) decorate(header, 'data-spatial-heading');
        element.querySelectorAll<HTMLElement>(`.${classic.iconTile}`).forEach((icon) => {
          decorate(icon, 'data-spatial-icon');
        });
        const meta = element.querySelector<HTMLElement>(`.${classic.certTopline}`);
        if (meta) decorate(meta, 'data-spatial-meta');
        const card: Card = { element, orbit, index, y: 0, z: 0, rx: 0, ry: 0 };
        cards.set(element, card);
        if (intersection) intersection.observe(element);
        else {
          visible.add(card);
          element.setAttribute('data-spatial-active', 'true');
        }
      });
      schedule();
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !fine.matches || reduced.matches) return;
      mouseX = event.clientX;
      mouseY = event.clientY;
      hover = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-quantum-card]') : null;
      schedule();
    };

    const clearPointer = () => {
      hover = null;
      schedule();
    };

    const onScroll = () => {
      hover = null;
      schedule();
    };

    const resetMotion = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      velocity = 0;
      previousScroll = root.scrollTop;
      hover = null;
      cards.forEach(reset);
      schedule();
    };

    const onVisibility = () => {
      root.toggleAttribute('data-spatial-paused', document.hidden);
      resetMotion();
    };

    const main = root.querySelector('main');
    const mutation = new MutationObserver(refresh);
    if (main) mutation.observe(main, { childList: true, subtree: true });
    const resize = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(schedule) : null;
    resize?.observe(root);
    if (main) resize?.observe(main);

    root.addEventListener('pointermove', onPointer, { passive: true });
    root.addEventListener('pointerleave', clearPointer);
    root.addEventListener('pointercancel', clearPointer);
    root.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', resetMotion);
    fine.addEventListener('change', clearPointer);

    const stopCyber = mountCyberArtifact(root);
    refresh();
    onVisibility();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      mutation.disconnect();
      intersection?.disconnect();
      resize?.disconnect();
      root.removeEventListener('pointermove', onPointer);
      root.removeEventListener('pointerleave', clearPointer);
      root.removeEventListener('pointercancel', clearPointer);
      root.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', resetMotion);
      fine.removeEventListener('change', clearPointer);
      stopCyber();
      cards.forEach((card) => {
        reset(card);
        card.element.removeAttribute('data-spatial-active');
      });
      decorations.forEach((_attributes, element) => restore(element));
      root.removeAttribute('data-spatial-paused');
      root.classList.remove(spatial.host, details.host, quantum.host);
      atmosphere.remove();
    };
  }, [scrollRoot]);
}
