import type { IInputProvider, InputFrame } from '@/input/types';

const STICK_DEADZONE = 0.15;
const LOOK_SENSITIVITY = 0.05;

/** Button indices that use rising-edge detection (fire once per press). */
const EDGE_BUTTONS = [0, 1, 3, 9, 12] as const;

/**
 * Polls the Gamepad API each frame using standard mapping:
 *
 * - Left stick  → moveX / moveZ (Y inverted)
 * - Right stick → lookDeltaX / lookDeltaY
 * - RT (7)      → attack        LT (6)      → interact
 * - A  (0)      → jump          B  (1)      → inventory
 * - Y  (3)      → questLog      Start (9)   → pause
 * - L3 (10)     → sprint        DPad-Up (12)→ questLog (alt)
 */
export class GamepadProvider implements IInputProvider {
  readonly type = 'gamepad';
  enabled = true;
  private prevButtons: boolean[] = [];

  private applyDeadzone(raw: number): number {
    const sign = Math.sign(raw);
    const abs = Math.abs(raw);
    if (abs < STICK_DEADZONE) return 0;
    return (sign * (abs - STICK_DEADZONE)) / (1 - STICK_DEADZONE);
  }

  private getGamepad(): Gamepad | null {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) return gamepads[i];
    }
    return null;
  }

  private risingEdge(index: number, currentPressed: boolean): boolean {
    const prev = this.prevButtons[index] ?? false;
    return currentPressed && !prev;
  }

  poll(_dt: number): Partial<InputFrame> {
    const gp = this.getGamepad();
    if (!gp) return {};

    const axes = gp.axes;
    const buttons = gp.buttons;

    const moveX = this.applyDeadzone(axes[0] ?? 0);
    const moveZ = -this.applyDeadzone(axes[1] ?? 0);
    const lookDeltaX = this.applyDeadzone(axes[2] ?? 0) * LOOK_SENSITIVITY;
    const lookDeltaY = this.applyDeadzone(axes[3] ?? 0) * LOOK_SENSITIVITY;

    const attack = (buttons[7]?.value ?? 0) > 0.5;
    const interact = (buttons[6]?.value ?? 0) > 0.5;

    const jump = this.risingEdge(0, buttons[0]?.pressed ?? false);
    const inventory = this.risingEdge(1, buttons[1]?.pressed ?? false);
    const questLog =
      this.risingEdge(3, buttons[3]?.pressed ?? false) ||
      this.risingEdge(12, buttons[12]?.pressed ?? false);
    const pause = this.risingEdge(9, buttons[9]?.pressed ?? false);
    const sprint = buttons[10]?.pressed ?? false;

    // Update previous button state for edge detection
    const newPrev: boolean[] = [];
    for (const idx of EDGE_BUTTONS) {
      newPrev[idx] = buttons[idx]?.pressed ?? false;
    }
    this.prevButtons = newPrev;

    return {
      moveX,
      moveZ,
      lookDeltaX,
      lookDeltaY,
      attack,
      interact,
      jump,
      inventory,
      questLog,
      pause,
      sprint,
    };
  }

  postFrame(): void {
    /* Polling-based, no accumulators to reset. */
  }

  isAvailable(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.getGamepads === 'function'
    );
  }

  dispose(): void {
    /* Polling-based, no event listeners to remove. */
  }
}
