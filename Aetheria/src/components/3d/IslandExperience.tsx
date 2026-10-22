'use client';

/**
 * IslandExperience — the entire 3D mode in one lazy chunk.
 *
 * Why this is a separate component: the page used to import LoadingScreen
 * statically, and that pulled `useProgress` from @react-three/drei (which in
 * turn pulls three), while MiniRadar pulled islandScene.json and the tactical
 * map into the classic bundle. As a result the classic resume downloaded
 * three.js and the whole map before its first render, even when the visitor
 * never opened 3D. The page now loads this module only when
 * viewMode === '3d', keeping the classic view light.
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
 * Short black curtain for the classic -> 3D transition: the warp/click has
 * already darkened the screen, and the 3D chunk may take hundreds of
 * milliseconds to load. Without it the classic page would flash in between.
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
