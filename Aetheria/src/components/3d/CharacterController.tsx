'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { sound } from '../../utils/audio';
import AnimatedCharacter from './AnimatedCharacter';

// Calibrated locomotion speeds for 0.82m avatar
const MOVE_SPEED = 3.2;
const SPRINT_SPEED = 6.4;
const JUMP_FORCE = 5.4;

interface CharacterControllerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  spawnPoint?: [number, number, number];
}

/**
 * Enhanced 3rd-Person Character Controller:
 * - Frictionless rounded capsule (0.82m height) allowing effortless gliding over stone steps.
 * - Exact ground alignment with animated boots firmly planted on the surface.
 * - Smooth camera follow with pleasant 2.6m distance.
 * - Auto-recovery on void falls.
 */
export default function CharacterController({
  playerPosRef,
  spawnPoint = [0.5, 10.2, -0.5]
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

  // Camera angles & distances
  const cameraYaw = useRef(0.35);
  const cameraPitch = useRef(0.22);
  const cameraDistance = useRef(2.6);

  // Smooth velocity lerp buffers
  const currentVelocity = useRef(new THREE.Vector3());
  const targetVelocity = useRef(new THREE.Vector3());

  const lastStepTime = useRef(0);
  const isGrounded = useRef(true);

  const { isRespawning, setIsRespawning, interactionPrompt, isWarping, cameraMode, activeModal } = useGameStore();

  // ── 1. Pointer Lock API ──
  useEffect(() => {
    const dom = gl.domElement;

    const handleCanvasClick = () => {
      if (!activeModal && document.pointerLockElement !== dom) {
        dom.requestPointerLock();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === dom) {
        const sensitivity = 0.0024;
        cameraYaw.current -= e.movementX * sensitivity;
        cameraPitch.current = Math.max(0.04, Math.min(1.15, cameraPitch.current + e.movementY * sensitivity));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      cameraDistance.current = Math.max(1.6, Math.min(7.5, cameraDistance.current + e.deltaY * 0.003));
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

    if (!Number.isFinite(translation.x) || !Number.isFinite(translation.y) || !Number.isFinite(translation.z)) {
      rigidBodyRef.current.setTranslation({ x: spawnPoint[0], y: spawnPoint[1], z: spawnPoint[2] }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Broadcast player coordinates
    if (playerPosRef) {
      playerPosRef.current = new THREE.Vector3(translation.x, translation.y, translation.z);
    }

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

    // Grounded detection
    isGrounded.current = Math.abs(linvel.y) < 1.2;
    setIsJumpingState(!isGrounded.current && Math.abs(linvel.y) > 1.8);

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
      targetVelocity.current.copy(moveDirection).multiplyScalar(speed);

      // Natural avatar rotation facing the movement direction
      const targetFacingAngle = Math.atan2(moveDirection.x, moveDirection.z);

      if (avatarGroupRef.current) {
        let diff = (targetFacingAngle - avatarGroupRef.current.rotation.y) % (Math.PI * 2);
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > Math.PI) diff -= Math.PI * 2;
        avatarGroupRef.current.rotation.y += diff * 0.18;
      }

      // Footstep sound timing
      const now = performance.now();
      const stepInterval = keys.current.shift ? 260 : 380;
      if (isGrounded.current && now - lastStepTime.current > stepInterval) {
        sound.playFootstep();
        lastStepTime.current = now;
      }
    } else {
      targetVelocity.current.set(0, 0, 0);
    }

    // ── Silky Smooth Velocity Lerp ──
    currentVelocity.current.lerp(targetVelocity.current, moving ? 0.24 : 0.32);

    rigidBodyRef.current.setLinvel(
      {
        x: currentVelocity.current.x,
        y: linvel.y,
        z: currentVelocity.current.z
      },
      true
    );

    // Jump trigger
    if (keys.current.jump && isGrounded.current) {
      rigidBodyRef.current.setLinvel({ x: linvel.x, y: JUMP_FORCE, z: linvel.z }, true);
      sound.playJump();
      keys.current.jump = false;
    }

    // ── 3rd Person Smooth Camera Following ──
    if (cameraMode === 'third_person') {
      const lookTarget = new THREE.Vector3(translation.x, translation.y + 0.50, translation.z);

      const cx =
        translation.x +
        cameraDistance.current * Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current);
      const cy =
        translation.y + 0.50 + cameraDistance.current * Math.sin(cameraPitch.current);
      const cz =
        translation.z +
        cameraDistance.current * Math.cos(cameraYaw.current) * Math.cos(cameraPitch.current);

      camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.16);
      camera.lookAt(lookTarget);
    }
  });

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        colliders={false}
        position={spawnPoint}
        enabledRotations={[false, false, false]}
        friction={0.0}
        restitution={0.0}
        linearDamping={0.2}
        angularDamping={1.0}
        ccd={true}
      >
        {/* Rounded friction-less capsule collider touching ground at Y=0 */}
        <CapsuleCollider args={[0.22, 0.16]} position={[0, 0.38, 0]} friction={0.0} />

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
