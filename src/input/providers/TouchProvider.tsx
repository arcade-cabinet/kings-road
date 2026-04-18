import { useCallback, useRef } from 'react';
import type { IInputProvider, InputFrame } from '@/input/types';
import { useGameStore } from '@/stores/gameStore';

// --- Constants ---

const JOYSTICK_RADIUS = 60; // half of 120px diameter
const JOYSTICK_DEADZONE = 10; // px
const LOOK_SENSITIVITY = 0.004; // rad/px
const BUTTON_SIZE = 72;
const PAUSE_SIZE = 44;

// Medieval palette
const GOLD = '#c4a747';
const WOOD = '#8b6f47';
const PARCHMENT = 'rgba(245, 240, 232, 0.4)';
const PARCHMENT_SOLID = 'rgba(245, 240, 232, 0.6)';
const GOLD_BORDER = 'rgba(196, 167, 71, 0.7)';
const WOOD_BORDER = 'rgba(139, 111, 71, 0.6)';

// --- Shared mutable state (zero-allocation polling) ---

const touchState = {
  moveX: 0,
  moveZ: 0,
  lookDeltaX: 0,
  lookDeltaY: 0,
  interact: false,
  attack: false,
  jump: false,
  pause: false,
  sprint: false,
  inventory: false,
  questLog: false,
};

// --- IInputProvider implementation ---

class TouchProviderImpl implements IInputProvider {
  readonly type = 'touch';
  enabled = true;

  poll(_dt: number): Partial<InputFrame> {
    return {
      moveX: touchState.moveX,
      moveZ: touchState.moveZ,
      lookDeltaX: touchState.lookDeltaX,
      lookDeltaY: touchState.lookDeltaY,
      interact: touchState.interact,
      attack: touchState.attack,
      jump: touchState.jump,
      pause: touchState.pause,
      sprint: touchState.sprint,
      inventory: touchState.inventory,
      questLog: touchState.questLog,
    };
  }

  postFrame(): void {
    // Clear accumulators and one-shot flags
    touchState.lookDeltaX = 0;
    touchState.lookDeltaY = 0;
    touchState.jump = false;
    touchState.pause = false;
    touchState.interact = false;
    touchState.inventory = false;
    touchState.questLog = false;
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window && navigator.maxTouchPoints > 0;
  }

  dispose(): void {
    // Reset all state
    touchState.moveX = 0;
    touchState.moveZ = 0;
    touchState.lookDeltaX = 0;
    touchState.lookDeltaY = 0;
    touchState.interact = false;
    touchState.attack = false;
    touchState.jump = false;
    touchState.pause = false;
    touchState.sprint = false;
    touchState.inventory = false;
    touchState.questLog = false;
  }
}

// --- Singleton ---

let instance: TouchProviderImpl | null = null;

export function getTouchProvider(): IInputProvider {
  if (!instance) {
    instance = new TouchProviderImpl();
  }
  return instance;
}

// --- React overlay component ---

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const TouchOverlay: React.FC = () => {
  const gameActive = useGameStore((s) => s.gameActive);

  // Joystick refs
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickOuterRef = useRef<HTMLDivElement>(null);
  const joystickVisible = useRef(false);

  // Look zone refs
  const lookTouchId = useRef<number | null>(null);
  const lookLastPos = useRef({ x: 0, y: 0 });

  // --- Joystick handlers ---

  const onJoystickStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch || joystickTouchId.current !== null) return;

    joystickTouchId.current = touch.identifier;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = touch.clientX;
    const cy = touch.clientY;
    joystickCenter.current = { x: cx, y: cy };

    // Show and position the joystick outer ring
    if (joystickOuterRef.current) {
      joystickOuterRef.current.style.display = 'block';
      joystickOuterRef.current.style.left = `${cx - rect.left - JOYSTICK_RADIUS}px`;
      joystickOuterRef.current.style.top = `${cy - rect.top - JOYSTICK_RADIUS}px`;
    }
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = 'translate(-50%, -50%)';
    }
    joystickVisible.current = true;

    touchState.moveX = 0;
    touchState.moveZ = 0;
    touchState.sprint = false;
  }, []);

  const onJoystickMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== joystickTouchId.current) continue;

      const dx = touch.clientX - joystickCenter.current.x;
      const dy = touch.clientY - joystickCenter.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Clamp to joystick radius
      const clampedDist = Math.min(dist, JOYSTICK_RADIUS);
      const angle = Math.atan2(dy, dx);
      const clampedX = clampedDist * Math.cos(angle);
      const clampedY = clampedDist * Math.sin(angle);

      // Move the knob visually
      if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
      }

      // Apply deadzone
      if (dist < JOYSTICK_DEADZONE) {
        touchState.moveX = 0;
        touchState.moveZ = 0;
        touchState.sprint = false;
        return;
      }

      const effective = dist - JOYSTICK_DEADZONE;
      const maxEffective = JOYSTICK_RADIUS - JOYSTICK_DEADZONE;
      const normDist = Math.min(effective / maxEffective, 1);

      const normX = Math.cos(angle) * normDist;
      const normY = Math.sin(angle) * normDist;

      touchState.moveX = clamp(normX, -1, 1);
      touchState.moveZ = clamp(-normY, -1, 1); // Invert Y: touch up = forward (+Z)

      // Sprint when joystick pushed to >80% of range
      touchState.sprint = normDist > 0.8;
    }
  }, []);

  const onJoystickEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== joystickTouchId.current) continue;

      joystickTouchId.current = null;
      joystickVisible.current = false;

      if (joystickOuterRef.current) {
        joystickOuterRef.current.style.display = 'none';
      }

      touchState.moveX = 0;
      touchState.moveZ = 0;
      touchState.sprint = false;
    }
  }, []);

  // --- Look zone handlers ---

  const onLookStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch || lookTouchId.current !== null) return;

    lookTouchId.current = touch.identifier;
    lookLastPos.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onLookMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== lookTouchId.current) continue;

      const dx = touch.clientX - lookLastPos.current.x;
      const dy = touch.clientY - lookLastPos.current.y;

      touchState.lookDeltaX += dx * LOOK_SENSITIVITY;
      touchState.lookDeltaY += dy * LOOK_SENSITIVITY;

      lookLastPos.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const onLookEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== lookTouchId.current) continue;
      lookTouchId.current = null;
    }
  }, []);

  // --- Button handlers ---

  const onAttackStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    touchState.attack = true;
  }, []);

  const onAttackEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    touchState.attack = false;
  }, []);

  const onInteractTap = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    touchState.interact = true;
  }, []);

  const onJumpTap = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    touchState.jump = true;
  }, []);

  const onPauseTap = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    touchState.pause = true;
  }, []);

  if (!gameActive) return null;

  // Common button style
  const buttonBase: React.CSSProperties = {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: '50%',
    border: `2px solid ${GOLD_BORDER}`,
    background: PARCHMENT_SOLID,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  };

  const buttonLabel: React.CSSProperties = {
    fontFamily: 'Lora, serif',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: WOOD,
    lineHeight: 1,
  };

  const buttonIcon: React.CSSProperties = {
    fontSize: 22,
    lineHeight: 1,
    marginBottom: 2,
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {/* Pause button — top-left */}
      <div
        onTouchStart={onPauseTap}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width: PAUSE_SIZE,
          height: PAUSE_SIZE,
          borderRadius: 8,
          border: `1.5px solid ${WOOD_BORDER}`,
          background: PARCHMENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontFamily: 'Lora, serif',
            fontSize: 18,
            color: WOOD,
            lineHeight: 1,
          }}
        >
          ||
        </span>
      </div>

      {/* Left half — joystick zone */}
      <div
        onTouchStart={onJoystickStart}
        onTouchMove={onJoystickMove}
        onTouchEnd={onJoystickEnd}
        onTouchCancel={onJoystickEnd}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '50%',
          height: '100%',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      >
        {/* Joystick outer ring (hidden until touch) */}
        <div
          ref={joystickOuterRef}
          style={{
            display: 'none',
            position: 'absolute',
            width: JOYSTICK_RADIUS * 2,
            height: JOYSTICK_RADIUS * 2,
            borderRadius: '50%',
            border: `2px solid ${GOLD_BORDER}`,
            background: 'rgba(245, 240, 232, 0.3)',
            pointerEvents: 'none',
          }}
        >
          {/* Inner deadzone ring */}
          <div
            style={{
              position: 'absolute',
              top: JOYSTICK_RADIUS - JOYSTICK_DEADZONE,
              left: JOYSTICK_RADIUS - JOYSTICK_DEADZONE,
              width: JOYSTICK_DEADZONE * 2,
              height: JOYSTICK_DEADZONE * 2,
              borderRadius: '50%',
              border: `1px solid ${WOOD_BORDER}`,
              pointerEvents: 'none',
            }}
          />
          {/* Knob */}
          <div
            ref={joystickKnobRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: `radial-gradient(circle at 40% 35%, ${GOLD}, ${WOOD})`,
              border: `2px solid ${GOLD_BORDER}`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Hint text */}
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            left: 16,
            fontFamily: 'Lora, serif',
            fontSize: 11,
            color: WOOD,
            opacity: 0.5,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Touch to move
        </div>
      </div>

      {/* Right half — look zone */}
      <div
        onTouchStart={onLookStart}
        onTouchMove={onLookMove}
        onTouchEnd={onLookEnd}
        onTouchCancel={onLookEnd}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '50%',
          height: '100%',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      />

      {/* Jump button — bottom-left, above joystick zone */}
      <div
        onTouchStart={onJumpTap}
        style={{
          ...buttonBase,
          position: 'absolute',
          bottom: 24,
          left: 24,
          pointerEvents: 'auto',
        }}
      >
        <span style={buttonIcon}>&#8593;</span>
        <span style={buttonLabel}>JUMP</span>
      </div>

      {/* Right-side action buttons */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          pointerEvents: 'none',
        }}
      >
        {/* Attack button — hold */}
        <div
          onTouchStart={onAttackStart}
          onTouchEnd={onAttackEnd}
          onTouchCancel={onAttackEnd}
          style={{
            ...buttonBase,
            pointerEvents: 'auto',
          }}
        >
          <span style={buttonIcon}>&#9876;</span>
          <span style={buttonLabel}>ATTACK</span>
        </div>

        {/* Interact button — tap */}
        <div
          onTouchStart={onInteractTap}
          style={{
            ...buttonBase,
            pointerEvents: 'auto',
          }}
        >
          <span style={buttonIcon}>&#9995;</span>
          <span style={buttonLabel}>INTERACT</span>
        </div>
      </div>
    </div>
  );
};
