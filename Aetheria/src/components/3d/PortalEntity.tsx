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
 * Clean & Uncluttered Dimensional Portal Gate:
 * - Pure 3D stone gateway with soft inner vortex (no giant light cylinders).
 * - Strict close proximity trigger (2.8m).
 * - Smooth teleport on interaction.
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
        const mesh = child as THREE.Mesh;
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        if (mat && mat.color) {
          const customColor = colors[child.userData.partName];
          if (customColor) {
            mat.color.set(customColor);
          } else if (mesh.userData.originalColor) {
            mat.color.copy(mesh.userData.originalColor);
          }
        }
      }
    });
  }, [colors, clonedScene]);

  const vortexRef = useRef<THREE.Mesh>(null);
  const [isNear, setIsNear] = useState(false);
  const { setInteractionPrompt, clearInteractionPrompt, triggerPortalWarp } = useGameStore();

  const project = developerProfile.projects.find((p) => p.portalKey === portalKey) || developerProfile.projects[0];

  const handleEnter = () => {
    sound.playWarp();
    triggerPortalWarp(project);
  };

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (vortexRef.current) {
      vortexRef.current.rotation.z = t * 1.2;
    }

    if (playerPosRef && playerPosRef.current) {
      const portalPos = new THREE.Vector3(...position);
      const dist = playerPosRef.current.distanceTo(portalPos);

      // Strict close proximity: 2.8m
      if (dist < 2.8) {
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
      {/* ── 3D Architectural Gateway (Clean & uncluttered) ── */}
      <group scale={finalScale}>
        <primitive object={clonedScene} />
      </group>

      {/* ── Subtle Portal Center Disc ── */}
      <mesh ref={vortexRef} position={[0, 1.8, 0]}>
        <circleGeometry args={[1.05, 32]} />
        <meshStandardMaterial
          color={project.themeColor}
          emissive={project.themeColor}
          emissiveIntensity={isNear ? 2.5 : 1.4}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Floating Proximity Badge (Only in 2.8m range) ── */}
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
