import type { RoadSpine } from '../../schemas/world.schema';
import type { ChunkType } from '../types';
import { cyrb128, mulberry32 } from './random';

export const CHUNK_SIZE = 120;
export const BLOCK_SIZE = 5;
export const VIEW_DISTANCE = 1;
export const PLAYER_HEIGHT = 1.6;
export const PLAYER_RADIUS = 0.6;

// Name generators
const TOWN_PRE = [
  'Oak',
  'River',
  'Stone',
  'Iron',
  'Winter',
  'Summer',
  'High',
  'Low',
  'Kings',
  'Queens',
  'Ash',
  'Pine',
  'Silver',
  'Golden',
  'Black',
  'White',
];
const TOWN_SUF = [
  'haven',
  'ford',
  'gate',
  'helm',
  'watch',
  'wood',
  'bury',
  'ton',
  'ville',
  'bridge',
  'keep',
  'hold',
  'stead',
  'mere',
];

/** Pastoral countryside types for chunks off the road. */
const COUNTRYSIDE_TYPES: ChunkType[] = ['WILD', 'WILD', 'WILD', 'WILD'];

/**
 * Map anchor types to chunk types.
 * Anchors are on the road (cx===0) and determine the chunk type at their location.
 */
function anchorTypeToChunkType(anchorType: string): ChunkType {
  switch (anchorType) {
    case 'VILLAGE_FRIENDLY':
    case 'VILLAGE_HOSTILE':
      return 'TOWN';
    case 'DUNGEON':
      return 'DUNGEON';
    case 'WAYPOINT':
      return 'TOWN';
    default:
      return 'ROAD';
  }
}

/**
 * Convert a chunk's z-coordinate to a road distance.
 * The road runs along the +z axis starting from cz=0.
 * Each chunk spans CHUNK_SIZE world units.
 */
export function chunkZToRoadDistance(cz: number): number {
  return cz * CHUNK_SIZE;
}

/**
 * Determine the chunk type for a given grid coordinate.
 *
 * When a roadSpine is provided, the function is road-aware:
 * - Chunks ON the road (cx === 0): type from nearest anchor, or ROAD between anchors
 * - Chunks NEAR the road (|cx| === 1): always ROAD (road shoulder / hedgerows)
 * - Chunks OFF the road (|cx| > 1): pastoral countryside (WILD with seeded variety)
 *
 * Without a roadSpine, falls back to the original hash-based logic.
 */
export function getChunkType(
  cx: number,
  cz: number,
  seedPhrase: string,
  roadSpine?: RoadSpine,
): ChunkType {
  // Legacy behavior when no road spine is provided
  if (!roadSpine) {
    if (cx === 0) {
      if (Math.abs(cz) % 3 === 0) return 'TOWN';
      return 'ROAD';
    }
    const rng = mulberry32(cyrb128(`${seedPhrase}${cx},${cz}`));
    if (rng() < 0.2) return 'DUNGEON';
    return 'WILD';
  }

  // Road-aware logic
  const distance = chunkZToRoadDistance(cz);

  // ON the road (cx === 0)
  if (cx === 0) {
    // Only consider positive distance (the road runs forward)
    if (distance < 0 || distance > roadSpine.totalDistance) {
      return 'WILD';
    }

    // Check if we're near an anchor
    const anchorThreshold = CHUNK_SIZE; // within one chunk of an anchor
    for (const anchor of roadSpine.anchors) {
      if (Math.abs(anchor.distanceFromStart - distance) < anchorThreshold) {
        return anchorTypeToChunkType(anchor.type);
      }
    }

    // Between anchors: it's road
    return 'ROAD';
  }

  // NEAR the road (|cx| === 1) — road shoulder
  if (
    Math.abs(cx) === 1 &&
    distance >= 0 &&
    distance <= roadSpine.totalDistance
  ) {
    return 'ROAD';
  }

  // OFF the road — pastoral countryside
  const rng = mulberry32(cyrb128(`${seedPhrase}${cx},${cz}`));
  return COUNTRYSIDE_TYPES[Math.floor(rng() * COUNTRYSIDE_TYPES.length)];
}

export function getChunkName(
  cx: number,
  cz: number,
  type: ChunkType,
  seedPhrase: string,
): string {
  const rng = mulberry32(cyrb128(`${seedPhrase}${cx},${cz}`));

  if (type === 'WILD') return 'The Wilderness';
  if (type === 'ROAD') return "The King's Road";

  if (type === 'TOWN') {
    const pre = TOWN_PRE[Math.floor(rng() * TOWN_PRE.length)];
    const suf = TOWN_SUF[Math.floor(rng() * TOWN_SUF.length)];
    return pre + suf;
  }

  if (type === 'DUNGEON') {
    const pre = TOWN_PRE[Math.floor(rng() * TOWN_PRE.length)];
    return `Ruins of ${pre}keep`;
  }

  return 'Unknown Lands';
}

// NPC dialogue generators - expanded with more variety
const BLACKSMITH_DIALOGUE = [
  'Weapons and armor. No haggling.',
  'Steel forged in dragon fire. Interested?',
  'Another adventurer seeking glory? I have just the blade.',
  'The best steel in the realm, or your gold back.',
  'War is coming. Best arm yourself well.',
  "I've been smithing since before your father was born. Trust my work.",
  'See this blade? Took three moons to perfect. Worth every day.',
  "The ore from the northern mines is finest. That's what I use.",
  "Lost my apprentice to the dungeons. Don't make the same mistake unprepared.",
  'A good sword is worth more than gold when danger comes.',
];

const INNKEEPER_DIALOGUE = [
  'Warm beds and cold ale. Welcome to the inn.',
  'You look weary, traveler. Rest here tonight.',
  'The stew is fresh. The company... varies.',
  'Heard strange tales from the eastern ruins lately.',
  'Coin for a room? The rats are mostly gone.',
  'A bard passed through last night. Sang of heroes and fallen kingdoms.',
  "The road's been quiet lately. Too quiet for my liking.",
  'Mind the third step on the stairs. Been meaning to fix it.',
  'Had a strange fellow asking about ancient artifacts yesterday. Collector, I suspect.',
  'Best ale in three settlements. My own recipe.',
  "The fire's warm and the shadows are friendly here. Rest easy.",
];

const WANDERER_DIALOGUE = [
  'The Emperor has decreed new taxes. Times are hard.',
  'Have you seen the lights in the sky at night?',
  'Beware the dungeons to the east. Many enter, few return.',
  'I once was an adventurer like you...',
  'The old gods stir. Can you not feel it?',
  'Trade caravans stopped coming. Wonder why.',
  'My grandmother spoke of dragons. I thought them myth.',
  'The harvest was poor this year. Dark omens.',
  'I seek the ruins where my brother disappeared. Have you seen them?',
  'The ancient relics... they whisper if you listen. Best not to.',
  'These roads were safer in my youth. Now shadows lurk at every turn.',
  "I've walked every path in this realm. Still find new wonders.",
  'The wind carries stories from distant lands. Listen carefully.',
  'Met a wise sage once. Said the world is older than we know.',
  "There's a chill in the air tonight. Feels like change is coming.",
  "I'm searching for a flower that blooms only at midnight. Seen one?",
];

const MERCHANT_DIALOGUE = [
  'Rare wares from distant lands! Take a look.',
  'Potions, scrolls, oddities... What catches your eye?',
  'I have something special, for the right price.',
  'The roads grow dangerous. My prices reflect the risk.',
  'From the sunken cities of the south, I bring treasures unknown.',
  'This amulet? Belonged to a king. Which one? I cannot say.',
  'I trade in secrets as much as goods. Both are valuable.',
  'The eastern markets are closed. Supply is limited. Buy now.',
  "I've seen you eyeing that... Ah, you have fine taste.",
  'Not everything I sell is... strictly permitted. But all is valuable.',
];

export function getRandomDialogue(type: string, rng: () => number): string {
  let pool: string[];
  switch (type) {
    case 'blacksmith':
      pool = BLACKSMITH_DIALOGUE;
      break;
    case 'innkeeper':
      pool = INNKEEPER_DIALOGUE;
      break;
    case 'merchant':
      pool = MERCHANT_DIALOGUE;
      break;
    default:
      pool = WANDERER_DIALOGUE;
  }
  return pool[Math.floor(rng() * pool.length)];
}

// NPC name generators
const FIRST_NAMES_M = [
  'Bjorn',
  'Erik',
  'Magnus',
  'Aldric',
  'Cedric',
  'Gareth',
  'Roland',
  'Theron',
  'Viktor',
  'Wolfram',
];
const FIRST_NAMES_F = [
  'Hilda',
  'Freya',
  'Ingrid',
  'Astrid',
  'Elara',
  'Lyra',
  'Rowena',
  'Sigrid',
  'Thora',
  'Ysabel',
];
const SURNAMES = [
  'Iron-Arm',
  'Stonehand',
  'Swiftfoot',
  'Darkhollow',
  'Brightblade',
  'Thornwood',
  'Grimshaw',
  'Fairweather',
];

export function getRandomNPCName(rng: () => number): string {
  const isFemale = rng() > 0.5;
  const firstName = isFemale
    ? FIRST_NAMES_F[Math.floor(rng() * FIRST_NAMES_F.length)]
    : FIRST_NAMES_M[Math.floor(rng() * FIRST_NAMES_M.length)];

  if (rng() > 0.6) {
    const surname = SURNAMES[Math.floor(rng() * SURNAMES.length)];
    return `${firstName} ${surname}`;
  }
  return firstName;
}
