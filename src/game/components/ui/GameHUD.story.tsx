/**
 * Story wrappers for GameHUD — used by Playwright CT.
 *
 * GameHUD reads many fields from useGameStore including health, stamina,
 * timeOfDay, currentChunkName, etc. We set store state for different
 * visual states.
 */
import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { GameHUD } from './GameHUD';

/**
 * Full HUD with healthy player, daytime, in wilderness.
 */
export function GameHUDDefault() {
  useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      health: 85,
      stamina: 70,
      isSprinting: false,
      timeOfDay: 10 / 24, // 10 AM
      currentChunkName: 'Ashford Village',
      currentChunkType: 'TOWN',
      currentInteractable: null,
      inDialogue: false,
      cameraYaw: 0,
    });
  }, []);

  return <GameHUD />;
}

/**
 * HUD with low health — triggers warning pulse.
 */
export function GameHUDLowHealth() {
  useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      health: 15,
      stamina: 40,
      isSprinting: false,
      timeOfDay: 20 / 24, // 8 PM — nighttime
      currentChunkName: 'Dark Hollow',
      currentChunkType: 'DUNGEON',
      currentInteractable: null,
      inDialogue: false,
      cameraYaw: Math.PI / 4,
    });
  }, []);

  return <GameHUD />;
}

/**
 * HUD with sprinting active.
 */
export function GameHUDSprinting() {
  useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      health: 100,
      stamina: 55,
      isSprinting: true,
      timeOfDay: 14 / 24, // 2 PM
      currentChunkName: "The King's Road",
      currentChunkType: 'ROAD',
      currentInteractable: null,
      inDialogue: false,
      cameraYaw: Math.PI / 2,
    });
  }, []);

  return <GameHUD />;
}

/**
 * HUD with an interaction prompt visible.
 */
export function GameHUDWithInteraction() {
  useEffect(() => {
    useGameStore.setState({
      gameActive: true,
      health: 90,
      stamina: 100,
      isSprinting: false,
      timeOfDay: 12 / 24, // noon
      currentChunkName: 'Millbrook',
      currentChunkType: 'TOWN',
      currentInteractable: {
        id: 'npc-martha',
        position: { x: 0, y: 0, z: 0, isVector3: true } as never,
        radius: 3,
        type: 'innkeeper',
        name: 'Martha',
        dialogueText: 'Welcome to the inn!',
        actionVerb: 'Talk to',
      },
      inDialogue: false,
      cameraYaw: 0,
    });
  }, []);

  return <GameHUD />;
}

/**
 * GameHUD when game is not active — should return null.
 */
export function GameHUDHidden() {
  useEffect(() => {
    useGameStore.setState({ gameActive: false });
  }, []);

  return (
    <div data-testid="hud-hidden-wrapper">
      <GameHUD />
    </div>
  );
}
