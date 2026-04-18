import { useFrame, useThree } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { inputManager } from '@/input/InputManager';
import { useGameStore } from '@/stores/gameStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useWorldStore } from '@/stores/worldStore';
import { getTerrainHeight, PLAYER_HEIGHT } from '@/utils/worldGen';
import { DUNGEON_DEPTH } from '@/world/dungeon-generator';

// Physics constants
const GRAVITY = 25.0;
const JUMP_FORCE = 6.5;
const ACCELERATION = 35.0;
const BASE_SPEED = 5.5;
const SPRINT_MULTIPLIER = 1.8;
const FRICTION = 20.0;

// Camera constants
const PITCH_MIN = -Math.PI / 2.5;
const PITCH_MAX = Math.PI / 2.5;

// Capsule dimensions: total height = 2*HALF_HEIGHT + 2*RADIUS = PLAYER_HEIGHT
const CAPSULE_RADIUS = 0.3;
const CAPSULE_HALF_HEIGHT = (PLAYER_HEIGHT - 2 * CAPSULE_RADIUS) / 2;
// Body center offset from feet: the capsule center is this far above the ground
const BODY_CENTER_Y = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;
// Eye offset from body center: camera sits at the top of the capsule
const EYE_OFFSET = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;

// Reusable vectors to avoid per-frame allocations
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export function PlayerController() {
  const { camera } = useThree();
  const { world } = useRapier();
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const controllerRef = useRef<ReturnType<
    typeof world.createCharacterController
  > | null>(null);
  const headBobTimer = useRef(0);
  const moveVec = useRef(new THREE.Vector3());
  const velocityYRef = useRef(0);
  const forwardSpeedRef = useRef(0);
  const strafeSpeedRef = useRef(0);

  // Store selectors - only subscribe to what we need for performance
  const inDialogue = useGameStore((state) => state.inDialogue);
  const inCombat = useGameStore((state) => state.inCombat);
  const paused = useGameStore((state) => state.paused);
  const gameActive = useGameStore((state) => state.gameActive);
  const inventoryOpen = useInventoryStore((state) => state.isOpen);

  // Create Rapier character controller
  useEffect(() => {
    const controller = world.createCharacterController(0.01);
    // Allow stepping up small obstacles (stairs, curbs)
    controller.enableAutostep(0.5, 0.2, true);
    // Snap to ground when walking down slopes
    controller.enableSnapToGround(0.5);
    // Slide along walls
    controller.setSlideEnabled(true);
    controllerRef.current = controller;

    return () => {
      world.removeCharacterController(controller);
      controllerRef.current = null;
    };
  }, [world]);

  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !controllerRef.current) return;

    const dt = Math.min(delta, 0.1);
    const input = inputManager.poll(dt);

    // --- UI toggles (one-shot actions) ---
    if (input.pause) {
      const gs = useGameStore.getState();
      const inv = useInventoryStore.getState();
      if (gs.inDialogue) gs.closeDialogue();
      else if (inv.isOpen) inv.close();
      else gs.togglePause();
    }
    if (input.inventory && !inDialogue && !paused) {
      useInventoryStore.getState().toggle();
    }
    if (input.interact && !inDialogue && !paused && !inventoryOpen) {
      const interactable = useGameStore.getState().currentInteractable;
      if (interactable) {
        useGameStore
          .getState()
          .openDialogue(interactable.name, interactable.dialogueText);
      }
    }

    // Don't process movement when game is paused/inactive/in menus/dead
    const isDead = useGameStore.getState().isDead;
    if (
      !gameActive ||
      paused ||
      inDialogue ||
      inCombat ||
      inventoryOpen ||
      isDead
    ) {
      inputManager.postFrame();
      return;
    }

    const state = useGameStore.getState();
    const controller = controllerRef.current;
    const body = rigidBodyRef.current;

    // --- Look: apply deltas to yaw and pitch ---
    const newYaw = state.cameraYaw - input.lookDeltaX;
    const newPitch = Math.max(
      PITCH_MIN,
      Math.min(PITCH_MAX, state.cameraPitch - input.lookDeltaY),
    );
    useGameStore.getState().setCameraYaw(newYaw);
    useGameStore.getState().setCameraPitch(newPitch);

    // --- Movement input ---
    const targetForward = input.moveZ; // +1 forward, -1 backward
    const targetStrafe = input.moveX; // +1 right, -1 left
    const hasMovement =
      Math.abs(targetForward) > 0.01 || Math.abs(targetStrafe) > 0.01;

    // Sprint/walk speed
    let isSprinting = false;
    let maxSpeed = BASE_SPEED;

    if (input.sprint && hasMovement && state.stamina > 0) {
      isSprinting = true;
      useGameStore.getState().setStamina(state.stamina - dt * 25);
      maxSpeed = BASE_SPEED * SPRINT_MULTIPLIER;
    } else {
      const regenRate = hasMovement ? 15 : 20;
      useGameStore.getState().setStamina(state.stamina + dt * regenRate);
    }
    useGameStore.getState().setIsSprinting(isSprinting);

    // Forward/back velocity (acceleration/friction model)
    if (Math.abs(targetForward) > 0.01) {
      forwardSpeedRef.current += targetForward * ACCELERATION * dt;
    } else {
      const sign = Math.sign(forwardSpeedRef.current);
      forwardSpeedRef.current -= sign * FRICTION * dt * 2;
      if (Math.abs(forwardSpeedRef.current) < 0.5) forwardSpeedRef.current = 0;
    }
    forwardSpeedRef.current = Math.max(
      -maxSpeed,
      Math.min(maxSpeed, forwardSpeedRef.current),
    );

    // Strafe velocity (same model)
    if (Math.abs(targetStrafe) > 0.01) {
      strafeSpeedRef.current += targetStrafe * ACCELERATION * dt;
    } else {
      const sign = Math.sign(strafeSpeedRef.current);
      strafeSpeedRef.current -= sign * FRICTION * dt * 2;
      if (Math.abs(strafeSpeedRef.current) < 0.5) strafeSpeedRef.current = 0;
    }
    strafeSpeedRef.current = Math.max(
      -maxSpeed,
      Math.min(maxSpeed, strafeSpeedRef.current),
    );

    // Store legacy velocity for other systems (head bob, etc.)
    const combinedSpeed = Math.sqrt(
      forwardSpeedRef.current * forwardSpeedRef.current +
        strafeSpeedRef.current * strafeSpeedRef.current,
    );
    useGameStore.getState().setVelocity(combinedSpeed);

    // Get current body position
    const pos = body.translation();

    // Jump — use Rapier ground detection
    const isGrounded = controllerRef.current.computedGrounded();
    if (input.jump && isGrounded) {
      velocityYRef.current = JUMP_FORCE;
    }

    // Gravity (applied manually since body is kinematic)
    velocityYRef.current -= GRAVITY * dt;
    if (isGrounded && velocityYRef.current < 0) {
      velocityYRef.current = 0;
    }

    // Compute desired horizontal movement
    // Forward vector: facing direction projected onto XZ plane
    _forward.set(0, 0, -1).applyAxisAngle(_upAxis, newYaw);
    // Right vector: perpendicular to forward on XZ plane
    _right.set(_forward.z, 0, -_forward.x);

    moveVec.current.set(0, 0, 0);
    if (Math.abs(forwardSpeedRef.current) > 0) {
      moveVec.current.addScaledVector(_forward, forwardSpeedRef.current * dt);
    }
    if (Math.abs(strafeSpeedRef.current) > 0) {
      moveVec.current.addScaledVector(_right, strafeSpeedRef.current * dt);
    }
    // Add vertical movement (gravity + jump)
    moveVec.current.y = velocityYRef.current * dt;

    // Use Rapier character controller for collision resolution
    const collider = body.collider(0);
    if (collider) {
      controller.computeColliderMovement(collider, moveVec.current);
      const corrected = controller.computedMovement();

      // Compute terrain-aware floor height (dungeon uses fixed depth)
      const gameState = useGameStore.getState();
      let terrainY: number;
      if (gameState.inDungeon) {
        terrainY = DUNGEON_DEPTH;
      } else {
        const kingdomMap = useWorldStore.getState().kingdomMap;
        terrainY = kingdomMap
          ? getTerrainHeight(
              kingdomMap,
              pos.x + corrected.x,
              pos.z + corrected.z,
            )
          : 0;
      }
      const minBodyY = terrainY + BODY_CENTER_Y;

      // Apply corrected movement to body
      const newPos = {
        x: pos.x + corrected.x,
        y: Math.max(minBodyY, pos.y + corrected.y),
        z: pos.z + corrected.z,
      };

      body.setNextKinematicTranslation(newPos);

      // Sync game store (eye-level position for other systems)
      const eyePos = new THREE.Vector3(
        newPos.x,
        newPos.y + EYE_OFFSET,
        newPos.z,
      );
      useGameStore.getState().setPlayerPosition(eyePos);
      useGameStore.getState().setIsGrounded(controller.computedGrounded());
      useGameStore.getState().setPlayerVelocityY(velocityYRef.current);

      // Update camera to eye position
      camera.position.copy(eyePos);

      // Head bob when moving
      if (combinedSpeed > 0) {
        headBobTimer.current += dt * combinedSpeed;
        camera.position.y += Math.sin(headBobTimer.current) * 0.1;
      }
    }

    camera.rotation.order = 'YXZ';
    camera.rotation.y = newYaw;
    camera.rotation.x = newPitch;

    inputManager.postFrame();
  });

  // Initial position: convert eye-level store position to body center
  const playerPosition = useGameStore((state) => state.playerPosition);

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      colliders={false}
      position={[
        playerPosition.x,
        playerPosition.y - EYE_OFFSET,
        playerPosition.z,
      ]}
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
    </RigidBody>
  );
}
