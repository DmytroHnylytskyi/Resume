'use client';

/**
 * MobileTouchControls — dual-zone touch gameplay layer.
 *
 * LEFT: a virtual analog thumbstick writing into the shared zero-allocation
 * `mobileControls` buffer (radial clamp + deadzone, sprint when pushed to
 * the rim). RIGHT: a floating jump button. Any other touch orbits the
 * camera; two fingers pinch-zoom — all deltas accumulate into the same
 * buffer, consumed by CharacterController's frame loop. Listeners are
 * window-level and passive (except the joystick move, which needs
 * preventDefault to stop page scroll), and the layer unmounts in classic
 * view or while any modal is open.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mobileControls } from '../../store/mobileControlsState';
import { useGameStore } from '../../store/useGameStore';
import { ArrowUp } from 'lucide-react';

const JOYSTICK_MAX_RADIUS = 42; // Maximum pixel displacement for knob
const JOYSTICK_DEADZONE = 5;
// Thumb distance (fraction of max radius) beyond which sprint engages.
const JOYSTICK_SPRINT_RATIO = 0.78;

export default function MobileTouchControls(): React.ReactElement | null {
  const {
    viewMode,
    isInitialWelcomeOpen,
    activeModal,
    selectedProject,
    isTacticalMapOpen
  } = useGameStore();

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const cameraTouchIdRef = useRef<number | null>(null);
  const lastCameraTouchPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);

  // Detect coarse pointer / touch capability across phones, tablets, foldables
  useEffect(() => {
    const checkTouch = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(hasTouch);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // ── 1. Virtual Thumbstick Handlers (Left Thumb) ──
  // Shared radial clamp: maps a raw thumb offset to the visual knob position
  // and the normalized move vector consumed by the physics loop.
  const applyJoystickDelta = useCallback((dx: number, dy: number) => {
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: clampedX, y: clampedY });
    mobileControls.moveX = clampedX / JOYSTICK_MAX_RADIUS;
    mobileControls.moveZ = clampedY / JOYSTICK_MAX_RADIUS;
    mobileControls.isSprinting = clampedDist / JOYSTICK_MAX_RADIUS > JOYSTICK_SPRINT_RATIO;
  }, []);

  const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    if (joystickBaseRef.current) {
      const rect = joystickBaseRef.current.getBoundingClientRect();
      joystickCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    setIsJoystickActive(true);
    mobileControls.isActive = true;

    const dx = touch.clientX - joystickCenterRef.current.x;
    const dy = touch.clientY - joystickCenterRef.current.y;
    if (Math.hypot(dx, dy) > JOYSTICK_DEADZONE) {
      applyJoystickDelta(dx, dy);
    }
  }, [applyJoystickDelta]);

  const handleJoystickTouchMove = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;

        if (Math.hypot(dx, dy) <= JOYSTICK_DEADZONE) {
          setKnobPos({ x: 0, y: 0 });
          mobileControls.moveX = 0;
          mobileControls.moveZ = 0;
          mobileControls.isSprinting = false;
        } else {
          applyJoystickDelta(dx, dy);
        }
        break;
      }
    }
  }, [applyJoystickDelta]);

  const handleJoystickTouchEnd = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setIsJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        mobileControls.isActive = false;
        mobileControls.moveX = 0;
        mobileControls.moveZ = 0;
        mobileControls.isSprinting = false;
        break;
      }
    }
  }, []);

  // ── 2. Universal Touch Camera Orbit (Any touch outside joystick & interactive buttons) ──
  const handleGlobalTouchStart = useCallback((e: TouchEvent) => {
    // Only consider touches that are NOT assigned to the virtual joystick
    const nonJoystickTouches = Array.from(e.touches).filter(
      (t) => t.identifier !== joystickTouchIdRef.current
    );

    // If 2 camera fingers are down, activate pinch-to-zoom
    if (nonJoystickTouches.length >= 2) {
      const t1 = nonJoystickTouches[0];
      const t2 = nonJoystickTouches[1];
      pinchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      cameraTouchIdRef.current = null;
      return;
    }

    if (cameraTouchIdRef.current !== null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Skip if touch is assigned to joystick
      if (touch.identifier === joystickTouchIdRef.current) continue;

      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      // Skip touches directly on buttons, top bar, mini-radar, or joystick
      if (
        targetEl?.closest('.mobile-joystick-base') ||
        targetEl?.closest('.mobile-jump-btn') ||
        targetEl?.closest('.island-top-bar') ||
        targetEl?.closest('.mini-radar-wrapper') ||
        targetEl?.closest('.minimal-interaction-pill-wrapper') ||
        targetEl?.closest('button')
      ) {
        continue;
      }

      // Claim touch for camera orbit
      cameraTouchIdRef.current = touch.identifier;
      lastCameraTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
      break;
    }
  }, []);

  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    const nonJoystickTouches = Array.from(e.touches).filter(
      (t) => t.identifier !== joystickTouchIdRef.current
    );

    // 2-finger pinch-to-zoom (excluding joystick finger)
    if (nonJoystickTouches.length >= 2 && pinchStartDistRef.current !== null) {
      const t1 = nonJoystickTouches[0];
      const t2 = nonJoystickTouches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const deltaDist = pinchStartDistRef.current - currentDist;

      mobileControls.pinchZoomDelta = deltaDist * 0.04;
      pinchStartDistRef.current = currentDist;
      return;
    }

    // 1-finger camera orbit (works simultaneously with joystick movement!)
    if (cameraTouchIdRef.current !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === cameraTouchIdRef.current) {
          const deltaX = touch.clientX - lastCameraTouchPosRef.current.x;
          const deltaY = touch.clientY - lastCameraTouchPosRef.current.y;

          mobileControls.lookDeltaX += deltaX;
          mobileControls.lookDeltaY += deltaY;

          lastCameraTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    }
  }, []);

  const handleGlobalTouchEnd = useCallback((e: TouchEvent) => {
    const nonJoystickTouches = Array.from(e.touches).filter(
      (t) => t.identifier !== joystickTouchIdRef.current
    );

    if (nonJoystickTouches.length < 2) {
      pinchStartDistRef.current = null;
    }
    if (cameraTouchIdRef.current !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === cameraTouchIdRef.current) {
          cameraTouchIdRef.current = null;
          break;
        }
      }
    }
  }, []);

  // Global listeners guarantee smooth, unbreakable touch tracking everywhere
  useEffect(() => {
    window.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true });

    window.addEventListener('touchmove', handleJoystickTouchMove, { passive: false });
    window.addEventListener('touchend', handleJoystickTouchEnd);
    window.addEventListener('touchcancel', handleJoystickTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleGlobalTouchStart);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);

      window.removeEventListener('touchmove', handleJoystickTouchMove);
      window.removeEventListener('touchend', handleJoystickTouchEnd);
      window.removeEventListener('touchcancel', handleJoystickTouchEnd);
    };
  }, [
    handleGlobalTouchStart,
    handleGlobalTouchMove,
    handleGlobalTouchEnd,
    handleJoystickTouchMove,
    handleJoystickTouchEnd
  ]);

  // Jump Button Trigger
  const handleJumpPress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    mobileControls.isJumping = true;
  }, []);

  // Hide mobile controls when modals or tactical map are active
  const isAnyModalOpen = Boolean(
    activeModal || selectedProject || isInitialWelcomeOpen || isTacticalMapOpen
  );

  if (!isTouchDevice || viewMode !== '3d' || isAnyModalOpen) {
    return null;
  }

  return (
    <div className="mobile-touch-overlay">
      {/* ── 1. Virtual Analog Thumbstick (Bottom-Left) ── */}
      <div className="mobile-joystick-wrapper">
        <div
          ref={joystickBaseRef}
          className={`mobile-joystick-base ${isJoystickActive ? 'active' : ''}`}
          onTouchStart={handleJoystickTouchStart}
        >
          {/* Inner Guidance Crosshair & Ring */}
          <div className="joystick-ring-guide" />
          <div className="joystick-axis-h" />
          <div className="joystick-axis-v" />

          {/* Dynamic Knob with 60 FPS CSS transform */}
          <div
            className="mobile-joystick-knob"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`
            }}
          >
            <div className="joystick-knob-core" />
          </div>
        </div>
      </div>

      {/* ── 2. Mobile Jump Floating Action Button (Bottom-Right) ── */}
      <button
        className="mobile-jump-btn glass-panel"
        onTouchStart={handleJumpPress}
        onMouseDown={handleJumpPress}
        aria-label="Стрибок"
      >
        <ArrowUp size={22} className="mobile-jump-icon" />
      </button>
    </div>
  );
}
