'use client';

/**
 * IslandExperience — весь 3D-режим одним ленивым чанком.
 *
 * Зачем отдельный компонент: раньше страница статически импортировала
 * LoadingScreen (а тот — `useProgress` из @react-three/drei, который тянет
 * three) и MiniRadar (а тот — islandScene.json с тактической картой). Из-за
 * этого классическое резюме скачивало three.js и всю карту до первого рендера,
 * хотя 3D-режим мог вообще не открыться. Теперь страница грузит этот модуль
 * только при viewMode === '3d', а классика остаётся легкой.
 */

import React from 'react';
import LoadingScreen from '../ui/LoadingScreen';
import ControlsHUD from '../ui/ControlsHUD';
import BioModal from '../ui/BioModal';
import ContactsModal from '../ui/ContactsModal';
import SkillsModal from '../ui/SkillsModal';
import MiniRadar from '../ui/MiniRadar';
import MobileTouchControls from '../ui/MobileTouchControls';
import LandscapeOrientationGuard from '../ui/LandscapeOrientationGuard';
import DialogueHUD from '../ui/DialogueHUD';
import IslandCanvas from './IslandCanvas';

/**
 * Короткая черная шторка при переходе из классики: warp/клик уже затемнил
 * экран, а чанк 3D-сцены может грузиться сотни миллисекунд. Без неё на это
 * время мелькала бы классическая страница.
 */
function WormholeArrivalCurtain(): React.ReactElement | null {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        zIndex: 99998,
        pointerEvents: 'none',
        animation: 'wormholeReveal 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
      aria-hidden="true"
    />
  );
}

export default function IslandExperience(): React.ReactElement {
  return (
    <>
      {/* Smooth emergence curtain from black hole */}
      <WormholeArrivalCurtain />

      {/* Preloader overlay while 3D assets load */}
      <LoadingScreen />

      {/* 3D Canvas */}
      <IslandCanvas />

      {/* HUD Top Navigation & Floating [E] Interaction Pill */}
      <ControlsHUD />

      {/* Enforce Landscape Orientation on Mobile */}
      <LandscapeOrientationGuard />

      {/* Mobile Virtual Joystick & Touch Camera Controls */}
      <MobileTouchControls />

      {/* Circular Glass Mini-Radar & Island Tactical Map */}
      <MiniRadar />

      {/* Holographic Sci-Fi Dialogue HUD */}
      <DialogueHUD />

      {/* 3D Modal Windows */}
      <BioModal />
      <ContactsModal />
      <SkillsModal />
    </>
  );
}
