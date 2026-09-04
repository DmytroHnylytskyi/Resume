'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { radarState } from '../../store/radarState';
import { mobileControls } from '../../store/mobileControlsState';
import AnimatedCharacter from './AnimatedCharacter';

const WALK_SPEED = 2.6;
const RUN_SPEED = 4.6;
const JUMP_FORCE = 5.5;

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
  const {
    activeModal,
    selectedProject,
    isInitialWelcomeOpen,
    isTacticalMapOpen,
    interactionPrompt
  } = useGameStore();
  const isAnyModalOpen = Boolean(activeModal || selectedProject || isInitialWelcomeOpen || isTacticalMapOpen);

  const [isMoving, setIsMoving] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

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
  const lastJumpTime = useRef(0);

  // ── Reusable per-frame scratch vectors (ZERO allocations per frame) ──
  const _playerVec = useRef(new THREE.Vector3());
  const _moveDir = useRef(new THREE.Vector3());

  // ── Previous state tracking (only trigger React setState on actual change) ──
  const prevMoving = useRef(false);
  const prevSprinting = useRef(false);
  const prevJumping = useRef(false);

  // ── 1. Mouse Look with Pointer Lock ──
  useEffect(() => {
    const dom = gl.domElement;

    const handleCanvasClick = () => {
      if (!isAnyModalOpen && document.pointerLockElement !== dom) {
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
      if (isAnyModalOpen) return;
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
  }, [gl, isAnyModalOpen]);

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
      setIsMoving(false);
      setIsSprinting(false);
      setIsJumping(false);
    }
  }, [isAnyModalOpen]);

  // ── 2. Keyboard Event Handlers ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isAnyModalOpen) return;

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
        if (interactionPrompt && interactionPrompt.action) {
          interactionPrompt.action();
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
  }, [interactionPrompt, isAnyModalOpen]);

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

    // Only trigger React re-render when state ACTUALLY changes
    if (jumpingNow !== prevJumping.current) {
      prevJumping.current = jumpingNow;
      setIsJumping(jumpingNow);
    }

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

    // Only trigger React re-render when state ACTUALLY changes
    if (moving !== prevMoving.current) {
      prevMoving.current = moving;
      setIsMoving(moving);
    }
    if (sprinting !== prevSprinting.current) {
      prevSprinting.current = sprinting;
      setIsSprinting(sprinting);
    }

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
      prevJumping.current = true;
      setIsJumping(true);
      keys.current.jump = false;
      mobileControls.isJumping = false;
    } else if (!isGrounded.current && mobileControls.isJumping) {
      mobileControls.isJumping = false;
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
            <AnimatedCharacter
              isMoving={isMoving}
              isSprinting={isSprinting}
              isJumping={isJumping}
            />
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
