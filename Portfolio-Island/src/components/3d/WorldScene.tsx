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

    const wrapper = new THREE.Group();
    wrapper.add(clone);

    // Snap bottom of 3D bounding box to Y=0 so no object sinks under floor
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

  // Dynamic color application matching 3D Furniture Store
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

  if (colliderType === 'none') {
    return (
      <group position={position} rotation={rotation} scale={finalScale}>
        <primitive object={clonedScene} />
      </group>
    );
  }

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
      rotation={rotation}
      scale={finalScale}
    >
      <MeshCollider type={colliderType}>
        <primitive object={clonedScene} />
      </MeshCollider>
    </RigidBody>
  );
}

interface WorldSceneProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
}

/**
 * Complete 3D Floating Archipelago World Scene with bedrock safety colliders.
 */
export default function WorldScene({ playerPosRef }: WorldSceneProps): React.ReactElement {
  return (
    <group>
      {/* ── Solid Invisible Bedrock Safety Platforms for the 5 Main Islands ── */}
      {/* 1. Central Altar Island */}
      <RigidBody type="fixed" colliders={false} position={[0.5, 9.2, -0.5]}>
        <CylinderCollider args={[0.8, 12.5]} />
      </RigidBody>

      {/* 2. Hero Statue Island */}
      <RigidBody type="fixed" colliders={false} position={[7.03, 9.0, 17.71]}>
        <CylinderCollider args={[0.8, 7.5]} />
      </RigidBody>

      {/* 3. MiniLMS Island */}
      <RigidBody type="fixed" colliders={false} position={[-17.32, 4.0, -19.02]}>
        <CylinderCollider args={[0.8, 7.5]} />
      </RigidBody>

      {/* 4. 3D Furniture Store Cliff Island */}
      <RigidBody type="fixed" colliders={false} position={[-27.65, 5.8, -8.92]}>
        <CylinderCollider args={[0.8, 9.5]} />
      </RigidBody>

      {/* 5. Oracle Island */}
      <RigidBody type="fixed" colliders={false} position={[-15.75, 9.0, 25.43]}>
        <CylinderCollider args={[0.8, 9.0]} />
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
              ? 'globescope'
              : modelPath.includes('3D_Furniture')
              ? 'furniture'
              : 'minilms');

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

        // ── 3. Walkable Archipelago Terrain & Props ──
        const isWalkableTerrain =
          modelPath.includes('island_base') ||
          modelPath.includes('stone_steps') ||
          modelPath.includes('rope_bridge') ||
          modelPath.includes('house_stone_path') ||
          modelPath.includes('floorpattern') ||
          modelPath.includes('house_balconny');

        const colliderType: 'trimesh' | 'hull' | 'none' = isWalkableTerrain
          ? 'trimesh'
          : modelPath.includes('magic_tree')
          ? 'hull'
          : 'none';

        return (
          <Suspense key={id} fallback={null}>
            <StaticProp
              modelPath={modelPath}
              position={position}
              rotation={rotation}
              scale={scale}
              colors={colors}
              colliderType={colliderType}
            />
          </Suspense>
        );
      })}
    </group>
  );
}
