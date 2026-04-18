import type { MonsterArchetype } from '@/schemas/monster.schema';

export interface MonsterGeometry {
  type: 'box' | 'cylinder' | 'sphere';
  args: number[];
  position: [number, number, number];
}

export interface MonsterRenderData {
  bodyParts: MonsterGeometry[];
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  scale: number;
}

function buildBipedParts(): MonsterGeometry[] {
  return [
    // Torso
    { type: 'box', args: [0.5, 0.7, 0.3], position: [0, 0.85, 0] },
    // Head
    { type: 'box', args: [0.35, 0.35, 0.3], position: [0, 1.375, 0] },
    // Left leg
    { type: 'box', args: [0.18, 0.5, 0.18], position: [-0.15, 0.25, 0] },
    // Right leg
    { type: 'box', args: [0.18, 0.5, 0.18], position: [0.15, 0.25, 0] },
    // Left arm
    { type: 'box', args: [0.14, 0.45, 0.14], position: [-0.38, 0.9, 0] },
    // Right arm
    { type: 'box', args: [0.14, 0.45, 0.14], position: [0.38, 0.9, 0] },
  ];
}

function buildQuadrupedParts(): MonsterGeometry[] {
  return [
    // Elongated body
    { type: 'box', args: [0.35, 0.3, 0.8], position: [0, 0.55, 0] },
    // Head
    { type: 'box', args: [0.25, 0.25, 0.3], position: [0, 0.65, 0.5] },
    // Front-left leg
    { type: 'cylinder', args: [0.06, 0.06, 0.4], position: [-0.15, 0.2, 0.25] },
    // Front-right leg
    { type: 'cylinder', args: [0.06, 0.06, 0.4], position: [0.15, 0.2, 0.25] },
    // Back-left leg
    {
      type: 'cylinder',
      args: [0.06, 0.06, 0.4],
      position: [-0.15, 0.2, -0.25],
    },
    // Back-right leg
    {
      type: 'cylinder',
      args: [0.06, 0.06, 0.4],
      position: [0.15, 0.2, -0.25],
    },
  ];
}

function buildSerpentParts(): MonsterGeometry[] {
  return [
    // Head segment
    { type: 'cylinder', args: [0.18, 0.15, 0.35], position: [0, 0.55, 0.6] },
    // Segment 1
    { type: 'cylinder', args: [0.2, 0.2, 0.35], position: [0, 0.45, 0.25] },
    // Segment 2
    { type: 'cylinder', args: [0.2, 0.2, 0.35], position: [0, 0.4, -0.1] },
    // Segment 3
    { type: 'cylinder', args: [0.18, 0.18, 0.35], position: [0, 0.35, -0.45] },
    // Tail
    { type: 'cylinder', args: [0.14, 0.05, 0.35], position: [0, 0.3, -0.8] },
  ];
}

function buildAmorphousParts(): MonsterGeometry[] {
  return [
    // Main body sphere
    { type: 'sphere', args: [0.45], position: [0, 0.45, 0] },
  ];
}

const BODY_BUILDERS: Record<
  MonsterArchetype['bodyType'],
  () => MonsterGeometry[]
> = {
  biped: buildBipedParts,
  quadruped: buildQuadrupedParts,
  serpent: buildSerpentParts,
  amorphous: buildAmorphousParts,
};

export function buildMonsterRenderData(
  archetype: MonsterArchetype,
): MonsterRenderData {
  const buildParts = BODY_BUILDERS[archetype.bodyType];
  return {
    bodyParts: buildParts(),
    primaryColor: archetype.colorScheme.primary,
    secondaryColor:
      archetype.colorScheme.secondary ?? archetype.colorScheme.primary,
    accentColor: archetype.colorScheme.accent ?? null,
    scale: archetype.size,
  };
}
