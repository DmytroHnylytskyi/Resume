'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
}

const STATUE_INFO: Record<StatueKey, StatueMeta> = {
  bio: {
    title: 'Статуя Біографії (Про мене)',
    icon: User,
    badge: 'Біографія & Досвід',
    color: '#38bdf8'
  },
  contacts: {
    title: "Статуя Зв'язку & Соцмереж",
    icon: Share2,
    badge: "Контакти & Зв'язок",
    color: '#34d399'
  },
  skills: {
    title: 'Вівтар Навичок & Технологій',
    icon: Award,
    badge: 'Стек & Навички',
    color: '#c084fc'
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
 * Organic Interactive Statue Entity (Option A - Zelda/Elden Ring Style):
 * - Zero floating shapes or artificial geometric clutter.
 * - Dynamic surface emissive glow when near (<2.5m) or hovering with mouse.
 * - Solid physical pedestal collider.
 * - Clean frosted-glass [E] badge appearing only within close proximity.
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

  const { clonedScene, unitScale, materialsList } = useMemo(() => {
    const clone = scene.clone(true);
    const uScale = getCategoryHeightScale(modelPath, clone);
    const mats: THREE.MeshStandardMaterial[] = [];

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
        mats.push(mat);
      }
    });

    return { clonedScene: wrapper, unitScale: uScale, materialsList: mats };
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

  const [isNear, setIsNear] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const currentGlow = useRef(0);
  const { setActiveModal, setInteractionPrompt, clearInteractionPrompt } = useGameStore();

  const info = STATUE_INFO[statueKey] || STATUE_INFO.bio;
  const themeColor = useMemo(() => new THREE.Color(info.color), [info.color]);

  const handleOpen = () => {
    sound.playStatueChime();
    setActiveModal(statueKey);
  };

  useFrame((state, delta) => {
    // ── Smooth Organic Emissive Rim Glow ──
    const targetGlow = isNear || isHovered ? 0.48 : 0.0;
    currentGlow.current = THREE.MathUtils.lerp(currentGlow.current, targetGlow, 0.12);

    if (materialsList.length > 0) {
      for (let i = 0; i < materialsList.length; i++) {
        const mat = materialsList[i];
        if (mat && 'emissive' in mat) {
          mat.emissive.copy(themeColor);
          mat.emissiveIntensity = currentGlow.current;
        }
      }
    }

    if (playerPosRef && playerPosRef.current) {
      const statuePos = new THREE.Vector3(...position);
      const dist = playerPosRef.current.distanceTo(statuePos);

      // Strict close proximity: 2.5m
      if (dist < 2.5) {
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

      {/* ── Authentic 3D Sculpt with Organic Hover/Proximity Emissive Glow ── */}
      <group scale={finalScale}>
        <primitive
          object={clonedScene}
          onClick={handleOpen}
          onPointerOver={() => {
            setIsHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setIsHovered(false);
            document.body.style.cursor = 'auto';
          }}
        />
      </group>

      {/* ── Minimalist Frosted-Glass [E] Prompt (Only in close 2.5m range) ── */}
      {isNear && (
        <Html
          position={[0, 2.4, 0]}
          center
          distanceFactor={11}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="statue-prompt-badge glass-card"
            onClick={handleOpen}
            style={{
              borderColor: info.color,
              boxShadow: `0 0 25px ${info.color}55`,
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
            <Sparkles size={15} color={info.color} />
          </div>
        </Html>
      )}
    </group>
  );
}
