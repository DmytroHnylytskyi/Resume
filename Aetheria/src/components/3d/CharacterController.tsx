'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { sound } from '../../utils/audio';
import AnimatedCharacter from './AnimatedCharacter';

// Calibrated, smooth, natural locomotion speeds
const MOVE_SPEED = 2.2;
const SPRINT_SPEED = 3.8;
const JUMP_FORCE = 5.2;

interface CharacterControllerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  spawnPoint?: [number, number, number];
}

/**
 * Premium 3rd-Person Character Controller:
 * - Anti-Air-Jump Lock: 450ms cooldown strictly preventing jump spam flight / double jumping.
 * - Solid ground detection & natural jump arc.
 * - Anti-slip slope lock: character firmly stays in place on slopes and edges.
 * - Steadicam Gimbal camera smoothing with full vertical pitch range.
 * - Instant crisp stop on key release.
 */
export default function CharacterController({
  playerPosRef,
  spawnPoint = [1.0, 10.2, -0.5]
}: CharacterControllerProps): React.ReactElement {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const avatarGroupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  // Locomotion state for animations
  const [isMoving, setIsMoving] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [isJumpingState, setIsJumpingState] = useState(false);

  // Keyboard state
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    shift: false
  });

  // Target & Smoothed Camera Angles
  const targetYaw = useRef(0.35);
  const targetPitch = useRef(0.22);
  const cameraYaw = useRef(0.35);
  const cameraPitch = useRef(0.22);
  const cameraDistance = useRef(2.6);

  // Steadicam Smooth Gimbal Buffers
  const smoothLookTarget = useRef(new THREE.Vector3(spawnPoint[0], spawnPoint[1] + 0.5, spawnPoint[2]));
  const smoothCamPos = useRef(new THREE.Vector3());

  // Velocity buffers
  const currentVelocity = useRef(new THREE.Vector3());

  const lastStepTime = useRef(0);
  const lastJumpTime = useRef(0);
  const isGrounded = useRef(true);

  const { isRespawning, setIsRespawning, interactionPrompt, isWarping, cameraMode, activeModal } = useGameStore();

  // ── 1. Pointer Lock API with Weighted Smooth Sensitivity ──
  useEffect(() => {
    const dom = gl.domElement;

    const handleCanvasClick = () => {
      if (!activeModal && document.pointerLockElement !== dom) {
        dom.requestPointerLock();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === dom) {
        const sensitivity = 0.0014;
        targetYaw.current -= e.movementX * sensitivity;
        targetPitch.current = Math.max(-0.65, Math.min(1.35, targetPitch.current + e.movementY * sensitivity));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      cameraDistance.current = Math.max(1.6, Math.min(7.5, cameraDistance.current + e.deltaY * 0.0025));
    };

    dom.addEventListener('click', handleCanvasClick);
    document.addEventListener('mousemove', handleMouseMove);
    dom.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      dom.removeEventListener('click', handleCanvasClick);
      document.removeEventListener('mousemove', handleMouseMove);
      dom.removeEventListener('wheel', handleWheel);
    };
  }, [gl, activeModal]);

  // Release pointer lock when opening modals
  useEffect(() => {
    if (activeModal && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [activeModal]);

  // ── 2. Keyboard Listeners ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
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
  }, [interactionPrompt]);

  // ── 3. Main Physics & Camera Frame Loop ──
  useFrame((state, delta) => {
    if (!rigidBodyRef.current || isWarping) return;

    const translation = rigidBodyRef.current.translation();
    const linvel = rigidBodyRef.current.linvel();
    const now = performance.now();

    if (!Number.isFinite(translation.x) || !Number.isFinite(translation.y) || !Number.isFinite(translation.z)) {
      rigidBodyRef.current.setTranslation({ x: spawnPoint[0], y: spawnPoint[1], z: spawnPoint[2] }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Broadcast player coordinates
    if (playerPosRef) {
      playerPosRef.current = new THREE.Vector3(translation.x, translation.y, translation.z);
    }

    // Smooth weighted camera rotation interpolation
    cameraYaw.current = THREE.MathUtils.lerp(cameraYaw.current, targetYaw.current, 0.22);
    cameraPitch.current = THREE.MathUtils.lerp(cameraPitch.current, targetPitch.current, 0.22);

    // ── Void Fall Detection & Auto-Recovery ──
    if (translation.y < -4.0 && !isRespawning) {
      setIsRespawning(true);
      sound.playVoidWind();

      rigidBodyRef.current.setTranslation(
        { x: spawnPoint[0], y: spawnPoint[1] + 1.2, z: spawnPoint[2] },
        true
      );
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      currentVelocity.current.set(0, 0, 0);

      setTimeout(() => {
        setIsRespawning(false);
      }, 400);
      return;
    }

    // Strict Grounded Detection (Cooldown prevents apex air jumps)
    const timeSinceLastJump = now - lastJumpTime.current;
    isGrounded.current = Math.abs(linvel.y) < 0.25 && timeSinceLastJump > 450;
    setIsJumpingState(!isGrounded.current && timeSinceLastJump < 650);

    // Direction calculation relative to camera yaw
    const fwdInput = (keys.current.forward ? 1 : 0) - (keys.current.backward ? 1 : 0);
    const sideInput = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0);

    const forwardX = -Math.sin(cameraYaw.current);
    const forwardZ = -Math.cos(cameraYaw.current);

    const rightX = Math.cos(cameraYaw.current);
    const rightZ = -Math.sin(cameraYaw.current);

    const moveDirection = new THREE.Vector3(
      forwardX * fwdInput + rightX * sideInput,
      0,
      forwardZ * fwdInput + rightZ * sideInput
    );

    const moving = moveDirection.lengthSq() > 0.01;
    setIsMoving(moving);
    setIsSprinting(keys.current.shift && moving);

    if (moving) {
      moveDirection.normalize();

      const speed = keys.current.shift ? SPRINT_SPEED : MOVE_SPEED;
      const targetVel = moveDirection.multiplyScalar(speed);

      // Frame-rate independent smooth acceleration
      const smoothFactor = 1.0 - Math.exp(-10.0 * Math.min(delta, 0.1));
      currentVelocity.current.lerp(targetVel, smoothFactor);

      // Natural avatar rotation facing movement direction
      const targetFacingAngle = Math.atan2(moveDirection.x, moveDirection.z);

      if (avatarGroupRef.current) {
        let diff = (targetFacingAngle - avatarGroupRef.current.rotation.y) % (Math.PI * 2);
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > Math.PI) diff -= Math.PI * 2;
        avatarGroupRef.current.rotation.y += diff * 0.18;
      }

      // Footstep sound timing
      const stepInterval = keys.current.shift ? 320 : 450;
      if (isGrounded.current && now - lastStepTime.current > stepInterval) {
        sound.playFootstep();
        lastStepTime.current = now;
      }

      // Apply controlled horizontal velocity while preserving natural gravity
      rigidBodyRef.current.setLinvel(
        {
          x: currentVelocity.current.x,
          y: linvel.y,
          z: currentVelocity.current.z
        },
        true
      );
    } else {
      // ── Anti-Slip Slope Lock ──
      currentVelocity.current.set(0, 0, 0);
      rigidBodyRef.current.setLinvel(
        {
          x: 0,
          y: linvel.y > 0 ? linvel.y : Math.max(linvel.y, -1.0),
          z: 0
        },
        true
      );
    }

    // ── Safe Jump Trigger with 450ms Cooldown (NO AIR FLYING) ──
    if (keys.current.jump && isGrounded.current && timeSinceLastJump > 450) {
      rigidBodyRef.current.setLinvel({ x: linvel.x, y: JUMP_FORCE, z: linvel.z }, true);
      sound.playJump();
      lastJumpTime.current = now;
      isGrounded.current = false;
      setIsJumpingState(true);
      keys.current.jump = false;
    }

    // ── Steadicam Gimbal 3rd Person Camera (ZERO SHAKING) ──
    if (cameraMode === 'third_person') {
      smoothLookTarget.current.x = THREE.MathUtils.lerp(smoothLookTarget.current.x, translation.x, 0.12);
      smoothLookTarget.current.y = THREE.MathUtils.lerp(smoothLookTarget.current.y, translation.y + 0.50, 0.06);
      smoothLookTarget.current.z = THREE.MathUtils.lerp(smoothLookTarget.current.z, translation.z, 0.12);

      const targetCamX =
        smoothLookTarget.current.x +
        cameraDistance.current * Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current);
      const targetCamY =
        smoothLookTarget.current.y + cameraDistance.current * Math.sin(cameraPitch.current);
      const targetCamZ =
        smoothLookTarget.current.z +
        cameraDistance.current * Math.cos(cameraYaw.current) * Math.cos(cameraPitch.current);

      smoothCamPos.current.x = THREE.MathUtils.lerp(smoothCamPos.current.x || targetCamX, targetCamX, 0.12);
      smoothCamPos.current.y = THREE.MathUtils.lerp(smoothCamPos.current.y || targetCamY, targetCamY, 0.06);
      smoothCamPos.current.z = THREE.MathUtils.lerp(smoothCamPos.current.z || targetCamZ, targetCamZ, 0.12);

      camera.position.copy(smoothCamPos.current);
      camera.lookAt(smoothLookTarget.current);
    }
  });

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        colliders={false}
        position={spawnPoint}
        enabledRotations={[false, false, false]}
        friction={0.8}
        restitution={0.0}
        linearDamping={4.0}
        angularDamping={2.0}
        ccd={true}
      >
        {/* Generous spherical bottom dome (Radius: 0.23m, Height: 0.82m) */}
        <CapsuleCollider args={[0.18, 0.23]} position={[0, 0.41, 0]} friction={0.8} />

        {/* 3D Animated Skinned Character Mesh */}
        <group ref={avatarGroupRef} position={[0, 0, 0]}>
          <Suspense fallback={null}>
            <AnimatedCharacter
              isMoving={isMoving}
              isSprinting={isSprinting}
              isJumping={isJumpingState}
            />
          </Suspense>
        </group>
      </RigidBody>
    </>
  );
}
