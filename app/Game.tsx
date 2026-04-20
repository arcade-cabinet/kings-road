import { useEffect } from 'react';
import { ErrorBoundary as GameErrorBoundary } from '@app/ErrorBoundary';
import { GameScene } from '@app/scene/GameScene';
import { DeathOverlay } from '@app/views/DeathOverlay';
import { DialogueBox } from '@app/views/Gameplay/DialogueBox';
import { DiegeticLayer } from '@app/views/Gameplay/DiegeticLayer';
import { FunctionalHud } from '@app/views/Gameplay/FunctionalHud';
import { GameplayFrame } from '@app/views/Gameplay/GameplayFrame';
import { InventoryScreen } from '@app/views/Gameplay/InventoryScreen';
import { LoadingOverlay } from '@app/views/Gameplay/LoadingOverlay';
import { RegionBanner } from '@app/views/Gameplay/RegionBanner';
import { MainMenu } from '@app/views/MainMenu/MainMenu';
import { PauseMenu } from '@app/views/Gameplay/PauseMenu';
import { QuestLog } from '@app/views/Gameplay/QuestLog';
import { useTrait } from 'koota/react';
import { InventoryUI } from '@/ecs/traits/session-inventory';
import { getSessionEntity } from '@/ecs/world';
import { getFlags, setTabHidden } from '@/ecs/actions/game';
import { isInventoryOpen } from '@/ecs/actions/inventory-ui';
import { useFlags } from '@/ecs/hooks/useGameSession';
import { TouchOverlay } from '@/input/providers/TouchProvider';
import { useInputManager } from '@/input/useInputManager';

/**
 * Walk up from the touch target looking for an element that is actually
 * scrollable (overflow-y auto/scroll AND content that overflows). Returns
 * that element if found, null otherwise. Used by the touchmove guard to
 * let modal pages like SettingsPanel and PauseMenu still finger-scroll
 * on mobile while the 3D canvas below stays locked.
 */
function findScrollableAncestor(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function Game() {
  // Register all input providers (keyboard/mouse, gamepad, touch)
  useInputManager();

  const { gameActive, paused, inDialogue, inCombat } = useFlags();
  const inventoryOpen = useTrait(getSessionEntity(), InventoryUI)?.isOpen ?? false;

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
      const flags = getFlags();
      const invOpen = isInventoryOpen();
      if (
        flags.gameActive &&
        !flags.paused &&
        !flags.inDialogue &&
        !flags.inCombat &&
        !invOpen
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

  // Pause the simulation when the tab is backgrounded. rAF already throttles
  // to ~1Hz in background tabs, but useFrame callbacks still run — without
  // this flag, velocity × clamped-delta accumulates over the background
  // interval and the player teleports on resume (bug #21).
  useEffect(() => {
    const syncTabHidden = () => setTabHidden(document.hidden);
    syncTabHidden();
    document.addEventListener('visibilitychange', syncTabHidden);
    return () => {
      document.removeEventListener('visibilitychange', syncTabHidden);
      setTabHidden(false);
    };
  }, []);

  // Prevent default touch behaviors — kills the overscroll bounce /
  // pull-to-refresh / pinch-zoom on the 3D canvas and gesture joystick.
  // Allows the event through for:
  //   - buttons (tap targets)
  //   - scrollable ancestors (overflow-y: auto/scroll with overflowing
  //     content) so modal pages like SettingsPanel, PauseMenu save-slot
  //     list, and InventoryScreen can still finger-scroll on touch.
  useEffect(() => {
    const preventDefaults = (e: TouchEvent) => {
      if (!(e.target instanceof HTMLElement)) {
        e.preventDefault();
        return;
      }
      if (e.target.closest('button')) return;
      if (findScrollableAncestor(e.target)) return;
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
      <RegionBanner />

      {/*
        Diegetic gameplay HUD: minimal top band (region fade-in + pause quill),
        no persistent health/stamina bars, no minimap, no keyboard prompts.
        Surface-specific overlays (combat, dialogue, quest log, inventory)
        render inside the frame so they share safe-area padding.
      */}
      <GameplayFrame>
        {/*
          Functional HUD — health bar, stamina bar, crosshair, quest +
          pause + inventory buttons. Replaces the pure diegetic affordance
          pips for on-device playtest readability. DiegeticLayer still
          runs alongside for the body-sense feedback (wound vignette,
          heartbeat, combat hit flash) which layers on top as atmosphere.
        */}
        <FunctionalHud />
        <DiegeticLayer />
        {/* Dialogue — illuminated-manuscript HTML overlay. An in-Canvas
            billboard variant may replace this later but this is the
            production dialogue surface, not a fallback. */}
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
