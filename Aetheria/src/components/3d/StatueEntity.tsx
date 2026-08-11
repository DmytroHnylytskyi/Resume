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
 * Organic Interactive Statue Entity (Zelda/Elden Ring Style):
 * - Geometric local centering: guarantees model sits precisely on placed coordinates.
 * - Vibrant surface emissive glow (0.80) when near (<2.5m) or hovering with mouse.
 * - Solid physical pedestal collider.
 * - Clean close-proximity [E] prompt.
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

    // Center X & Z and snap bottom Y directly to 0
    const box = new THREE.Box3().setFromObject(clone);
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      clone.position.x -= center.x;
      clone.position.z -= center.z;
      clone.position.y -= box.min.y;
    }

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Upgrade any material to MeshStandardMaterial to guarantee emissive lighting
        const origMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
        let stdMat: THREE.MeshStandardMaterial;

        if (origMat instanceof THREE.MeshStandardMaterial) {
          stdMat = origMat.clone();
        } else {
          stdMat = new THREE.MeshStandardMaterial({
            color: (origMat as THREE.MeshBasicMaterial).color ? (origMat as THREE.MeshBasicMaterial).color.clone() : new THREE.Color(0xffffff),
            map: (origMat as THREE.MeshBasicMaterial).map || null,
            roughness: 0.6,
            metalness: 0.15
          });
        }

        mesh.material = stdMat;
        mesh.userData.originalColor = stdMat.color.clone();
        mesh.userData.partName = getCleanPartName(mesh);
        mats.push(stdMat);
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
          if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).color) {
            (mesh.material as THREE.MeshStandardMaterial).color.set(colors[part]);
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

  useFrame(() => {
    // ── Smooth Organic Emissive Rim Glow ──
    const targetGlow = isNear || isHovered ? 0.80 : 0.0;
    currentGlow.current = THREE.MathUtils.lerp(currentGlow.current, targetGlow, 0.14);

    if (materialsList.length > 0) {
      for (let i = 0; i < materialsList.length; i++) {
        const mat = materialsList[i];
        if (mat) {
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
