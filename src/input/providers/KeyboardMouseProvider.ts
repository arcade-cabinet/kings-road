import type { IInputProvider, InputFrame } from '@/input/types';

const MOUSE_SENSITIVITY = 0.002;

const PREVENT_DEFAULT_KEYS = new Set([
  ' ',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
]);

export class KeyboardMouseProvider implements IInputProvider {
  readonly type = 'keyboard-mouse';
  enabled = true;

  private keysDown = new Set<string>();
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private attackHeld = false;

  // One-shot flags — set on keydown, cleared each postFrame
  private interactFlag = false;
  private jumpFlag = false;
  private pauseFlag = false;
  private inventoryFlag = false;
  private questLogFlag = false;

  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleMouseDown: (e: MouseEvent) => void;
  private handleMouseUp: (e: MouseEvent) => void;

  constructor() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (PREVENT_DEFAULT_KEYS.has(key)) {
        e.preventDefault();
      }

      // Ignore key repeats for one-shot actions
      if (e.repeat) {
        this.keysDown.add(key);
        return;
      }

      this.keysDown.add(key);

      // One-shot flags
      if (key === 'e') this.interactFlag = true;
      if (key === ' ') this.jumpFlag = true;
      if (key === 'escape') this.pauseFlag = true;
      if (key === 'i') this.inventoryFlag = true;
      if (key === 'q') this.questLogFlag = true;
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.key.toLowerCase());
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      this.lookDeltaX += e.movementX * MOUSE_SENSITIVITY;
      this.lookDeltaY += e.movementY * MOUSE_SENSITIVITY;
    };

    this.handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this.attackHeld = true;
    };

    this.handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.attackHeld = false;
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  poll(_dt: number): Partial<InputFrame> {
    let moveX = 0;
    let moveZ = 0;

    if (this.keysDown.has('w') || this.keysDown.has('arrowup')) moveZ += 1;
    if (this.keysDown.has('s') || this.keysDown.has('arrowdown')) moveZ -= 1;
    if (this.keysDown.has('a') || this.keysDown.has('arrowleft')) moveX -= 1;
    if (this.keysDown.has('d') || this.keysDown.has('arrowright')) moveX += 1;

    return {
      moveX,
      moveZ,
      lookDeltaX: this.lookDeltaX,
      lookDeltaY: this.lookDeltaY,
      interact: this.interactFlag,
      sprint: this.keysDown.has('shift'),
      jump: this.jumpFlag,
      pause: this.pauseFlag,
      inventory: this.inventoryFlag,
      questLog: this.questLogFlag,
      attack: this.attackHeld,
    };
  }

  postFrame(): void {
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.interactFlag = false;
    this.jumpFlag = false;
    this.pauseFlag = false;
    this.inventoryFlag = false;
    this.questLogFlag = false;
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(pointer: fine)')?.matches ?? true;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.keysDown.clear();
  }
}
