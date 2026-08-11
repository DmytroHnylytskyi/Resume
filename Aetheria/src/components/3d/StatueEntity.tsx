'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { sound } from '../../utils/audio';
import { User, Share2, Award, LucideIcon, Sparkles } from 'lucide-react';
import { StatueKey } from '../../types/scene';
import { getCategoryHeightScale, getCleanPartName } from './WorldScene';

interface StatueMeta {
  title: string;
  icon: LucideIcon;
  badge: string;
  color: string;
  lightColor: string;
}

const STATUE_INFO: Record<StatueKey, StatueMeta> = {
  bio: {
    title: 'Статуя Біографії (Про мене)',
    icon: User,
    badge: 'Біографія & Досвід',
    color: '#38bdf8',
    lightColor: '#0ea5e9'
  },
  contacts: {
    title: "Статуя Зв'язку & Соцмереж",
    icon: Share2,
    badge: "Контакти & Зв'язок",
    color: '#34d399',
    lightColor: '#10b981'
  },
  skills: {
    title: 'Вівтар Навичок & Технологій',
    icon: Award,
    badge: 'Стек & Навички',
    color: '#c084fc',
    lightColor: '#a855f7'
  }
};

interface StatueEntityProps {
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  statueKey?: StatueKey;
  colors?: Record<string, string>;
  playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
}

/**
 * Enhanced Interactive Statue Entity:
 * - High-visibility celestial light beacon visible from across the map.
 * - Rotating dual concentric ground rune circles with pulsating glow.
 * - Thematic dynamic point light illuminating the 3D sculpt.
 * - Floating interactive waypoint and [E] proximity modal opener.
 */
export default function StatueEntity({
  modelPath,
  position,
  rotation,
  scale,
  statueKey = 'bio',
  colors = {},
  playerPosRef
}: StatueEntityProps): React.ReactElement {
  const { scene } = useGLTF(modelPath);

  const { clonedScene, unitScale } = useMemo(() => {
    const clone = scene.clone(true);
    const uScale = getCategoryHeightScale(modelPath, clone);

    const wrapper = new THREE.Group();
    wrapper.add(clone);

    // Snap bottom of bounding box to Y=0
    const box = new THREE.Box3().setFromObject(wrapper);
    if (!box.isEmpty()) {
      clone.position.y -= box.min.y;
    }

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }

        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData.originalColor = mat.color ? mat.color.clone() : new THREE.Color(0xffffff);
        mesh.userData.partName = getCleanPartName(mesh);
      }
    });

    return { clonedScene: wrapper, unitScale: uScale };
  }, [scene, modelPath]);

  const rawScale = Array.isArray(scale) ? scale[0] : (scale || 1);
  const finalScale = rawScale * unitScale;

  // Apply colors from islandScene.json
  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.userData.partName) {
        const part = child.userData.partName;
        if (colors[part]) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const mat = (mesh.material as THREE.Material).clone();
            if ('color' in mat) {
              (mat as THREE.MeshStandardMaterial).color.set(colors[part]);
            }
            mesh.material = mat;
          }
        }
      }
    });
  }, [colors, clonedScene]);

  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const diamondRef = useRef<THREE.Group>(null);
  const [isNear, setIsNear] = useState(false);
  const { setActiveModal, setInteractionPrompt, clearInteractionPrompt } = useGameStore();

  const info = STATUE_INFO[statueKey] || STATUE_INFO.bio;
  const Icon = info.icon;

  const handleOpen = () => {
    sound.playStatueChime();
    setActiveModal(statueKey);
  };

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.4;
      ring1Ref.current.scale.setScalar(1 + Math.sin(t * 2.0) * 0.06);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.25;
      ring2Ref.current.scale.setScalar(1 + Math.cos(t * 1.8) * 0.05);
    }
    if (beaconRef.current) {
      beaconRef.current.scale.y = 1 + Math.sin(t * 1.5) * 0.12;
    }
    if (diamondRef.current) {
      diamondRef.current.position.y = 3.8 + Math.sin(t * 2.2) * 0.18;
      diamondRef.current.rotation.y = t * 1.2;
    }

    if (playerPosRef && playerPosRef.current) {
      const statuePos = new THREE.Vector3(...position);
      const dist = playerPosRef.current.distanceTo(statuePos);

      // Generous 7.0m proximity radius
      if (dist < 7.0) {
        if (!isNear) {
          setIsNear(true);
          setInteractionPrompt({
            type: 'statue',
            title: info.title,
            key: statueKey,
            action: handleOpen
          });
        }
      } else {
        if (isNear) {
          setIsNear(false);
          clearInteractionPrompt();
        }
      }
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* ── Solid Pedestal Collider ── */}
      <RigidBody type="fixed" colliders={false} position={[0, 0.7, 0]}>
        <CylinderCollider args={[0.7, 0.9]} />
      </RigidBody>

      {/* ── 3D Sculpt Mesh ── */}
      <group scale={finalScale}>
        <primitive
          object={clonedScene}
          onClick={handleOpen}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        />
      </group>

      {/* ── Thematic Point Light Illuminating the Statue ── */}
      <pointLight
        position={[0, 2.8, 0]}
        color={info.lightColor}
        intensity={isNear ? 5.5 : 3.2}
        distance={9.0}
        decay={2}
      />

      {/* ── 1. Vertical Celestial Light Pillar (Beacon) ── */}
      <mesh ref={beaconRef} position={[0, 4.5, 0]}>
        <cylinderGeometry args={[0.35, 1.1, 9.0, 16, 1, true]} />
        <meshBasicMaterial
          color={info.color}
          transparent
          opacity={isNear ? 0.38 : 0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── 2. Outer Rotating Rune Ring ── */}
      <mesh
        ref={ring1Ref}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.08, 0]}
      >
        <ringGeometry args={[1.3, 1.8, 32]} />
        <meshBasicMaterial
          color={info.color}
          transparent
          opacity={isNear ? 0.9 : 0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── 3. Inner Counter-Rotating Halo Ring ── */}
      <mesh
        ref={ring2Ref}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
      >
        <ringGeometry args={[0.8, 1.1, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={isNear ? 0.75 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── 4. Floating Rotating Diamond / Crystal Beacon ── */}
      <group ref={diamondRef} position={[0, 3.8, 0]}>
        <mesh>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color={info.color}
            emissive={info.color}
            emissiveIntensity={2.5}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* ── 5. Floating Interactive Proximity Badge ── */}
      {isNear && (
        <Html
          position={[0, 2.8, 0]}
          center
          distanceFactor={13}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="statue-prompt-badge glass-card"
            onClick={handleOpen}
            style={{
              borderColor: info.color,
              boxShadow: `0 0 35px ${info.color}77`,
              cursor: 'pointer'
            }}
          >
            <div className="badge-key" style={{ background: info.color }}>
              E
            </div>
            <div className="badge-content">
              <span className="badge-action">Взаємодіяти</span>
              <span className="badge-title">{info.badge}</span>
            </div>
            <Sparkles size={16} color={info.color} />
          </div>
        </Html>
      )}
    </group>
  );
}
