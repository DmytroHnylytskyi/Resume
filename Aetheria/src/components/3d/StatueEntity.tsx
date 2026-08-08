import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { sound } from '../../utils/audio';
import { User, Share2, Award, LucideIcon } from 'lucide-react';
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
    title: "Статуя Біографії (Про мене)",
    icon: User,
    badge: "Bio & Experience",
    color: "#38bdf8"
  },
  contacts: {
    title: "Статуя Зв'язку & Соцмереж",
    icon: Share2,
    badge: "Contacts & Links",
    color: "#34d399"
  },
  skills: {
    title: "Вівтар Навичок & Технологій",
    icon: Award,
    badge: "Skills Matrix",
    color: "#a855f7"
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
 * Interactive Statue Entity with exact 3D Furniture Store scaling,
 * bottom ground alignment, custom color mapping, and proximity prompt.
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
  const auraRef = useRef<THREE.Mesh>(null);

  const [isNear, setIsNear] = useState(false);
  const { setActiveModal, setInteractionPrompt, clearInteractionPrompt } = useGameStore();

  const info = STATUE_INFO[statueKey] || STATUE_INFO.bio;

  const handleOpen = () => {
    sound.playStatueChime();
    setActiveModal(statueKey);
  };

  useFrame((state) => {
    if (auraRef.current) {
      const t = state.clock.getElapsedTime();
      auraRef.current.rotation.z = t * 0.4;
      auraRef.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.08);
    }

    if (playerPosRef && playerPosRef.current && groupRef.current) {
      const statuePos = new THREE.Vector3(...position);
      const dist = playerPosRef.current.distanceTo(statuePos);

      if (dist < 4.8) {
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
    <group ref={groupRef} position={position} rotation={rotation} scale={finalScale}>
      {/* 3D GLB Statue Mesh */}
      <primitive
        object={clonedScene}
        onClick={handleOpen}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      />

      {/* Ground Glowing Halo Ring at bottom ground level */}
      <mesh
        ref={auraRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
      >
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshBasicMaterial
          color={info.color}
          transparent
          opacity={isNear ? 0.85 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating 3D Proximity Badge with [E] prompt */}
      {isNear && (
        <Html
          position={[0, 2.2, 0]}
          center
          distanceFactor={15}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="statue-prompt-badge glass-card"
            onClick={handleOpen}
            style={{
              borderColor: info.color,
              boxShadow: `0 0 25px ${info.color}55`
            }}
          >
            <div className="badge-key" style={{ background: info.color }}>
              E
            </div>
            <div className="badge-content">
              <span className="badge-action">Взаємодіяти</span>
              <span className="badge-title">{info.badge}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
