import type { IInputProvider, InputFrame } from '@/input/types';
import { emptyInputFrame } from '@/input/types';

export class InputManager {
  private providers: IInputProvider[] = [];

  register(provider: IInputProvider): void {
    if (!provider.isAvailable()) return;
    this.providers.push(provider);
  }

  unregister(provider: IInputProvider): void {
    const idx = this.providers.indexOf(provider);
    if (idx >= 0) this.providers.splice(idx, 1);
  }

  /** Merge all providers into a single InputFrame. */
  poll(dt: number): InputFrame {
    const frame = emptyInputFrame();

    for (const p of this.providers) {
      if (!p.enabled) continue;
      const partial = p.poll(dt);

      // Movement: sum (clamped after)
      frame.moveX += partial.moveX ?? 0;
      frame.moveZ += partial.moveZ ?? 0;

      // Look: sum deltas
      frame.lookDeltaX += partial.lookDeltaX ?? 0;
      frame.lookDeltaY += partial.lookDeltaY ?? 0;

      // Booleans: OR
      if (partial.interact) frame.interact = true;
      if (partial.sprint) frame.sprint = true;
      if (partial.jump) frame.jump = true;
      if (partial.pause) frame.pause = true;
      if (partial.inventory) frame.inventory = true;
      if (partial.questLog) frame.questLog = true;
      if (partial.attack) frame.attack = true;
    }

    // Clamp movement to unit circle
    const len = Math.sqrt(
      frame.moveX * frame.moveX + frame.moveZ * frame.moveZ,
    );
    if (len > 1) {
      frame.moveX /= len;
      frame.moveZ /= len;
    }

    return frame;
  }

  /** Reset all provider accumulators after the frame is consumed. */
  postFrame(): void {
    for (const p of this.providers) {
      if (p.enabled) p.postFrame();
    }
  }

  dispose(): void {
    for (const p of this.providers) p.dispose();
    this.providers = [];
  }
}

/** Singleton instance used across the game. */
export const inputManager = new InputManager();
