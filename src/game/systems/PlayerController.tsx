import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import type { AABB } from '../types';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from '../utils/worldGen';

// Physics constants
const GRAVITY = 25.0;
const JUMP_FORCE = 6.5;
const ACCELERATION = 35.0;
const BASE_SPEED = 5.5;
const SPRINT_MULTIPLIER = 1.8;
const WALK_MULTIPLIER = 0.5;
const FRICTION = 20.0;
const TURN_ACCEL = 12.0;
const MAX_TURN = 2.5;
const TURN_FRICTION = 15.0;

function validateMovement(
  currentPos: THREE.Vector3 | null | undefined,
  nextX: number,
  nextZ: number,
  aabbs: AABB[] | null | undefined,
): { x: number; z: number } {
  let outX = nextX;
  let outZ = nextZ;

  // Safety check
  if (!currentPos || !aabbs) {
    return { x: outX, z: outZ };
  }

  for (const b of aabbs) {
    if (!b) continue;
    // Check X collision
    if (
      outX > b.minX - PLAYER_RADIUS &&
      outX < b.maxX + PLAYER_RADIUS &&
      currentPos.z > b.minZ - PLAYER_RADIUS &&
      currentPos.z < b.maxZ + PLAYER_RADIUS
    ) {
      outX = currentPos.x;
    }
    // Check Z collision
    if (
      currentPos.x > b.minX - PLAYER_RADIUS &&
      currentPos.x < b.maxX + PLAYER_RADIUS &&
      outZ > b.minZ - PLAYER_RADIUS &&
      outZ < b.maxZ + PLAYER_RADIUS
    ) {
      outZ = currentPos.z;
    }
  }

  return { x: outX, z: outZ };
}

export function PlayerController() {
  const { camera } = useThree();
  const headBobTimer = useRef(0);
  const moveVec = useRef(new THREE.Vector3());

  // Store selectors - only subscribe to what we need for performance
  const keys = useGameStore((state) => state.keys);
  const joystickVector = useGameStore((state) => state.joystickVector);
  const joystickDist = useGameStore((state) => state.joystickDist);
  const inDialogue = useGameStore((state) => state.inDialogue);
  const inCombat = useGameStore((state) => state.inCombat);
  const gameActive = useGameStore((state) => state.gameActive);
  const globalAABBs = useGameStore((state) => state.globalAABBs);

  useFrame((_, delta) => {
    if (!gameActive || inDialogue || inCombat) return;

    const dt = Math.min(delta, 0.1);
    const state = useGameStore.getState();

    // Get movement input
    let targetMove = 0;
    let targetTurn = 0;

    if (keys.w) targetMove = 1;
    if (keys.s) targetMove = -1;
    if (keys.a || keys.q) targetTurn = 1;
    if (keys.d || keys.e) targetTurn = -1;

    // Touch/joystick input
    if (joystickDist > 0) {
      targetMove = -joystickVector.y;
      targetTurn = -joystickVector.x;
    }

    // Sprint/walk speed
    // SHIFT = walk slow (regen stamina)
    // Joystick pushed far = sprint (drain stamina)
    // Default = normal walk (regen stamina)
    let isSprinting = false;
    let maxSpeed = BASE_SPEED;

    if (keys.shift && targetMove > 0) {
      // Walking mode - slow and regenerate stamina faster
      maxSpeed = BASE_SPEED * WALK_MULTIPLIER;
      useGameStore.getState().setStamina(state.stamina + dt * 20);
    } else if (
      (joystickDist > 65 || keys.shift === false) &&
      targetMove > 0 &&
      state.stamina > 0 &&
      joystickDist > 50
    ) {
      // Sprint when joystick is pushed far (mobile)
      isSprinting = true;
      useGameStore.getState().setStamina(state.stamina - dt * 25);
      maxSpeed = BASE_SPEED * SPRINT_MULTIPLIER;
    } else {
      // Normal movement - regenerate stamina
      useGameStore.getState().setStamina(state.stamina + dt * 15);
    }

    useGameStore.getState().setIsSprinting(isSprinting);

    // Turning
    let newAngularVelocity = state.angularVelocity;
    if (targetTurn !== 0) {
      newAngularVelocity += targetTurn * TURN_ACCEL * dt;
    } else {
      const sign = Math.sign(newAngularVelocity);
      newAngularVelocity -= sign * TURN_FRICTION * dt;
      if (Math.abs(newAngularVelocity) < 0.1) newAngularVelocity = 0;
    }
    newAngularVelocity = Math.max(
      -MAX_TURN,
      Math.min(MAX_TURN, newAngularVelocity),
    );

    const newYaw = state.cameraYaw + newAngularVelocity * dt;
    useGameStore.getState().setAngularVelocity(newAngularVelocity);
    useGameStore.getState().setCameraYaw(newYaw);

    // Movement velocity
    let newVelocity = state.velocity;
    if (targetMove !== 0) {
      newVelocity += targetMove * ACCELERATION * dt;
    } else {
      const sign = Math.sign(newVelocity);
      newVelocity -= sign * FRICTION * dt * 2;
      if (Math.abs(newVelocity) < 0.5) newVelocity = 0;
    }
    newVelocity = Math.max(-maxSpeed, Math.min(maxSpeed, newVelocity));
    useGameStore.getState().setVelocity(newVelocity);

    // Jump
    let velocityY = state.playerVelocityY;
    const isGrounded = state.playerPosition.y <= PLAYER_HEIGHT + 0.1;

    if (keys.space && isGrounded) {
      velocityY = JUMP_FORCE;
      useGameStore.getState().setKey('space', false);
    }

    // Gravity
    velocityY -= GRAVITY * dt;

    // Update Y position
    let newY = state.playerPosition.y + velocityY * dt;
    if (newY < PLAYER_HEIGHT) {
      newY = PLAYER_HEIGHT;
      velocityY = 0;
    }
    useGameStore.getState().setPlayerVelocityY(velocityY);
    useGameStore.getState().setIsGrounded(newY <= PLAYER_HEIGHT + 0.1);

    // Calculate horizontal movement
    const playerPos = state.playerPosition.clone();
    playerPos.y = newY;

    if (Math.abs(newVelocity) > 0) {
      moveVec.current
        .set(0, 0, -1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), newYaw)
        .multiplyScalar(newVelocity * dt);

      const nextPos = validateMovement(
        playerPos,
        playerPos.x + moveVec.current.x,
        playerPos.z + moveVec.current.z,
        globalAABBs,
      );

      playerPos.x = nextPos.x;
      playerPos.z = nextPos.z;

      // Head bob
      headBobTimer.current += dt * Math.abs(newVelocity);
    }

    useGameStore.getState().setPlayerPosition(playerPos);

    // Update camera
    camera.position.copy(playerPos);
    camera.position.y += Math.sin(headBobTimer.current) * 0.1;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = newYaw;
    camera.rotation.x = state.cameraPitch;
  });

  return null;
}
