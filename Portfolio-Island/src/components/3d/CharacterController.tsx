'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { sound } from '../../utils/audio';
import AnimatedCharacter from './AnimatedCharacter';

const MOVE_SPEED = 6.8;
const SPRINT_SPEED = 11.0;
const JUMP_FORCE = 6.5;

interface CharacterControllerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  spawnPoint?: [number, number, number];
}

/**
 * Enhanced 3rd-Person Character Controller with Pointer Lock:
 * - Native Mouse Pointer Lock (cursor disappears and directly rotates camera).
 * - Correct facing direction (walking forward shows her back, not her face).
 * - Silky smooth acceleration/deceleration lerp (zero abrupt snaps).
 * - Shortest-path rotational slerp for natural avatar turning.
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
  const [isLocked, setIsLocked] = useState(false);

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
  const cameraYaw = useRef(0.35); // Initial view over the island
  const cameraPitch = useRef(0.26); // Pleasant over-the-shoulder angle
  const cameraDistance = useRef(4.8);

  // Smooth velocity lerp buffers
  const currentVelocity = useRef(new THREE.Vector3());
  const targetVelocity = useRef(new THREE.Vector3());

  const lastStepTime = useRef(0);
  const isGrounded = useRef(true);

  const { isRespawning, setIsRespawning, interactionPrompt, isWarping, cameraMode, activeModal } = useGameStore();

  // ── 1. Pointer Lock API (Cursor Disappears & Free Mouse Look) ──
  useEffect(() => {
    const dom = gl.domElement;

    const handleCanvasClick = () => {
      // Only request pointer lock if no modal is active
      if (!activeModal && document.pointerLockElement !== dom) {
        dom.requestPointerLock();
      }
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === dom;
      setIsLocked(locked);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === dom) {
        // Direct responsive mouse-look sensitivity
        const sensitivity = 0.0024;
        cameraYaw.current -= e.movementX * sensitivity;
        cameraPitch.current = Math.max(0.04, Math.min(1.15, cameraPitch.current + e.movementY * sensitivity));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      cameraDistance.current = Math.max(2.5, Math.min(12.0, cameraDistance.current + e.deltaY * 0.004));
    };

    dom.addEventListener('click', handleCanvasClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    dom.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      dom.removeEventListener('click', handleCanvasClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
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

    // Broadcast player coordinates
    if (playerPosRef) {
      playerPosRef.current = new THREE.Vector3(translation.x, translation.y, translation.z);
    }

    // ── Void Fall Detection & Auto-Recovery ──
    if (translation.y < 1.0 && !isRespawning) {
      setIsRespawning(true);
      sound.playVoidWind();

      rigidBodyRef.current.setTranslation(
        { x: spawnPoint[0], y: spawnPoint[1] + 1.5, z: spawnPoint[2] },
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

    isGrounded.current = Math.abs(linvel.y) < 0.45;
    setIsJumpingState(!isGrounded.current);

    // Movement calculation relative to camera yaw
    // W = forward (into screen), S = backward, A = left, D = right
    const moveZ = (keys.current.forward ? -1 : 0) + (keys.current.backward ? 1 : 0);
    const moveX = (keys.current.left ? -1 : 0) + (keys.current.right ? 1 : 0);
    const inputVector = new THREE.Vector3(moveX, 0, moveZ);
    const moving = inputVector.lengthSq() > 0.01;

    setIsMoving(moving);
    setIsSprinting(keys.current.shift && moving);

    if (moving) {
      inputVector.normalize();

      // In three.js with camera behind player:
      // pressing W (moveZ = -1, moveX = 0) -> moveAngle = 0
      // targetDirection = cameraYaw + moveAngle
      const moveAngle = Math.atan2(inputVector.x, -inputVector.z);
      const targetFacingAngle = cameraYaw.current + moveAngle;

      const speed = keys.current.shift ? SPRINT_SPEED : MOVE_SPEED;
      const moveDirection = new THREE.Vector3(
        -Math.sin(targetFacingAngle),
        0,
        -Math.cos(targetFacingAngle)
      ).multiplyScalar(speed);

      targetVelocity.current.copy(moveDirection);

      // ── Natural Shortest-Angle Avatar Rotation ──
      if (avatarGroupRef.current) {
        let diff = (targetFacingAngle - avatarGroupRef.current.rotation.y) % (Math.PI * 2);
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > Math.PI) diff -= Math.PI * 2;
        avatarGroupRef.current.rotation.y += diff * 0.16;
      }

      // Footstep sound timing
      const now = performance.now();
      const stepInterval = keys.current.shift ? 240 : 360;
      if (isGrounded.current && now - lastStepTime.current > stepInterval) {
        sound.playFootstep();
        lastStepTime.current = now;
      }
    } else {
      targetVelocity.current.set(0, 0, 0);
    }

    // ── Silky Smooth Velocity Lerp (Zero Jerkiness) ──
    currentVelocity.current.lerp(targetVelocity.current, moving ? 0.18 : 0.25);

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
      const lookTarget = new THREE.Vector3(translation.x, translation.y + 0.95, translation.z);

      const cx =
        translation.x +
        cameraDistance.current * Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current);
      const cy =
        translation.y + 0.95 + cameraDistance.current * Math.sin(cameraPitch.current);
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
        friction={0.2}
        restitution={0.0}
        linearDamping={0.4}
        angularDamping={1.0}
        ccd={true}
      >
        {/* Human-scale capsule collider (Height: ~1.75m, Radius: 0.28m) */}
        <CapsuleCollider args={[0.55, 0.28]} position={[0, 0.85, 0]} />

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
