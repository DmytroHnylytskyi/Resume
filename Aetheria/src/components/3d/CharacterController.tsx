'use client';

import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { characterAnimState } from '../../store/characterAnimState';
import { radarState } from '../../store/radarState';
import { mobileControls } from '../../store/mobileControlsState';
import { getGlobalCyberAudio } from '../../hooks/cyberAudio';
import AnimatedCharacter from './AnimatedCharacter';

const WALK_SPEED = 2.6;
const RUN_SPEED = 4.6;
const JUMP_FORCE = 5.5;

// ── Cinematic intro flight path (module constants — zero per-frame allocation) ──
// Hold: camera is perfectly still while assets decode (loading jank stays invisible).
// Then a slow sky drift, then the bezier dive to the spawn point.
const INTRO_SKY_A = new THREE.Vector3(26, 38, 36);
const INTRO_SKY_B = new THREE.Vector3(15, 26, 26);
const INTRO_SKY_DRIFT_MS = 2200; // drift window after assets are ready
const INTRO_DESCEND_MS = 2600; // bezier dive duration
const INTRO_CONTROL = new THREE.Vector3(4, 9, 27); // bezier control point
const INTRO_END_CAM = new THREE.Vector3(0, 3.6, 18); // matches spawn + steadicam offset
const INTRO_END_LOOK = new THREE.Vector3(0, 2.2, 14); // spawn + head height
const INTRO_CENTER_LOOK = new THREE.Vector3(0, 3, 0); // island center during the sky beat

interface CharacterControllerProps {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
  spawnPoint?: [number, number, number];
}

/**
 * CharacterController
 * 
 * 3rd-Person Dynamic Character Controller with Rapier 3D physics integration and orbit camera.
 * 
 * Architectural Highlights:
 * - Dynamic Rapier RigidBody: Capsule collider with Continuous Collision Detection (CCD) preventing tunneling.
 * - Kinematic-like Velocity Control: Direct linear velocity modulation with momentum interpolation (`lerp`) and zero friction drift.
 * - Orbital Steadicam: Smooth spherical coordinates camera tracking with independent yaw and pitch lerping.
 * - Zero-GC Frame Loop: All per-frame vector calculations utilize reusable scratch Vector3 buffers without allocating memory.
 * - Modal Integration: Automatically releases pointer lock and halts movement vectors whenever modal interfaces open.
 */
export default function CharacterController({
  playerPosRef,
  spawnPoint = [0.0, 1.0, 14.0]
}: CharacterControllerProps): React.ReactElement {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const avatarGroupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  // Granular Zustand subscriptions: whole-store subscription would re-render
  // this subtree on ANY store change (e.g. proximity prompt edges), causing
  // frame stalls on integrated GPUs — same cost class as the jump-state fix.
  const activeModal = useGameStore((s) => s.activeModal);
  const selectedProject = useGameStore((s) => s.selectedProject);
  const isInitialWelcomeOpen = useGameStore((s) => s.isInitialWelcomeOpen);
  const isTacticalMapOpen = useGameStore((s) => s.isTacticalMapOpen);
  const isIntroPlaying = useGameStore((s) => s.isIntroPlaying);
  const setIntroPlaying = useGameStore((s) => s.setIntroPlaying);
  const isAnyModalOpen = Boolean(activeModal || selectedProject || isInitialWelcomeOpen || isTacticalMapOpen);

  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    shift: false
  });

  // Camera angles: Looking forward into negative Z (cemetery/island)
  const targetYaw = useRef(0.0);
  const targetPitch = useRef(0.32); // 18° downward angle to view character & ground
  const cameraYaw = useRef(0.0);
  const cameraPitch = useRef(0.32);
  const cameraDistance = useRef(4.0);

  // Steadicam buffers (reusable — zero GC pressure)
  const smoothLookTarget = useRef(new THREE.Vector3(spawnPoint[0], spawnPoint[1] + 0.8, spawnPoint[2]));
  const smoothCamPos = useRef(new THREE.Vector3(spawnPoint[0], spawnPoint[1] + 2.2, spawnPoint[2] + 4.0));
  const currentVelocity = useRef(new THREE.Vector3());
  const isGrounded = useRef(true);
  const wasGrounded = useRef(true);
  const footstepTimer = useRef(0);
  const lastJumpTime = useRef(0);

  // ── Reusable per-frame scratch vectors (ZERO allocations per frame) ──
  const _playerVec = useRef(new THREE.Vector3());
  const _moveDir = useRef(new THREE.Vector3());

  // ── Cinematic intro state ──
  const introStartTime = useRef<number | null>(null);
  const introDescendStarted = useRef(false);
  const introDescendStart = useRef(0);
  const introFromPos = useRef(new THREE.Vector3());
  const introFromLook = useRef(new THREE.Vector3());
  // Set when the intro was skipped with a pointer gesture: the click event of
  // that same gesture arrives after `isIntroPlaying` already went false, and
  // without this flag the canvas would grab pointer lock right as the mode
  // card appears — leaving the cursor captured with nothing to click with.
  const introSkipGesture = useRef(false);

  // Track intro lifecycle: arm the clock when the flight begins,
  // release it on landing/skip so a replay can re-arm cleanly.
  useEffect(() => {
    if (isIntroPlaying) {
      if (introStartTime.current === null) introStartTime.current = performance.now();
      introDescendStarted.current = false;
    } else {
      introStartTime.current = null;
    }
  }, [isIntroPlaying]);

  // Skip: any key press or click ends the flight; the normal steadicam
  // lerp glides the camera in from wherever it currently is. The first
  // 600ms are guarded so the click that LAUNCHED the replay cannot skip it.
  useEffect(() => {
    if (!isIntroPlaying) return;

    const skipIntro = (): boolean => {
      if (introStartTime.current !== null && performance.now() - introStartTime.current < 600) return false;
      smoothCamPos.current.copy(camera.position);
      introStartTime.current = null;
      try {
        localStorage.setItem('aetheria_intro_seen', '1');
      } catch (_) {}
      setIntroPlaying(false);
      return true;
    };

    const onPointerDownSkip = () => {
      if (skipIntro()) {
        introSkipGesture.current = true;
        // Transient by construction: if the matching click never reaches the
        // canvas (released elsewhere), the flag expires on its own.
        window.setTimeout(() => { introSkipGesture.current = false; }, 1200);
      }
    };

    window.addEventListener('keydown', skipIntro);
    window.addEventListener('pointerdown', onPointerDownSkip);
    return () => {
      window.removeEventListener('keydown', skipIntro);
      window.removeEventListener('pointerdown', onPointerDownSkip);
    };
  }, [isIntroPlaying, camera, setIntroPlaying]);

  // ── 1. Mouse Look with Pointer Lock ──
  useEffect(() => {
    const dom = gl.domElement;

    const handleCanvasClick = () => {
      // Consume the click of the intro-skipping gesture without locking the
      // pointer — the mode card is about to appear and needs the cursor.
      if (introSkipGesture.current) {
        introSkipGesture.current = false;
        return;
      }
      if (!isAnyModalOpen && !isIntroPlaying && document.pointerLockElement !== dom) {
        try {
          const p = dom.requestPointerLock();
          if (p && 'catch' in p) p.catch(() => {});
        } catch (_) {}
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isAnyModalOpen && document.pointerLockElement === dom) {
        const sensitivity = 0.0016;
        const movX = Number.isFinite(e.movementX) ? e.movementX : 0;
        const movY = Number.isFinite(e.movementY) ? e.movementY : 0;
        targetYaw.current -= movX * sensitivity;
        targetPitch.current = Math.max(-0.2, Math.min(0.95, targetPitch.current + movY * sensitivity));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isAnyModalOpen || isIntroPlaying) return;
      const delta = Number.isFinite(e.deltaY) ? e.deltaY : 0;
      cameraDistance.current = Math.max(2.2, Math.min(7.0, cameraDistance.current + delta * 0.002));
    };

    dom.addEventListener('click', handleCanvasClick);
    document.addEventListener('mousemove', handleMouseMove);
    dom.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      dom.removeEventListener('click', handleCanvasClick);
      document.removeEventListener('mousemove', handleMouseMove);
      dom.removeEventListener('wheel', handleWheel);
    };
  }, [gl, isAnyModalOpen, isIntroPlaying]);

  // Release pointer lock and reset keys whenever ANY modal opens
  useEffect(() => {
    if (isAnyModalOpen) {
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch (_) {}
      }
      keys.current.forward = false;
      keys.current.backward = false;
      keys.current.left = false;
      keys.current.right = false;
      keys.current.jump = false;
      keys.current.shift = false;
      characterAnimState.isMoving = false;
      characterAnimState.isSprinting = false;
      characterAnimState.isJumping = false;
    }
  }, [isAnyModalOpen]);

  // ── 2. Keyboard Event Handlers ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isAnyModalOpen || isIntroPlaying) return;

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.current.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') keys.current.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') keys.current.right = true;
      if (code === 'Space') {
        keys.current.jump = true;
        e.preventDefault();
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') keys.current.shift = true;
      if (code === 'KeyE') {
        // Read via getState(): subscribing to interactionPrompt would re-render on every proximity edge
        const prompt = useGameStore.getState().interactionPrompt;
        if (prompt && prompt.action) {
          prompt.action();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isAnyModalOpen) return;
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') keys.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') keys.current.right = false;
      if (code === 'Space') keys.current.jump = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') keys.current.shift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isAnyModalOpen, isIntroPlaying]);

  // ── 3. Physics & Camera Update Frame Loop ──
  useFrame(() => {
    if (!rigidBodyRef.current) return;

    const translation = rigidBodyRef.current.translation();
    const linvel = rigidBodyRef.current.linvel();
    const now = performance.now();

    if (
      !translation ||
      !linvel ||
      !Number.isFinite(translation.x) ||
      !Number.isFinite(translation.y) ||
      !Number.isFinite(translation.z)
    ) {
      return;
    }

    // Broadcast player coordinate — REUSE existing Vector3, zero GC
    if (playerPosRef) {
      if (!playerPosRef.current) {
        playerPosRef.current = new THREE.Vector3();
      }
      playerPosRef.current.set(translation.x, translation.y, translation.z);
    }

    // ── Cinematic Intro Camera: fly over the island, dive to spawn, handoff ──
    // Replaces the whole input/camera section while active (input is locked).
    if (isIntroPlaying && introStartTime.current !== null) {
      // Void-fall safety during the flight (character rests at spawn)
      if (translation.y < -3.0) {
        rigidBodyRef.current.setTranslation({ x: spawnPoint[0], y: spawnPoint[1], z: spawnPoint[2] }, true);
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }

      const sinceStart = now - introStartTime.current;
      if (sinceStart < INTRO_SKY_DRIFT_MS) {
        // SKY DRIFT: slow glide over the island toward the descent origin
        // (the flight only begins after the loading screen has finished)
        const k = sinceStart / INTRO_SKY_DRIFT_MS;
        const e = k * k * (3 - 2 * k); // smoothstep
        _playerVec.current.copy(INTRO_SKY_A).lerp(INTRO_SKY_B, e);
        camera.position.copy(_playerVec.current);
        camera.lookAt(INTRO_CENTER_LOOK);
        introDescendStarted.current = false;
      } else {
          // DESCENT: easeInOutCubic quadratic bezier from the sky to the steadicam seat
          if (!introDescendStarted.current) {
            introDescendStarted.current = true;
            introDescendStart.current = now;
            introFromPos.current.copy(camera.position);
            introFromLook.current.copy(INTRO_CENTER_LOOK);
          }
          const t = Math.min(1, (now - introDescendStart.current) / INTRO_DESCEND_MS);
          const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const inv = 1 - e;
          _playerVec.current.set(
            inv * inv * introFromPos.current.x + 2 * inv * e * INTRO_CONTROL.x + e * e * INTRO_END_CAM.x,
            inv * inv * introFromPos.current.y + 2 * inv * e * INTRO_CONTROL.y + e * e * INTRO_END_CAM.y,
            inv * inv * introFromPos.current.z + 2 * inv * e * INTRO_CONTROL.z + e * e * INTRO_END_CAM.z
          );
          camera.position.copy(_playerVec.current);
          _moveDir.current.copy(introFromLook.current).lerp(INTRO_END_LOOK, e);
          camera.lookAt(_moveDir.current);

          if (t >= 1) {
            // Handoff: seed the steadicam buffers so the normal loop continues seamlessly
            smoothCamPos.current.copy(INTRO_END_CAM);
            smoothLookTarget.current.copy(INTRO_END_LOOK);
            camera.position.copy(INTRO_END_CAM);
            try {
              localStorage.setItem('aetheria_intro_seen', '1');
            } catch (_) {}
            setIntroPlaying(false);
          }
      }

      // Keep radar telemetry alive; discard touch camera input gathered mid-flight
      radarState.x = translation.x;
      radarState.z = translation.z;
      radarState.yaw = cameraYaw.current;
      mobileControls.lookDeltaX = 0;
      mobileControls.lookDeltaY = 0;
      mobileControls.pinchZoomDelta = 0;
      return;
    }

    // Consume mobile touch camera orbit & pinch zoom
    if (!isAnyModalOpen) {
      if (mobileControls.lookDeltaX !== 0) {
        targetYaw.current -= mobileControls.lookDeltaX * 0.0055;
        mobileControls.lookDeltaX = 0;
      }
      if (mobileControls.lookDeltaY !== 0) {
        targetPitch.current = Math.max(
          -0.2,
          Math.min(0.95, targetPitch.current + mobileControls.lookDeltaY * 0.0055)
        );
        mobileControls.lookDeltaY = 0;
      }
      if (mobileControls.pinchZoomDelta !== 0) {
        cameraDistance.current = Math.max(
          2.2,
          Math.min(7.0, cameraDistance.current + mobileControls.pinchZoomDelta)
        );
        mobileControls.pinchZoomDelta = 0;
      }
    }

    // Smooth camera angles with finiteness guards
    if (!Number.isFinite(targetYaw.current)) targetYaw.current = 0.0;
    if (!Number.isFinite(targetPitch.current)) targetPitch.current = 0.32;

    cameraYaw.current = THREE.MathUtils.lerp(cameraYaw.current, targetYaw.current, 0.22);
    cameraPitch.current = THREE.MathUtils.lerp(cameraPitch.current, targetPitch.current, 0.22);

    if (!Number.isFinite(cameraYaw.current)) cameraYaw.current = 0.0;
    if (!Number.isFinite(cameraPitch.current)) cameraPitch.current = 0.32;
    if (!Number.isFinite(cameraDistance.current)) cameraDistance.current = 4.0;

    // Synchronize zero-overhead radar telemetry
    radarState.x = translation.x;
    radarState.z = translation.z;
    radarState.yaw = cameraYaw.current;

    // Void Fall Recovery
    if (translation.y < -3.0) {
      rigidBodyRef.current.setTranslation({ x: spawnPoint[0], y: spawnPoint[1], z: spawnPoint[2] }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      smoothLookTarget.current.set(spawnPoint[0], spawnPoint[1] + 0.8, spawnPoint[2]);
      smoothCamPos.current.set(spawnPoint[0], spawnPoint[1] + 2.2, spawnPoint[2] + 4.0);
      return;
    }

    // Ground check
    const timeSinceJump = now - lastJumpTime.current;
    isGrounded.current = Math.abs(linvel.y) < 0.25 && timeSinceJump > 400;
    const jumpingNow = !isGrounded.current && timeSinceJump < 600;

    // Broadcast locomotion flags via the zero-overhead mutable buffer
    // (React state here was measured to cause 40–55 FPS dips on iGPUs)
    characterAnimState.isJumping = jumpingNow;

    // Direction calculation relative to camera yaw (Keyboard + Mobile Virtual Joystick)
    const fwdKeyboard = (keys.current.forward ? 1 : 0) - (keys.current.backward ? 1 : 0);
    const sideKeyboard = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0);

    const fwdInput = fwdKeyboard + (-mobileControls.moveZ);
    const sideInput = sideKeyboard + mobileControls.moveX;

    const fwdX = -Math.sin(cameraYaw.current);
    const fwdZ = -Math.cos(cameraYaw.current);
    const rightX = Math.cos(cameraYaw.current);
    const rightZ = -Math.sin(cameraYaw.current);

    // Reuse scratch Vector3 — zero GC
    const moveDir = _moveDir.current;
    moveDir.set(
      fwdX * fwdInput + rightX * sideInput,
      0,
      fwdZ * fwdInput + rightZ * sideInput
    );

    const moving = moveDir.lengthSq() > 0.01;
    const sprinting = (keys.current.shift || mobileControls.isSprinting) && moving;

    characterAnimState.isMoving = moving;
    characterAnimState.isSprinting = sprinting;

    if (moving) {
      moveDir.normalize();
      const speed = (keys.current.shift || mobileControls.isSprinting) ? RUN_SPEED : WALK_SPEED;
      moveDir.multiplyScalar(speed);

      currentVelocity.current.lerp(moveDir, 0.2);

      // Face movement direction smoothly
      const facingAngle = Math.atan2(moveDir.x, moveDir.z);
      if (avatarGroupRef.current) {
        let diff = (facingAngle - avatarGroupRef.current.rotation.y) % (Math.PI * 2);
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > Math.PI) diff -= Math.PI * 2;
        avatarGroupRef.current.rotation.y += diff * 0.2;
      }

      rigidBodyRef.current.setLinvel(
        { x: currentVelocity.current.x, y: linvel.y, z: currentVelocity.current.z },
        true
      );
    } else {
      currentVelocity.current.set(0, 0, 0);
      rigidBodyRef.current.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    }

    // Jump (Keyboard Space or Mobile Jump Button)
    if ((keys.current.jump || mobileControls.isJumping) && isGrounded.current && timeSinceJump > 400) {
      rigidBodyRef.current.setLinvel({ x: linvel.x, y: JUMP_FORCE, z: linvel.z }, true);
      lastJumpTime.current = now;
      isGrounded.current = false;
      characterAnimState.isJumping = true;
      keys.current.jump = false;
      mobileControls.isJumping = false;
      getGlobalCyberAudio().play('jump');
    } else if (!isGrounded.current && mobileControls.isJumping) {
      mobileControls.isJumping = false;
    }

    // Landing detection
    if (!wasGrounded.current && isGrounded.current) {
      getGlobalCyberAudio().play('land');
    }
    wasGrounded.current = isGrounded.current;

    // Footsteps on locomotion
    if (moving && isGrounded.current && !isIntroPlaying) {
      const stepInterval = sprinting ? 260 : 360;
      if (now - footstepTimer.current > stepInterval) {
        footstepTimer.current = now;
        getGlobalCyberAudio().play('footstep');
      }
    }

    // ── 3rd-Person Camera & Cinematic Intro Swoop ──
    smoothLookTarget.current.x = THREE.MathUtils.lerp(smoothLookTarget.current.x, translation.x, 0.12);
    smoothLookTarget.current.y = THREE.MathUtils.lerp(smoothLookTarget.current.y, translation.y + 0.85, 0.10);
    smoothLookTarget.current.z = THREE.MathUtils.lerp(smoothLookTarget.current.z, translation.z, 0.12);

    const cosPitch = Math.cos(cameraPitch.current);
    const sinPitch = Math.sin(cameraPitch.current);

    const targetCamX = smoothLookTarget.current.x + cameraDistance.current * Math.sin(cameraYaw.current) * cosPitch;
    const targetCamY = smoothLookTarget.current.y + cameraDistance.current * sinPitch;
    const targetCamZ = smoothLookTarget.current.z + cameraDistance.current * Math.cos(cameraYaw.current) * cosPitch;

    smoothCamPos.current.x = THREE.MathUtils.lerp(smoothCamPos.current.x, targetCamX, 0.12);
    smoothCamPos.current.y = THREE.MathUtils.lerp(smoothCamPos.current.y, targetCamY, 0.10);
    smoothCamPos.current.z = THREE.MathUtils.lerp(smoothCamPos.current.z, targetCamZ, 0.12);

    if (
      Number.isFinite(smoothCamPos.current.x) &&
      Number.isFinite(smoothCamPos.current.y) &&
      Number.isFinite(smoothCamPos.current.z)
    ) {
      camera.position.copy(smoothCamPos.current);
    }

    if (
      Number.isFinite(smoothLookTarget.current.x) &&
      Number.isFinite(smoothLookTarget.current.y) &&
      Number.isFinite(smoothLookTarget.current.z)
    ) {
      camera.lookAt(smoothLookTarget.current);
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      position={spawnPoint}
      enabledRotations={[false, false, false]}
      friction={0.8}
      restitution={0.0}
      linearDamping={2.5}
      angularDamping={2.5}
      ccd={true}
    >
      <CapsuleCollider args={[0.54, 0.30]} position={[0, 0.84, 0]} friction={0.8} />

      <group ref={avatarGroupRef} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
        <CharacterErrorBoundary fallback={<CharacterFallback />}>
          <Suspense fallback={<CharacterFallback />}>
            <AnimatedCharacter />
          </Suspense>
        </CharacterErrorBoundary>
      </group>
    </RigidBody>
  );
}

/**
 * CharacterFallback
 * 
 * Stylized ethereal astral avatar rendered during asset loading or in the event
 * of a network stall. Guarantees the player is never an invisible ghost.
 */
function CharacterFallback(): React.ReactElement {
  const fallbackRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (fallbackRef.current) {
      fallbackRef.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.04;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.2;
    }
  });

  return (
    <group ref={fallbackRef} position={[0, 0, 0]}>
      {/* Astral Cloaked Robe */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.22, 0.38, 1.1, 16]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#4338ca"
          emissiveIntensity={0.6}
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Hooded Astral Head */}
      <mesh position={[0, 1.40, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#8b5cf6"
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.3}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Subtle Soul Core Light */}
      <pointLight position={[0, 1.1, 0]} intensity={1.2} color="#a78bfa" distance={3} />

      {/* Celestial Rune Ring at feet */}
      <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.52, 24]} />
        <meshBasicMaterial
          color="#c084fc"
          side={THREE.DoubleSide}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

/**
 * CharacterErrorBoundary
 * 
 * Traps any 3D asset initialization or parsing errors to prevent canvas crashing
 * and displays the resilient fallback avatar.
 */
class CharacterErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('AnimatedCharacter load error, using fallback avatar:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
