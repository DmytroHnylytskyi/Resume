'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { developerProfile } from '../../data/resumeData';
import { sound } from '../../utils/audio';
import { ExternalLink } from 'lucide-react';
import { PortalKey } from '../../types/scene';
import { getCategoryHeightScale, getCleanPartName } from './WorldScene';

interface PortalEntityProps {
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  portalKey?: PortalKey;
  colors?: Record<string, string>;
  playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
}

/**
 * Organic Interactive Portal Gate (Option A - Zelda/Elden Ring Style):
 * - Standardized 2.5m interaction trigger distance.
 * - Standardized MeshStandardMaterial: guarantees vibrant emissive glow on all portals (including MiniLMS).
 * - Smooth emissive highlight on proximity and hover.
 * - Direct click, keyboard [E], and walk-in teleport support.
 */
export default function PortalEntity({
  modelPath,
  position,
  rotation,
  scale,
  portalKey = 'terrascope',
  colors = {},
  playerPosRef
}: PortalEntityProps): React.ReactElement {
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

        const origMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
        let stdMat: THREE.MeshStandardMaterial;

        if (origMat instanceof THREE.MeshStandardMaterial) {
          stdMat = origMat.clone();
        } else {
          stdMat = new THREE.MeshStandardMaterial({
            color: (origMat as THREE.MeshBasicMaterial).color ? (origMat as THREE.MeshBasicMaterial).color.clone() : new THREE.Color(0xffffff),
            map: (origMat as THREE.MeshBasicMaterial).map || null,
            roughness: 0.5,
            metalness: 0.2
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
  const { setInteractionPrompt, clearInteractionPrompt, triggerPortalWarp } = useGameStore();

  const project = developerProfile.projects.find((p) => p.portalKey === portalKey) || developerProfile.projects[0];
  const themeColor = useMemo(() => new THREE.Color(project.themeColor), [project.themeColor]);

  const handleEnter = () => {
    sound.playWarp();
    triggerPortalWarp(project);
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
      const portalPos = new THREE.Vector3(...position);
      const dist = playerPosRef.current.distanceTo(portalPos);

      // Standardized close proximity: 2.5m EXACTLY
      if (dist < 2.5) {
        if (!isNear) {
          setIsNear(true);
          setInteractionPrompt({
            type: 'portal',
            title: `Портал: ${project.title}`,
            key: portalKey,
            action: handleEnter
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
      {/* ── Authentic 3D Architectural Gateway with Organic Hover/Proximity Emissive Glow ── */}
      <group scale={finalScale}>
        <primitive
          object={clonedScene}
          onClick={handleEnter}
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
          position={[0, 2.8, 0]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="portal-prompt-badge glass-card"
            onClick={handleEnter}
            style={{
              borderColor: project.themeColor,
              boxShadow: `0 0 25px ${project.themeColor}66`,
              cursor: 'pointer'
            }}
          >
            <div className="portal-badge-key" style={{ background: project.themeColor }}>
              E
            </div>
            <div className="portal-badge-content">
              <span className="portal-badge-tag">{project.badge}</span>
              <span className="portal-badge-title">{project.title}</span>
              <span className="portal-badge-hint">Натисніть [E] для переходу</span>
            </div>
            <ExternalLink size={16} color={project.themeColor} />
          </div>
        </Html>
      )}
    </group>
  );
}
