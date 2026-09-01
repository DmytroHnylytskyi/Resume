'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mobileControls } from '../../store/mobileControlsState';
import { useGameStore } from '../../store/useGameStore';
import { ArrowUp } from 'lucide-react';

const JOYSTICK_MAX_RADIUS = 42; // Maximum pixel displacement for knob
const JOYSTICK_DEADZONE = 5;

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

  // ── 1. Virtual Thumbstick Touch Handlers ──
  const handleJoystickTouchStart = useCallback(
    (e: React.TouchEvent) => {
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

      // Compute immediate position
      const dx = touch.clientX - joystickCenterRef.current.x;
      const dy = touch.clientY - joystickCenterRef.current.y;
      const dist = Math.hypot(dx, dy);

      if (dist > JOYSTICK_DEADZONE) {
        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS);
        const clampedX = Math.cos(angle) * clampedDist;
        const clampedY = Math.sin(angle) * clampedDist;

        setKnobPos({ x: clampedX, y: clampedY });
        mobileControls.moveX = clampedX / JOYSTICK_MAX_RADIUS;
        mobileControls.moveZ = clampedY / JOYSTICK_MAX_RADIUS;
        mobileControls.isSprinting = clampedDist / JOYSTICK_MAX_RADIUS > 0.78;
      }
    },
    []
  );

  const handleJoystickTouchMove = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= JOYSTICK_DEADZONE) {
          setKnobPos({ x: 0, y: 0 });
          mobileControls.moveX = 0;
          mobileControls.moveZ = 0;
          mobileControls.isSprinting = false;
        } else {
          const angle = Math.atan2(dy, dx);
          const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS);
          const clampedX = Math.cos(angle) * clampedDist;
          const clampedY = Math.sin(angle) * clampedDist;

          setKnobPos({ x: clampedX, y: clampedY });
          mobileControls.moveX = clampedX / JOYSTICK_MAX_RADIUS;
          mobileControls.moveZ = clampedY / JOYSTICK_MAX_RADIUS;
          mobileControls.isSprinting = clampedDist / JOYSTICK_MAX_RADIUS > 0.78;
        }
        break;
      }
    }
  }, []);

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

  // ── 2. Touch Camera Orbit Zone Handlers (Right Screen Area) ──
  const handleCameraTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && cameraTouchIdRef.current === null) {
      const touch = e.touches[0];
      cameraTouchIdRef.current = touch.identifier;
      lastCameraTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      // Initialize pinch-to-zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }
  }, []);

  const handleCameraTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const deltaDist = pinchStartDistRef.current - currentDist;

      mobileControls.pinchZoomDelta = deltaDist * 0.05;
      pinchStartDistRef.current = currentDist;
      return;
    }

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

  const handleCameraTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
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

  // Global touchmove/touchend listeners to guarantee smooth thumb tracking even if finger leaves base
  useEffect(() => {
    window.addEventListener('touchmove', handleJoystickTouchMove, { passive: false });
    window.addEventListener('touchend', handleJoystickTouchEnd);
    window.addEventListener('touchcancel', handleJoystickTouchEnd);

    window.addEventListener('touchmove', handleCameraTouchMove, { passive: true });
    window.addEventListener('touchend', handleCameraTouchEnd);
    window.addEventListener('touchcancel', handleCameraTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleJoystickTouchMove);
      window.removeEventListener('touchend', handleJoystickTouchEnd);
      window.removeEventListener('touchcancel', handleJoystickTouchEnd);

      window.removeEventListener('touchmove', handleCameraTouchMove);
      window.removeEventListener('touchend', handleCameraTouchEnd);
      window.removeEventListener('touchcancel', handleCameraTouchEnd);
    };
  }, [
    handleJoystickTouchMove,
    handleJoystickTouchEnd,
    handleCameraTouchMove,
    handleCameraTouchEnd
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
      {/* ── 1. Right Half Touch Camera Orbit Zone ── */}
      <div
        className="mobile-camera-touch-zone"
        onTouchStart={handleCameraTouchStart}
      />

      {/* ── 2. Virtual Analog Thumbstick (Bottom-Left) ── */}
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

      {/* ── 3. Mobile Jump Floating Action Button (Bottom-Right) ── */}
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
