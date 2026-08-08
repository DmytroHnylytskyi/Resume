import React, { useRef, useState, useMemo, useEffect } from 'react';
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
 * Interactive Dimensional Portal Gate with exact 3D Furniture Store rendering pipeline,
 * proximity detection, and modal transition.
 */
export default function PortalEntity({
  modelPath,
  position,
  rotation,
  scale,
  portalKey = 'globescope',
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

  const groupRef = useRef<THREE.Group>(null);
  const [isNear, setIsNear] = useState(false);

  const { triggerPortalWarp, setInteractionPrompt, clearInteractionPrompt } = useGameStore();

  const project =
    developerProfile.projects.find((p) => p.portalKey === portalKey) || developerProfile.projects[0];

  const handleEnterPortal = () => {
    sound.playWarp();
    triggerPortalWarp(project);
  };

  useFrame(() => {
    if (playerPosRef && playerPosRef.current && groupRef.current) {
      const portalPos = new THREE.Vector3(...position);
      const dist = playerPosRef.current.distanceTo(portalPos);

      if (dist < 4.5) {
        if (!isNear) {
          setIsNear(true);
          setInteractionPrompt({
            type: 'portal',
            title: `Портал: ${project.title}`,
            key: portalKey,
            action: handleEnterPortal
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
    <group ref={groupRef} position={position} rotation={rotation} scale={finalScale}>
      {/* 3D Portal Arch / Frame */}
      <primitive
        object={clonedScene}
        onClick={handleEnterPortal}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      />

      {/* Interactive 3D Floating Portal Badge */}
      {isNear && (
        <Html
          position={[0, 2.2, 0]}
          center
          distanceFactor={16}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="portal-prompt-badge glass-card"
            onClick={handleEnterPortal}
            style={{
              borderColor: project.themeColor,
              boxShadow: `0 0 30px ${project.themeColor}66`
            }}
          >
            <div className="portal-badge-header">
              <span className="badge-key" style={{ background: project.themeColor }}>
                E
              </span>
              <span className="portal-badge-tag">{project.badge}</span>
            </div>
            <div className="portal-badge-body">
              <span className="portal-badge-title">{project.title}</span>
              <span className="portal-badge-sub">Натисніть або підійдіть, щоб увійти</span>
            </div>
            <ExternalLink size={16} className="portal-badge-icon" />
          </div>
        </Html>
      )}
    </group>
  );
}
