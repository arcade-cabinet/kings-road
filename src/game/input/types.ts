/**
 * Unified input frame — the single interface between
 * all input sources (keyboard, touch, gamepad) and game systems.
 *
 * Game code NEVER reads raw events. It reads InputFrame.
 */

/** Per-frame input snapshot consumed by game systems. */
export interface InputFrame {
  // Movement (normalized -1..1, clamped to unit circle)
  moveX: number; // strafe: -1 = left, +1 = right
  moveZ: number; // forward/back: -1 = backward, +1 = forward

  // Look deltas (radians this frame)
  lookDeltaX: number; // yaw
  lookDeltaY: number; // pitch

  // Actions (binary, combined across all providers via OR)
  interact: boolean; // E / A button / tap — talk to NPC, pick up item, attack in combat
  sprint: boolean; // Shift / LS click / joystick full-tilt
  jump: boolean; // Space / A button
  pause: boolean; // Escape / Start button
  inventory: boolean; // I / Select button
  questLog: boolean; // Q / DPad-up
  attack: boolean; // Left-click / RT / attack button (combat)
}

/** Returns a zeroed-out InputFrame. */
export function emptyInputFrame(): InputFrame {
  return {
    moveX: 0,
    moveZ: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    interact: false,
    sprint: false,
    jump: false,
    pause: false,
    inventory: false,
    questLog: false,
    attack: false,
  };
}

/** Interface that all input providers implement. */
export interface IInputProvider {
  readonly type: string;
  enabled: boolean;

  /** Poll provider and return partial frame for this tick. */
  poll(dt: number): Partial<InputFrame>;

  /** Called after the frame is consumed — reset accumulators (e.g. mouse deltas). */
  postFrame(): void;

  /** Returns true if the provider is available on this platform. */
  isAvailable(): boolean;

  /** Clean up event listeners / subscriptions. */
  dispose(): void;
}
