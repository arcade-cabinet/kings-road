import type * as THREE from 'three';
import type { NPCDefinition } from '../../schemas/npc.schema';
import type { NPCBlueprint } from '../../schemas/npc-blueprint.schema';
import type { ChibiConfig } from './chibi-generator';
import { generateFaceTexture } from './face-texture';

export interface NPCRenderData {
  torsoHeight: number;
  torsoRadiusTop: number;
  torsoRadiusBottom: number;
  headRadius: number;
  legHeight: number;
  armLength: number;
  faceTexture: THREE.CanvasTexture;
  clothPrimary: string;
  clothSecondary: string;
  skinColor: string;
  accessories: string[];
}

const SKIN_COLORS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];

/** Build render data from a fully-specified blueprint (fixed story NPCs). */
export function buildNPCRenderData(blueprint: NPCBlueprint): NPCRenderData {
  const { bodyBuild, face, clothPalette, accessories } = blueprint;

  // Scale body dimensions based on build
  const heightScale = bodyBuild.height;
  const widthScale = bodyBuild.width;

  const torsoHeight = 0.7 * heightScale;
  const torsoRadiusTop = 0.25 * widthScale;
  const torsoRadiusBottom = 0.22 * widthScale;
  const headRadius = 0.28;
  const legHeight = 0.55 * heightScale;
  const armLength = 0.45 * heightScale;

  const faceTexture = generateFaceTexture(face);
  const skinColor = SKIN_COLORS[face.skinTone] ?? SKIN_COLORS[2];

  return {
    torsoHeight,
    torsoRadiusTop,
    torsoRadiusBottom,
    headRadius,
    legHeight,
    armLength,
    faceTexture,
    clothPrimary: clothPalette.primary,
    clothSecondary: clothPalette.secondary ?? clothPalette.primary,
    skinColor,
    accessories: accessories ?? [],
  };
}

// ---------------------------------------------------------------------------
// Blueprint → ChibiConfig bridge
// ---------------------------------------------------------------------------

const BLUEPRINT_SKIN_COLORS = [
  '#ffdbac',
  '#f1c27d',
  '#e0ac69',
  '#c68642',
  '#8d5524',
];

/** Map weapon accessory names to ChibiConfig weaponType */
function inferWeapon(accessories: string[]): ChibiConfig['weaponType'] {
  if (accessories.includes('hammer') || accessories.includes('tongs'))
    return 'mace';
  if (accessories.includes('holy_book')) return 'holy_book';
  if (accessories.includes('scroll')) return 'staff';
  return 'none';
}

/** Map archetype string to a job class for rendering. */
function inferJob(archetype: string): ChibiConfig['job'] {
  switch (archetype) {
    case 'blacksmith':
    case 'guard':
    case 'captain':
    case 'knight':
    case 'jailer':
    case 'watchman':
      return 'warrior';
    case 'priest':
    case 'healer':
      return 'cleric';
    case 'scholar':
    case 'hermit':
      return 'mage';
    case 'merchant':
    case 'farmer':
    case 'miller':
    case 'innkeeper':
    case 'stablehand':
      return 'ranger';
    case 'bandit':
      return 'rogue';
    default:
      return 'ranger';
  }
}

/**
 * Convert an NPCBlueprint into a ChibiConfig for the upgraded renderer.
 * Bridges the existing content pipeline with the new chibi character system.
 */
export function blueprintToChibiConfig(blueprint: NPCBlueprint): ChibiConfig {
  const { face, bodyBuild, clothPalette, accessories = [] } = blueprint;

  // Map blueprint hairStyle (4 options) to ChibiConfig hairStyle (8 options)
  const hairStyle: ChibiConfig['hairStyle'] =
    face.hairStyle === 'bald' ||
    face.hairStyle === 'short' ||
    face.hairStyle === 'long' ||
    face.hairStyle === 'hooded'
      ? face.hairStyle
      : 'short';

  return {
    race: 'human',
    job: inferJob(blueprint.archetype),
    skinTone: BLUEPRINT_SKIN_COLORS[face.skinTone] ?? BLUEPRINT_SKIN_COLORS[2],
    hairColor: face.hairColor,
    eyeColor:
      face.eyeColor === 'brown'
        ? '#4a3728'
        : face.eyeColor === 'blue'
          ? '#3a5f8a'
          : face.eyeColor === 'green'
            ? '#2e5e3e'
            : '#6b6b6b',
    primaryColor: clothPalette.primary,
    secondaryColor: clothPalette.secondary ?? clothPalette.primary,
    accentColor: '#d4af37',
    expression: 'neutral',
    headSize: 1.15,
    bodyPlumpness: bodyBuild.width,
    hairStyle,
    facialHair: face.facialHair,
    hasCloak: accessories.includes('shawl') || accessories.includes('robes'),
    weaponType: inferWeapon(accessories),
  };
}

// ---------------------------------------------------------------------------
// Seeded random helpers
// ---------------------------------------------------------------------------

/** Simple seeded PRNG (mulberry32) */
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  if (arr.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  return arr[Math.floor(rng() * arr.length)];
}

function rangeVal(range: [number, number], rng: () => number): number {
  return range[0] + rng() * (range[1] - range[0]);
}

function rangeInt(range: [number, number], rng: () => number): number {
  return Math.floor(range[0] + rng() * (range[1] - range[0] + 1));
}

// ---------------------------------------------------------------------------
// Archetype-based generation
// ---------------------------------------------------------------------------

export interface GeneratedNPC {
  /** Unique instance id (e.g. "blacksmith-7a3f") */
  id: string;
  name: string;
  archetype: string;
  displayTitle?: string;
  greeting: string;
  idleText?: string;
  blueprint: NPCBlueprint;
}

/**
 * Generate a unique NPC instance from an archetype definition and a seed.
 * The same archetype + seed always produces the same NPC (deterministic).
 *
 * Use for procedural world population: scatter NPCs along roads, in
 * villages, at camp sites — each will be visually distinct but instantly
 * recognizable as their archetype.
 */
export function generateNPCFromArchetype(
  archetype: NPCDefinition,
  seed: number,
): GeneratedNPC {
  const rng = seededRng(seed);
  const suffix = ((seed >>> 0) % 0xffff).toString(16).padStart(4, '0');
  const id = `${archetype.archetype}-${suffix}`;

  // Pick a name
  const name = pick(archetype.namePool, rng);

  // Pick greeting text
  const greeting = pick(archetype.greetingPool, rng).text;

  // Pick idle text if available
  const idleText = archetype.idlePool
    ? pick(archetype.idlePool, rng).text
    : undefined;

  // Generate face from slots (or use defaults)
  const slots = archetype.faceSlots;
  const face = slots
    ? {
        skinTone: rangeInt(slots.skinToneRange as [number, number], rng),
        eyeColor: pick(slots.eyeColors, rng) as
          | 'brown'
          | 'blue'
          | 'green'
          | 'gray',
        hairStyle: pick(slots.hairStyles, rng) as
          | 'bald'
          | 'short'
          | 'long'
          | 'hooded',
        hairColor: pick(slots.hairColors, rng),
        facialHair: pick(slots.facialHairOptions, rng) as
          | 'none'
          | 'stubble'
          | 'full_beard'
          | 'mustache',
      }
    : {
        skinTone: Math.floor(rng() * 5),
        eyeColor: pick(['brown', 'blue', 'green', 'gray'] as const, rng),
        hairStyle: pick(['bald', 'short', 'long'] as const, rng),
        hairColor: pick(
          ['#1a1a1a', '#4a3020', '#8a7060', '#c4a060'] as const,
          rng,
        ),
        facialHair: pick(['none', 'stubble', 'full_beard'] as const, rng),
      };

  // Generate body build from ranges (or use defaults)
  const vis = archetype.visualIdentity;
  const bodyBuild = vis
    ? {
        height: rangeVal(vis.bodyBuild.heightRange as [number, number], rng),
        width: rangeVal(vis.bodyBuild.widthRange as [number, number], rng),
      }
    : { height: 0.85 + rng() * 0.3, width: 0.85 + rng() * 0.3 };

  // Build cloth palette
  const clothPalette = vis
    ? {
        primary:
          vis.clothPalette.variations && rng() > 0.5
            ? pick(vis.clothPalette.variations, rng)
            : vis.clothPalette.primary,
        secondary: vis.clothPalette.secondary,
      }
    : {
        primary: archetype.appearance?.clothColor ?? '#4a3a2a',
      };

  // Build accessories: always signature + random optional
  const accessories: string[] = [];
  if (vis) {
    accessories.push(...vis.signatureAccessories);
    for (const opt of vis.optionalAccessories) {
      if (rng() > 0.6) accessories.push(opt);
    }
  } else if (archetype.appearance?.accessory) {
    accessories.push(archetype.appearance.accessory);
  }

  // Build behavior
  const behavior = archetype.behavior ?? {
    idleStyle: 'idle' as const,
    interactionVerb: 'TALK',
    walkNodes: false,
  };

  const blueprint: NPCBlueprint = {
    id,
    name,
    archetype: archetype.archetype,
    fixed: false,
    bodyBuild,
    face,
    accessories,
    clothPalette,
    behavior,
  };

  return {
    id,
    name,
    archetype: archetype.archetype,
    displayTitle: archetype.displayTitle,
    greeting,
    idleText,
    blueprint,
  };
}
