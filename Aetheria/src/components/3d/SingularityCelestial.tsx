'use client';

/**
 * SingularityCelestial — гравитационная сингулярность в небе игровой сцены.
 *
 * Это ДОСЛОВНЫЙ перенос ядра из классической версии: `GravitationalCoreMesh`
 * в src/components/singularity/SingularityBackground.tsx. Состав, пропорции,
 * наклоны, порядок отрисовки и настройки шейдеров повторяют его один в один —
 * если нужно сверить, сравнивать надо именно с той функцией, а не с этим
 * комментарием.
 *
 * Отличия от классического ядра ровно три, и все вынужденные:
 *
 *  1. Масштаб. Классика рисует ядро вплотную к камере (группа стоит на
 *     z ≈ −2.2, ядро r = 1.25), здесь оно висит небесным телом в 170 м.
 *     Все радиусы умножены на один множитель SINGULARITY_SCALE — пропорции
 *     классики сохранены, меняется только общий размер.
 *  2. Позиции и анимации прокрутки нет: в игре нет скролла, поэтому
 *     uScrollVelocity и uWarpProgress всегда 0, а группа не смещается.
 *  3. Материалы получают КОПИЮ юниформов (UniformsUtils.clone) вместо общей
 *     ссылки, как в классике. В классическом коде `{ ...QuasarAccretionShader }`
 *     раздаёт один и тот же объект юниформов и диску, и гало, поэтому запись
 *     uRotationAngle «диска» и «гало» затирает друг друга; здесь так не делаем,
 *     но на вид это не влияет — разница только в фазе вращения узора.
 *
 * Патчей шейдера здесь больше нет: полоса, плотность и прозрачность берутся
 * стоковые, как в классике.
 *
 * Шейдерные материалы обходят ACES-тонмаппинг (у ShaderMaterial нет
 * tonemapping-чанка), поэтому яркость диска задана в «сырых» цветах квазара
 * и не требует пересчёта экспозиции сцены.
 *
 * Роя падающих частиц (InfallStarfield) здесь нет намеренно: искры, крутившиеся
 * вплотную вокруг дыры, читались локальным гиммиком и подчёркивали, что всё
 * остальное небо пустое. Вместо них пыль размазана по всему небу — CosmicDust.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  QuasarAccretionShader,
  QuasarHorizonShader
} from '../singularity/shaders/QuasarSingularityShader';
import { getNightFactor } from '../../store/dayNightState';
import { visualQuality } from '../../store/debugState';

// Пропорции классического ядра (ядро 1.25 / кайма 1.32 / диск 1.34..5.8 /
// гало 1.32..4.4) домножены на общий множитель.
//
// Сейчас ×1.8: ядро 18 вместо 1.25, диск до 83.5 — при дистанции 170 м это
// ядро ~12.1° углового диаметра.
//
// Множитель — это ещё и ограничитель по геометрии, и оба ограничения
// проверяются на нём. Ближняя кромка диска уходит вглубь карты линейно, но её
// высота растёт вместе с посадкой (см. SINGULARITY_POS): на нынешних 18° при
// ×1.8 она проходит в ~37 м — с большим запасом над башнями хаба. Видимая
// кромка гало опускается под горизонт всего на ~4°; на ×3 это было 18° и было
// единственным, что действительно лезло ниже горизонта.
const SINGULARITY_SCALE = 1.8;
// ×8 — перевод классических единиц в мировые: классика рисует ядро вплотную к
// камере (r = 1.25 при группе на z ≈ −2.2), в игре оно висит в 170 м. Это НЕ
// часть регулятора размера и меняться не должно; SINGULARITY_SCALE — отдельный
// множитель поверх него.
const CLASSIC_TO_WORLD = 8;
const S = CLASSIC_TO_WORLD * SINGULARITY_SCALE;
const CORE_R = 1.25 * S;
const HORIZON_R = 1.32 * S;
const DISK_INNER = 1.34 * S;
const DISK_OUTER = 5.8 * S;
// У гало внутренний радиус 1.32, а не 1.34: в классике оно начинается вровень
// с каймой фотонной сферы, а не с диском.
const HALO_INNER = 1.32 * S;
const HALO_OUTER = 4.4 * S;

// Сегментация как в классике: 48 у сфер, 80 у колец. На low-пресете —
// вдвое реже: диск всё равно рисуется аддитивным шейдером, где силуэт
// важнее полигональной плотности.
const SPHERE_SEGMENTS = visualQuality.richEffects ? 48 : 24;
const RING_SEGMENTS = visualQuality.richEffects ? 80 : 48;

function makeAccretionMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    ...QuasarAccretionShader,
    // Копия юниформов перекрывает ту, что пришла со спредом (иначе диск и гало
    // делили бы один объект — см. пункт 3 в шапке файла).
    uniforms: THREE.UniformsUtils.clone(QuasarAccretionShader.uniforms),
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

function makeHorizonMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    ...QuasarHorizonShader,
    uniforms: THREE.UniformsUtils.clone(QuasarHorizonShader.uniforms),
    side: THREE.FrontSide
  });
}

/** Сингулярность: непрерывная анимация значений, без React-ререндеров. */
export default function SingularityCelestial({ position }: { position: THREE.Vector3 }): React.ReactElement {
  const diskMaterial = useMemo(makeAccretionMaterial, []);
  const haloMaterial = useMemo(makeAccretionMaterial, []);
  const horizonMaterial = useMemo(makeHorizonMaterial, []);

  const rotationAngle = useRef(0);
  const elapsed = useRef(0);

  useEffect(
    () => () => {
      diskMaterial.dispose();
      haloMaterial.dispose();
      horizonMaterial.dispose();
    },
    [diskMaterial, haloMaterial, horizonMaterial]
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    // Базовая скорость 0.12 рад/с — как в классике без прокрутки; гало идёт
    // на 0.75 от неё (в классике та же связка).
    rotationAngle.current += delta * 0.12;
    elapsed.current += delta;
    const dayFactor = 1 - getNightFactor();

    diskMaterial.uniforms.uTime.value = elapsed.current;
    diskMaterial.uniforms.uRotationAngle.value = rotationAngle.current;
    diskMaterial.uniforms.uScrollVelocity.value = 0;
    diskMaterial.uniforms.uDayNightFactor.value = dayFactor;
    diskMaterial.uniforms.uWarpProgress.value = 0;

    haloMaterial.uniforms.uTime.value = elapsed.current;
    haloMaterial.uniforms.uRotationAngle.value = rotationAngle.current * 0.75;
    haloMaterial.uniforms.uScrollVelocity.value = 0;
    haloMaterial.uniforms.uDayNightFactor.value = dayFactor;
    haloMaterial.uniforms.uWarpProgress.value = 0;

    horizonMaterial.uniforms.uDayNightFactor.value = dayFactor;
    horizonMaterial.uniforms.uWarpProgress.value = 0;
  });

  return (
    <group name="SingularityCelestial" position={position}>
      {/* ── 1. Горизонт событий: чисто чёрное ядро ── */}
      <mesh>
        <sphereGeometry args={[CORE_R, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
      </mesh>

      {/* ── 2. Фотонная сфера: френель-кайма ── */}
      <mesh material={horizonMaterial}>
        <sphereGeometry args={[HORIZON_R, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
      </mesh>

      {/* ── 3. Экваториальный аккреционный диск ── */}
      <group rotation={[-Math.PI / 2 + 0.18, 0, 0]}>
        <mesh material={diskMaterial} renderOrder={10}>
          <ringGeometry args={[DISK_INNER, DISK_OUTER, RING_SEGMENTS, 1]} />
        </mesh>
      </group>

      {/* ── 4. Гравитационно-линзовое вертикальное гало ── */}
      <group rotation={[0, 0, Math.PI * 0.48]}>
        <mesh material={haloMaterial} renderOrder={11}>
          <ringGeometry args={[HALO_INNER, HALO_OUTER, RING_SEGMENTS, 1]} />
        </mesh>
      </group>
    </group>
  );
}
