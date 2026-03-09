/**
 * Seeded procedural chibi character config generator.
 * Fully deterministic — same seed always produces the same character.
 */

// ---------------------------------------------------------------------------
// Seeded RNG (Mulberry32)
// ---------------------------------------------------------------------------

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// FNV-1a hash (string → number)
// ---------------------------------------------------------------------------

export function hashString(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// ---------------------------------------------------------------------------
// ChibiConfig interface
// ---------------------------------------------------------------------------

export interface ChibiConfig {
  race: 'human' | 'elf' | 'dwarf' | 'orc' | 'halfling';
  job: 'mage' | 'cleric' | 'warrior' | 'ranger' | 'rogue';
  skinTone: string;
  hairColor: string;
  eyeColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  expression:
    | 'neutral'
    | 'happy'
    | 'angry'
    | 'sad'
    | 'surprised'
    | 'sleeping'
    | 'speaking';
  headSize: number;
  bodyPlumpness: number;
  hairStyle:
    | 'bald'
    | 'short'
    | 'long'
    | 'ponytail'
    | 'topknot'
    | 'braided'
    | 'wild'
    | 'hooded';
  facialHair: 'none' | 'stubble' | 'full_beard' | 'mustache';
  hasCloak: boolean;
  weaponType:
    | 'none'
    | 'staff'
    | 'sword'
    | 'mace'
    | 'bow'
    | 'dagger'
    | 'holy_book';
}

// ---------------------------------------------------------------------------
// Slot arrays
// ---------------------------------------------------------------------------

export const SLOTS = {
  race: ['human', 'elf', 'dwarf', 'orc', 'halfling'] as const,
  job: ['mage', 'cleric', 'warrior', 'ranger', 'rogue'] as const,
  expression: [
    'neutral',
    'happy',
    'angry',
    'sad',
    'surprised',
    'sleeping',
    'speaking',
  ] as const,
  hairStyle: [
    'bald',
    'short',
    'long',
    'ponytail',
    'topknot',
    'braided',
    'wild',
    'hooded',
  ] as const,
  facialHair: ['none', 'stubble', 'full_beard', 'mustache'] as const,
  weaponType: [
    'none',
    'staff',
    'sword',
    'mace',
    'bow',
    'dagger',
    'holy_book',
  ] as const,
} as const;

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

export const SKIN_PALETTES = [
  '#fce4c7',
  '#f0c8a0',
  '#d4a574',
  '#b07843',
  '#8b5e3c',
  '#5c3a1e',
] as const;

export const HAIR_PALETTES = [
  '#1a1a1a',
  '#3b2a1a',
  '#6b4226',
  '#8b6914',
  '#c4a35a',
  '#d4d4d4',
  '#8b1a1a',
  '#f5deb3',
] as const;

export const EYE_PALETTES = [
  '#4a3728',
  '#2e5e3e',
  '#3a5f8a',
  '#6b6b6b',
  '#6a3d9a',
] as const;

export const PRIMARY_DYES = [
  '#8b1a1a',
  '#1a3a6b',
  '#2e5e3e',
  '#6b3a8b',
  '#8b7032',
  '#4a4a4a',
  '#c4a35a',
  '#5b2e2e',
] as const;

export const ACCENT_METALS = [
  '#d4af37',
  '#c0c0c0',
  '#cd7f32',
  '#b87333',
] as const;

// ---------------------------------------------------------------------------
// Name pools
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Aldric',
  'Brenna',
  'Cedric',
  'Delia',
  'Eamon',
  'Faye',
  'Gareth',
  'Helena',
  'Ivar',
  'Jorin',
  'Kenna',
  'Leofric',
  'Mira',
  'Nolan',
  'Orla',
  'Perrin',
  'Quinn',
  'Roswen',
  'Silas',
  'Theron',
] as const;

const LAST_NAMES = [
  'Ashford',
  'Briarwood',
  'Copperfield',
  'Dunmore',
  'Emberstone',
  'Fairweather',
  'Greenhollow',
  'Hawthorn',
  'Ironvale',
  'Kettleburn',
  'Longmere',
  'Marshwell',
  'Northcott',
  'Oakshade',
  'Pennywhistle',
  'Ravensdale',
  'Stonehelm',
  'Thornbury',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateChibiFromSeed(seed: string | number): ChibiConfig {
  const numericSeed = typeof seed === 'string' ? hashString(seed) : seed;
  const rng = seededRng(numericSeed);

  const race = pick(SLOTS.race, rng);
  const job = pick(SLOTS.job, rng);

  // Race-specific body proportions
  let headSize: number;
  let bodyPlumpness: number;

  switch (race) {
    case 'dwarf':
      headSize = 1.35;
      bodyPlumpness = 1.2 + rng() * 0.1;
      break;
    case 'elf':
      headSize = 0.95;
      bodyPlumpness = 0.85 + rng() * 0.1;
      break;
    case 'halfling':
      headSize = 1.15;
      bodyPlumpness = 0.85;
      break;
    case 'orc':
      headSize = 1.15;
      bodyPlumpness = 1.1 + rng() * 0.2;
      break;
    default:
      headSize = 1.15;
      bodyPlumpness = 0.95 + rng() * 0.2;
      break;
  }

  return {
    race,
    job,
    skinTone: pick(SKIN_PALETTES, rng),
    hairColor: pick(HAIR_PALETTES, rng),
    eyeColor: pick(EYE_PALETTES, rng),
    primaryColor: pick(PRIMARY_DYES, rng),
    secondaryColor: pick(PRIMARY_DYES, rng),
    accentColor: pick(ACCENT_METALS, rng),
    expression: pick(SLOTS.expression, rng),
    headSize,
    bodyPlumpness,
    hairStyle: pick(SLOTS.hairStyle, rng),
    facialHair: pick(SLOTS.facialHair, rng),
    hasCloak: rng() > 0.6,
    weaponType: pick(SLOTS.weaponType, rng),
  };
}

// ---------------------------------------------------------------------------
// NPC role type and town NPC generator
// ---------------------------------------------------------------------------

export type NPCRole =
  | 'guard'
  | 'merchant'
  | 'priest'
  | 'blacksmith'
  | 'bard'
  | 'villager';

export function generateTownNPC(
  townSeed: string,
  index: number,
  role: NPCRole,
): ChibiConfig & { name: string; role: NPCRole } {
  const compoundSeed = `${townSeed}_npc_${index}_${role}`;
  const config = generateChibiFromSeed(compoundSeed);

  // Generate name from the compound seed
  const nameRng = seededRng(hashString(`${compoundSeed}_name`));
  const firstName = pick(FIRST_NAMES, nameRng);
  const lastName = pick(LAST_NAMES, nameRng);

  // Apply role-based visual overrides
  switch (role) {
    case 'guard':
      config.job = 'warrior';
      config.primaryColor = '#4a4a4a';
      config.hasCloak = true;
      config.bodyPlumpness = 1.15;
      break;
    case 'merchant':
      config.job = 'ranger';
      config.primaryColor = '#6b4226';
      config.hairStyle = 'ponytail';
      config.expression = 'happy';
      break;
    case 'priest':
      config.job = 'cleric';
      config.primaryColor = '#f5f0e0';
      config.hairColor = '#d4d4d4';
      break;
    case 'blacksmith':
      config.job = 'warrior';
      config.skinTone = '#8b5e3c';
      config.primaryColor = '#5b2e2e';
      config.hairStyle = 'topknot';
      break;
    case 'bard':
      config.job = 'mage';
      config.primaryColor = '#6b3a8b';
      config.hairStyle = 'long';
      config.expression = 'happy';
      break;
    case 'villager':
      // No overrides
      break;
  }

  return {
    ...config,
    name: `${firstName} ${lastName}`,
    role,
  };
}
