import React, { useMemo, useEffect, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody, MeshCollider, CylinderCollider, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import rawIslandSceneData from '../../data/islandScene.json';
import { IslandSceneData, PlacedObject } from '../../types/scene';
import StatueEntity from './StatueEntity';
import PortalEntity from './PortalEntity';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

/**
 * Normalizes any 3D model coordinates to standard real-world METERS.
 */
export function getUnitScale(scene: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim <= 0) return 1;
  if (maxDim > 1000) return 1 / 1000;
  if (maxDim > 100) return 1 / 100;
  if (maxDim > 10) return 1 / 10;
  return 1;
}

/**
 * Applies exact category height scaling from 3D Furniture Configurator.
 */
export function getCategoryHeightScale(modelPath: string, scene: THREE.Object3D): number {
  const unitScale = getUnitScale(scene);
  const file = (modelPath || '').toLowerCase();

  // Architectural structural items -> keep 1:1 in meters
  if (
    file.includes('wall') ||
    file.includes('door') ||
    file.includes('window') ||
    file.includes('floor') ||
    file.includes('roof') ||
    file.includes('gothic') ||
    file.includes('house_')
  ) {
    return unitScale;
  }

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const h = size.y;

  if (h <= 0) return unitScale;

  let targetH = 1.0;
  if (file.includes('sofa')) targetH = 0.75;
  else if (file.includes('chair') || file.includes('pouf') || file.includes('stool')) targetH = 0.8;
  else if (file.includes('dining table')) targetH = 0.75;
  else if (file.includes('coffee table')) targetH = 0.45;
  else if (file.includes('tv stand')) targetH = 0.45;
  else if (file.includes('tv')) targetH = 0.7;
  else if (file.includes('bookshelf') || file.includes('sideboard')) targetH = 1.5;
  else if (file.includes('floor lamp')) targetH = 1.4;
  else if (file.includes('table lamp')) targetH = 0.45;
  else if (file.includes('plant')) targetH = 0.8;
  else if (file.includes('carpet')) targetH = 0.02;
  else if (file.includes('monitor')) targetH = 0.55;
  else if (file.includes('painting')) targetH = 1.2;

  return targetH / h;
}

/**
 * Sanitizes mesh name to extract base part identifier.
 */
export function getCleanPartName(mesh: THREE.Mesh): string {
  const name = mesh.name || (mesh.material as THREE.Material)?.name || 'part';
  return name.split('_')[0];
}

interface StaticPropProps {
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  colors?: Record<string, string>;
}

/**
 * High-Performance StaticProp:
 * - Islands and stone steps use exact trimesh physics.
 * - Bridges use clean floor-only physics (no handrail/post invisible wall snagging).
 * - Trees use compact trunk cylinders.
 * - Bushes and decorative props have zero physics overhead.
 */
function StaticProp({
  modelPath,
  position,
  rotation,
  scale,
  colors = {}
}: StaticPropProps): React.ReactElement {
  const { scene } = useGLTF(modelPath);

  const isIsland = modelPath.includes('island_');
  const isStairs = modelPath.includes('steps');
  const isBridge = modelPath.includes('bridge');
  const isTree = modelPath.includes('tree');
  const isBush = modelPath.includes('bush');

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
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = !isBush && !isTree;
        mesh.receiveShadow = true;
        mesh.frustumCulled = true;

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
              mat.side = THREE.DoubleSide;
              if ('roughness' in mat) mat.roughness = 0.65;
              if ('metalness' in mat) mat.metalness = 0.12;
            }
          });
        }

        const partKey = getCleanPartName(mesh);
        mesh.userData.partName = partKey;
      }
    });

    return { clonedScene: wrapper, unitScale: uScale };
  }, [scene, modelPath, isBush, isTree]);

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
  }, [clonedScene, colors]);

  // 1. Islands & Stone Steps (Exact trimesh collision)
  if (isIsland || isStairs) {
    return (
      <RigidBody
        type="fixed"
        colliders={false}
        position={position}
        rotation={rotation}
        friction={0.0}
        restitution={0.0}
      >
        <MeshCollider type="trimesh">
          <group scale={finalScale}>
            <primitive object={clonedScene} />
          </group>
        </MeshCollider>
      </RigidBody>
    );
  }

  // 2. Bridges: Trimesh with zero friction
  if (isBridge) {
    return (
      <RigidBody
        type="fixed"
        colliders={false}
        position={position}
        rotation={rotation}
        friction={0.0}
        restitution={0.0}
      >
        <MeshCollider type="trimesh">
          <group scale={finalScale}>
            <primitive object={clonedScene} />
          </group>
        </MeshCollider>
      </RigidBody>
    );
  }

  // 3. Solid Tree Trunks (Compact cylinder)
  if (isTree) {
    return (
      <group position={position} rotation={rotation}>
        <RigidBody type="fixed" colliders={false} position={[0, 1.2, 0]}>
          <CylinderCollider args={[1.2, 0.35]} />
        </RigidBody>
        <group scale={finalScale}>
          <primitive object={clonedScene} />
        </group>
      </group>
    );
  }

  // 4. Decorative Props & Bushes
  return (
    <group position={position} rotation={rotation} scale={finalScale}>
      <primitive object={clonedScene} />
    </group>
  );
}

interface WorldSceneProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
}

/**
 * Complete 3D Floating Archipelago World Scene
 */
export default function WorldScene({ playerPosRef }: WorldSceneProps): React.ReactElement {
  return (
    <group>
      {/* ── Placed Scene Objects from islandScene.json ── */}
      {islandSceneData.placedObjects.map((obj: PlacedObject) => {
        const { id, modelPath, position, rotation, scale, type, statueKey, portalKey, colors } = obj;

        // ── 1. Interactive Resume Statues ──
        if (type === 'statue' || modelPath.includes('statue_') || statueKey) {
          const resolvedKey =
            statueKey ||
            (modelPath.includes('statue_bio')
              ? 'bio'
              : modelPath.includes('statue_social')
              ? 'contacts'
              : 'skills');

          return (
            <Suspense key={id} fallback={null}>
              <StatueEntity
                modelPath={modelPath}
                position={position}
                rotation={rotation}
                scale={scale}
                statueKey={resolvedKey}
                colors={colors}
                playerPosRef={playerPosRef}
              />
            </Suspense>
          );
        }

        // ── 2. Interactive Project Portals (Free walk-through, no blocking walls) ──
        if (type === 'portal' || modelPath.includes('portal_') || portalKey) {
          const resolvedPortalKey =
            portalKey ||
            (modelPath.includes('GlobeScope')
              ? 'terrascope'
              : modelPath.includes('3D_Furniture')
              ? 'forma'
              : 'lumina');

          return (
            <Suspense key={id} fallback={null}>
              <PortalEntity
                modelPath={modelPath}
                position={position}
                rotation={rotation}
                scale={scale}
                portalKey={resolvedPortalKey}
                colors={colors}
                playerPosRef={playerPosRef}
              />
            </Suspense>
          );
        }

        // ── 3. Islands, Bridges, Stairs, Trees, Architecture & Furniture Props ──
        return (
          <Suspense key={id} fallback={null}>
            <StaticProp
              modelPath={modelPath}
              position={position}
              rotation={rotation}
              scale={scale}
              colors={colors}
            />
          </Suspense>
        );
      })}
    </group>
  );
}
