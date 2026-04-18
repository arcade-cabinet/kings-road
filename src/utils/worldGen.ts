import type { KingdomMap, MapTile, Settlement } from '@/schemas/kingdom.schema';
import type { ChunkType } from '@/types/game';
import { getKingdomTile, getSettlementAt } from '@/world/kingdom-gen';

export const CHUNK_SIZE = 120;
export const BLOCK_SIZE = 5;
export const VIEW_DISTANCE = 1;
export const PLAYER_HEIGHT = 1.6;
export const PLAYER_RADIUS = 0.6;

// ── Height constants ──────────────────────────────────────────────────

/** Maximum world-space height for terrain (elevation 1.0 maps to this) */
export const MAX_TERRAIN_HEIGHT = 30;

/** World-space height for ocean/void tiles */
export const OCEAN_HEIGHT = -2;

// ── Kingdom-map-aware chunk resolution ────────────────────────────────

/**
 * Derive ChunkType from the kingdom map tile at grid coordinates.
 *
 * The kingdom grid uses the same coordinate system as chunks (1 tile = 1 chunk).
 * Tiles outside the map bounds are treated as ocean (returns null).
 *
 * When a settlement is found, it's included in the result so callers can
 * look up the appropriate town config by settlement ID.
 */
export function getChunkTypeFromKingdom(
  kingdomMap: KingdomMap,
  cx: number,
  cz: number,
): {
  type: ChunkType;
  tile: MapTile;
  name: string;
  settlement?: Settlement;
} | null {
  const tile = getKingdomTile(kingdomMap, cx, cz);
  if (!tile || !tile.isLand) return null;

  // Check for settlement at this tile
  const settlement = getSettlementAt(kingdomMap, cx, cz);
  if (settlement) {
    return { type: 'TOWN', tile, name: settlement.name, settlement };
  }

  // Road tiles
  if (tile.hasRoad) {
    return { type: 'ROAD', tile, name: "The King's Road" };
  }

  // Everything else is wilderness
  return { type: 'WILD', tile, name: biomeToName(tile.biome) };
}

/** Map biome to a display name for the location banner. */
function biomeToName(biome: string): string {
  switch (biome) {
    case 'meadow':
      return 'The Meadows';
    case 'forest':
      return 'The Forest';
    case 'deep_forest':
      return 'The Deepwood';
    case 'hills':
      return 'The Hills';
    case 'farmland':
      return 'The Farmlands';
    case 'moor':
      return 'The Moors';
    case 'riverside':
      return 'The Riverside';
    case 'coast':
      return 'The Coast';
    case 'mountain':
      return 'The Mountains';
    case 'swamp':
      return 'The Marshes';
    case 'highland':
      return 'The Highlands';
    default:
      return 'The Wilderness';
  }
}

/**
 * Get terrain elevation at a world position, interpolated from the kingdom grid.
 *
 * The kingdom grid has one elevation sample per chunk (CHUNK_SIZE spacing).
 * We bilinearly interpolate between the four nearest grid points for smooth
 * terrain within a chunk.
 *
 * Returns world-space height (0 for ocean, up to MAX_TERRAIN_HEIGHT for mountains).
 */
export function getTerrainHeight(
  kingdomMap: KingdomMap,
  worldX: number,
  worldZ: number,
): number {
  // Convert to continuous grid coordinates
  const gx = worldX / CHUNK_SIZE;
  const gz = worldZ / CHUNK_SIZE;

  // Integer grid coordinates of the four surrounding tiles
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const x1 = x0 + 1;
  const z1 = z0 + 1;

  // Fractional position within the cell
  const fx = gx - x0;
  const fz = gz - z0;

  // Sample elevation at four corners (0 for out-of-bounds / ocean)
  const e00 = tileElevation(kingdomMap, x0, z0);
  const e10 = tileElevation(kingdomMap, x1, z0);
  const e01 = tileElevation(kingdomMap, x0, z1);
  const e11 = tileElevation(kingdomMap, x1, z1);

  // Bilinear interpolation
  const e0 = e00 * (1 - fx) + e10 * fx;
  const e1 = e01 * (1 - fx) + e11 * fx;
  const elevation = e0 * (1 - fz) + e1 * fz;

  return elevation * MAX_TERRAIN_HEIGHT;
}

/** Get elevation for a single grid tile. Returns 0 for ocean/out-of-bounds. */
function tileElevation(map: KingdomMap, gx: number, gy: number): number {
  const tile = getKingdomTile(map, gx, gy);
  if (!tile || !tile.isLand) return 0;
  return tile.elevation;
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
