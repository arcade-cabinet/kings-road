import { trait } from 'koota';

export const IsPlayer = trait();
export const Health = trait({ current: 100, max: 100 });
export const Stamina = trait({ current: 100, max: 100 });
export const Movement = trait({
  speed: 0,
  angularSpeed: 0,
  isSprinting: false,
  isGrounded: true,
});
export const PlayerInput = trait({
  forward: false,
  backward: false,
  left: false,
  right: false,
  strafeLeft: false,
  strafeRight: false,
  jump: false,
  walk: false,
  interact: false,
});
export const DistanceTraveled = trait({ total: 0, sinceLastFeature: 0 });
