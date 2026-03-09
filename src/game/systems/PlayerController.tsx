import { useFrame, useThree } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { PLAYER_HEIGHT } from '../utils/worldGen';

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

// Capsule dimensions: total height = 2*HALF_HEIGHT + 2*RADIUS = PLAYER_HEIGHT
const CAPSULE_RADIUS = 0.3;
const CAPSULE_HALF_HEIGHT = (PLAYER_HEIGHT - 2 * CAPSULE_RADIUS) / 2;
// Body center offset from feet: the capsule center is this far above the ground
const BODY_CENTER_Y = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;
// Eye offset from body center: camera sits at the top of the capsule
const EYE_OFFSET = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;

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

  // Store selectors - only subscribe to what we need for performance
  const keys = useGameStore((state) => state.keys);
  const joystickVector = useGameStore((state) => state.joystickVector);
  const joystickDist = useGameStore((state) => state.joystickDist);
  const inDialogue = useGameStore((state) => state.inDialogue);
  const inCombat = useGameStore((state) => state.inCombat);
  const gameActive = useGameStore((state) => state.gameActive);

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
    if (!gameActive || inDialogue || inCombat) return;
    if (!rigidBodyRef.current || !controllerRef.current) return;

    const dt = Math.min(delta, 0.1);
    const state = useGameStore.getState();
    const controller = controllerRef.current;
    const body = rigidBodyRef.current;

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
    let isSprinting = false;
    let maxSpeed = BASE_SPEED;

    if (keys.shift && targetMove > 0) {
      maxSpeed = BASE_SPEED * WALK_MULTIPLIER;
      useGameStore.getState().setStamina(state.stamina + dt * 20);
    } else if (
      (joystickDist > 65 || keys.shift === false) &&
      targetMove > 0 &&
      state.stamina > 0 &&
      joystickDist > 50
    ) {
      isSprinting = true;
      useGameStore.getState().setStamina(state.stamina - dt * 25);
      maxSpeed = BASE_SPEED * SPRINT_MULTIPLIER;
    } else {
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

    // Movement velocity (acceleration/friction model)
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

    // Get current body position
    const pos = body.translation();

    // Jump — use Rapier ground detection
    const isGrounded = controllerRef.current.computedGrounded();
    if (keys.space && isGrounded) {
      velocityYRef.current = JUMP_FORCE;
      useGameStore.getState().setKey('space', false);
    }

    // Gravity (applied manually since body is kinematic)
    velocityYRef.current -= GRAVITY * dt;
    if (isGrounded && velocityYRef.current < 0) {
      velocityYRef.current = 0;
    }

    // Compute desired horizontal movement
    moveVec.current.set(0, 0, 0);
    if (Math.abs(newVelocity) > 0) {
      moveVec.current
        .set(0, 0, -1)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), newYaw)
        .multiplyScalar(newVelocity * dt);
    }
    // Add vertical movement (gravity + jump)
    moveVec.current.y = velocityYRef.current * dt;

    // Use Rapier character controller for collision resolution
    const collider = body.collider(0);
    if (collider) {
      controller.computeColliderMovement(collider, moveVec.current);
      const corrected = controller.computedMovement();

      // Apply corrected movement to body
      const newPos = {
        x: pos.x + corrected.x,
        y: Math.max(BODY_CENTER_Y, pos.y + corrected.y),
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
      if (Math.abs(newVelocity) > 0) {
        headBobTimer.current += dt * Math.abs(newVelocity);
        camera.position.y += Math.sin(headBobTimer.current) * 0.1;
      }
    }

    camera.rotation.order = 'YXZ';
    camera.rotation.y = newYaw;
    camera.rotation.x = state.cameraPitch;
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
