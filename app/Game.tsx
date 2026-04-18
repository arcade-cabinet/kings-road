import { useEffect } from 'react';
import { ErrorBoundary as GameErrorBoundary } from './ErrorBoundary';
import { GameScene } from './scene/GameScene';
import { CombatHUD } from './views/Gameplay/CombatHUD';
import { DeathOverlay } from './views/DeathOverlay';
import { DialogueBox } from './views/Gameplay/DialogueBox';
import { GameplayFrame } from './views/Gameplay/GameplayFrame';
import { InventoryScreen } from './views/Gameplay/InventoryScreen';
import { LoadingOverlay } from './views/Gameplay/LoadingOverlay';
import { MainMenu } from './views/MainMenu/MainMenu';
import { PauseMenu } from './views/Gameplay/PauseMenu';
import { QuestLog } from './views/Gameplay/QuestLog';
import { TouchOverlay } from '@/input/providers/TouchProvider';
import { useInputManager } from '@/input/useInputManager';
import { useGameStore } from '@/stores/gameStore';
import { useInventoryStore } from '@/stores/inventoryStore';

export function Game() {
  // Register all input providers (keyboard/mouse, gamepad, touch)
  useInputManager();

  const gameActive = useGameStore((s) => s.gameActive);
  const paused = useGameStore((s) => s.paused);
  const inDialogue = useGameStore((s) => s.inDialogue);
  const inCombat = useGameStore((s) => s.inCombat);
  const inventoryOpen = useInventoryStore((s) => s.isOpen);

  // Request pointer lock on click when game is active
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Don't request pointer lock if clicking a UI button
      if (
        e.target instanceof HTMLElement &&
        (e.target.closest('button') || e.target.closest('[role="button"]'))
      ) {
        return;
      }
      const state = useGameStore.getState();
      const inv = useInventoryStore.getState();
      if (
        state.gameActive &&
        !state.paused &&
        !state.inDialogue &&
        !state.inCombat &&
        !inv.isOpen
      ) {
        document.body.requestPointerLock().catch(() => {
          // Pointer lock can fail if document isn't focused or valid — safe to ignore
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Exit pointer lock when entering UI modes
  useEffect(() => {
    if (paused || inDialogue || inCombat || inventoryOpen || !gameActive) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [paused, inDialogue, inCombat, inventoryOpen, gameActive]);

  // Prevent default touch behaviors
  useEffect(() => {
    const preventDefaults = (e: TouchEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button')) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventDefaults, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventDefaults);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D Scene */}
      <GameErrorBoundary source="GameScene">
        <GameScene />
      </GameErrorBoundary>

      {/* UI Layers — ordered by z-stack (front-most last) */}
      <MainMenu />
      <LoadingOverlay />

      {/*
        Diegetic gameplay HUD: minimal top band (region fade-in + pause quill),
        no persistent health/stamina bars, no minimap, no keyboard prompts.
        Surface-specific overlays (combat, dialogue, quest log, inventory)
        render inside the frame so they share safe-area padding.
      */}
      <GameplayFrame>
        {/* Combat only renders when in combat; keeps wound decals diegetic */}
        <CombatHUD />
        {/* Dialogue — HTML fallback until the in-Canvas billboard lands */}
        <DialogueBox />
        {/* Inventory panel — triggered by belt tap */}
        <InventoryScreen />
        {/* Quest journal — triggered by journal tap */}
        <QuestLog />
      </GameplayFrame>

      {/* Top-level overlays outside GameplayFrame (take full screen) */}
      <PauseMenu />
      <DeathOverlay />

      {/* Invisible gesture zone — mobile touch input */}
      <TouchOverlay />
    </div>
  );
}

export default Game;
