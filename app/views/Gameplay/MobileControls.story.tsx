/**
 * Story wrappers for MobileControls — used by Playwright CT.
 *
 * MobileControls checks `'ontouchstart' in window` at render time
 * and returns null on non-touch devices. To test it in Playwright
 * (Chromium desktop), we need to mock touch support.
 *
 * The wrapper patches window before the component renders.
 */
import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { MobileControls } from './MobileControls';

/**
 * Renders MobileControls with touch support forced on.
 * Shows jump button and "Touch to move" hint.
 */
export function MobileControlsDefault() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Force touch device detection
    Object.defineProperty(window, 'ontouchstart', {
      value: null,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      writable: true,
      configurable: true,
    });

    useGameStore.setState({
      gameActive: true,
      inDialogue: false,
      currentInteractable: null,
      stamina: 80,
    });
    setReady(true);
  }, []);

  if (!ready) return null;

  return <MobileControls />;
}

/**
 * MobileControls with an interactable nearby — shows interact button.
 */
export function MobileControlsWithInteraction() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Object.defineProperty(window, 'ontouchstart', {
      value: null,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      writable: true,
      configurable: true,
    });

    useGameStore.setState({
      gameActive: true,
      inDialogue: false,
      currentInteractable: {
        id: 'npc-test',
        position: { x: 0, y: 0, z: 0, isVector3: true } as never,
        radius: 3,
        type: 'merchant',
        name: 'Peddler',
        dialogueText: 'Fine wares!',
        actionVerb: 'Trade with',
      },
      stamina: 60,
    });
    setReady(true);
  }, []);

  if (!ready) return null;

  return <MobileControls />;
}

/**
 * MobileControls when game not active — should return null.
 */
export function MobileControlsHidden() {
  useEffect(() => {
    useGameStore.setState({ gameActive: false });
  }, []);

  return (
    <div data-testid="mobile-hidden-wrapper">
      <MobileControls />
    </div>
  );
}
