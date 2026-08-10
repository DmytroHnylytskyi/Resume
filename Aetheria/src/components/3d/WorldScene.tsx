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
 * Normalizes any 3D model coordinates (mm, cm, dm, or meters)
 * to standard real-world METERS, identical to 3D Furniture Configurator.
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

  // Architectural structural items (walls, doors, windows, tiles, house components) -> keep 1:1 in meters!
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
  colliderType?: 'trimesh' | 'hull' | 'none';
}

/**
 * Exact PlaceableObject rendering pipeline from 3D Furniture Configurator:
 * - Clones base GLTF scene.
 * - Applies getCategoryHeightScale.
 * - Snaps bottom bounding box to Y=0 (clone.position.y -= box.min.y).
 * - Maps custom sub-part colors.
 * - Applies exact finalScale = scale * unitScale.
 */
function StaticProp({
  modelPath,
  position,
  rotation,
  scale,
  colors = {},
  colliderType = 'trimesh'
}: StaticPropProps): React.ReactElement {
  const { scene } = useGLTF(modelPath);

  const { clonedScene, unitScale } = useMemo(() => {
    const clone = scene.clone(true);
    const uScale = getCategoryHeightScale(modelPath, clone);

    const isTerrainOrStructure =
      modelPath.includes('island_') ||
      modelPath.includes('steps') ||
      modelPath.includes('bridge');

    const wrapper = new THREE.Group();
    wrapper.add(clone);

    // Snap bottom of 3D bounding box to Y=0 for props
    if (!isTerrainOrStructure) {
      const box = new THREE.Box3().setFromObject(wrapper);
      if (!box.isEmpty()) {
        clone.position.y -= box.min.y;
      }
    }

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

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

    return { clonedScene: clone, unitScale: uScale };
  }, [scene, modelPath]);

  const rawScale = Array.isArray(scale) ? scale[0] : (scale || 1);
  const finalScale = rawScale * unitScale;

  // Dynamic color application matching 3D Furniture Store
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

  const isWalkable =
    modelPath.includes('island_') ||
    modelPath.includes('steps') ||
    modelPath.includes('bridge') ||
    modelPath.includes('floor') ||
    modelPath.includes('stone_path');

  if (isWalkable && colliderType !== 'none') {
    return (
      <RigidBody
        type="fixed"
        colliders={false}
        position={position}
        rotation={rotation}
        friction={0.05}
        restitution={0.0}
      >
        <MeshCollider type={colliderType}>
          <group scale={finalScale}>
            <primitive object={clonedScene} />
          </group>
        </MeshCollider>
      </RigidBody>
    );
  }

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
 * Complete 3D Floating Archipelago World Scene with bedrock safety colliders
 * and invisible smooth incline stair ramps for effortless walking.
 */
export default function WorldScene({ playerPosRef }: WorldSceneProps): React.ReactElement {
  return (
    <group>
      {/* ── Solid Invisible Bedrock Safety Platforms for the 5 Main Islands ── */}
      {/* 1. Central Altar Island */}
      <RigidBody type="fixed" colliders={false} position={[0.5, 9.2, -0.5]} friction={0.05}>
        <CylinderCollider args={[0.8, 12.5]} />
      </RigidBody>

      {/* 2. Hero Statue Island */}
      <RigidBody type="fixed" colliders={false} position={[7.03, 9.0, 17.71]} friction={0.05}>
        <CylinderCollider args={[0.8, 7.5]} />
      </RigidBody>

      {/* 3. Lumina Island */}
      <RigidBody type="fixed" colliders={false} position={[-17.32, 4.0, -19.02]} friction={0.05}>
        <CylinderCollider args={[0.8, 7.5]} />
      </RigidBody>

      {/* 4. Forma 3D Cliff Island */}
      <RigidBody type="fixed" colliders={false} position={[-27.65, 5.8, -8.92]} friction={0.05}>
        <CylinderCollider args={[0.8, 9.5]} />
      </RigidBody>

      {/* 5. Oracle Island */}
      <RigidBody type="fixed" colliders={false} position={[-15.75, 9.0, 25.43]} friction={0.05}>
        <CylinderCollider args={[0.8, 9.0]} />
      </RigidBody>

      {/* ── Invisible Smooth Incline Stair Ramps (Butter-smooth climbing) ── */}
      {/* Long Staircase: Central Altar down to Lumina Island */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-7.0, 6.5, -8.3]}
        rotation={[-0.46, 0.81, 0]}
        friction={0.05}
      >
        <CuboidCollider args={[1.3, 0.15, 6.0]} />
      </RigidBody>

      {/* Short Staircase: Forma 3D Island Connection */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-22.86, 4.6, -12.21]}
        rotation={[0.42, 1.21, 0]}
        friction={0.05}
      >
        <CuboidCollider args={[1.2, 0.15, 1.8]} />
      </RigidBody>

      {/* Staircase: Lumina Island entrance */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-20.50, 3.50, -24.18]}
        rotation={[0.26, 1.09, 0]}
        friction={0.05}
      >
        <CuboidCollider args={[1.2, 0.15, 1.5]} />
      </RigidBody>

      {/* Smooth Incline Colliders for Rope Bridges */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[3.73, 9.08, 9.90]}
        rotation={[0, 0.26, 0]}
        friction={0.05}
      >
        <CuboidCollider args={[1.3, 0.12, 5.8]} />
      </RigidBody>

      <RigidBody
        type="fixed"
        colliders={false}
        position={[-6.45, 8.89, 19.61]}
        rotation={[0, -1.15, 0]}
        friction={0.05}
      >
        <CuboidCollider args={[1.3, 0.12, 5.8]} />
      </RigidBody>

      <RigidBody
        type="fixed"
        colliders={false}
        position={[-15.34, 4.11, -24.10]}
        rotation={[0.13, -0.81, 0.09]}
        friction={0.05}
      >
        <CuboidCollider args={[1.3, 0.12, 5.8]} />
      </RigidBody>

      {/* Deep Safety Nether Floor (so character never falls into infinity) */}
      <RigidBody type="fixed" colliders={false} position={[0, -10, 0]}>
        <CuboidCollider args={[150, 0.5, 150]} />
      </RigidBody>

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

        // ── 2. Interactive Project Portals ──
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
              colliderType="trimesh"
            />
          </Suspense>
        );
      })}
    </group>
  );
}
