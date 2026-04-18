import { useEffect } from 'react';
import { inputManager } from './InputManager';
import { GamepadProvider } from './providers/GamepadProvider';
import { KeyboardMouseProvider } from './providers/KeyboardMouseProvider';
import { getTouchProvider } from './providers/TouchProvider';

/**
 * Registers all input providers on mount and disposes them on unmount.
 * Call this once at the top level of the Game component (outside Canvas).
 *
 * Movement/look polling happens inside PlayerController's useFrame.
 * UI toggles (pause, inventory, etc.) are also handled there.
 */
export function useInputManager() {
  useEffect(() => {
    const kbm = new KeyboardMouseProvider();
    const gp = new GamepadProvider();
    const touch = getTouchProvider();

    inputManager.register(kbm);
    inputManager.register(gp);
    inputManager.register(touch);

    return () => {
      inputManager.unregister(kbm);
      inputManager.unregister(gp);
      inputManager.unregister(touch);
      kbm.dispose();
      gp.dispose();
      touch.dispose();
    };
  }, []);
}
