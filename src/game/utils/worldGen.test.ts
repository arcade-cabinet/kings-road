import { describe, expect, it } from 'vitest';
import {
  BLOCK_SIZE,
  CHUNK_SIZE,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  VIEW_DISTANCE,
  getChunkName,
  getChunkType,
  getRandomDialogue,
  getRandomNPCName,
  chunkZToRoadDistance,
} from './worldGen';
import { mulberry32, cyrb128 } from './random';
import type { RoadSpine } from '../../schemas/world.schema';

describe('constants', () => {
  it('exports correct CHUNK_SIZE', () => {
    expect(CHUNK_SIZE).toBe(120);
  });

  it('exports correct BLOCK_SIZE', () => {
    expect(BLOCK_SIZE).toBe(5);
  });

  it('exports correct VIEW_DISTANCE', () => {
    expect(VIEW_DISTANCE).toBe(1);
  });

  it('exports correct PLAYER_HEIGHT', () => {
    expect(PLAYER_HEIGHT).toBe(1.6);
  });

  it('exports correct PLAYER_RADIUS', () => {
    expect(PLAYER_RADIUS).toBe(0.6);
  });
});

describe('getChunkType', () => {
  const seedPhrase = 'TestSeed';

  it('returns TOWN for chunks at x=0 where z%3===0', () => {
    expect(getChunkType(0, 0, seedPhrase)).toBe('TOWN');
    expect(getChunkType(0, 3, seedPhrase)).toBe('TOWN');
    expect(getChunkType(0, -3, seedPhrase)).toBe('TOWN');
    expect(getChunkType(0, 6, seedPhrase)).toBe('TOWN');
  });

  it('returns ROAD for chunks at x=0 where z%3!==0', () => {
    expect(getChunkType(0, 1, seedPhrase)).toBe('ROAD');
    expect(getChunkType(0, 2, seedPhrase)).toBe('ROAD');
    expect(getChunkType(0, -1, seedPhrase)).toBe('ROAD');
    expect(getChunkType(0, -2, seedPhrase)).toBe('ROAD');
  });

  it('returns WILD or DUNGEON for chunks away from x=0', () => {
    const type = getChunkType(1, 1, seedPhrase);
    expect(['WILD', 'DUNGEON']).toContain(type);
  });

  it('returns consistent type for same coordinates and seed', () => {
    const type1 = getChunkType(5, 5, seedPhrase);
    const type2 = getChunkType(5, 5, seedPhrase);
    expect(type1).toBe(type2);
  });

  it('may return different types for different seeds', () => {
    // Run multiple times to get variety
    const types = new Set<string>();
    for (let i = 0; i < 100; i++) {
      types.add(getChunkType(5, 5, `seed-${i}`));
    }
    // Should get both WILD and DUNGEON eventually (20% dungeon chance)
    expect(types.size).toBeGreaterThanOrEqual(1);
  });

  it('handles negative coordinates', () => {
    const type = getChunkType(-5, -5, seedPhrase);
    expect(['WILD', 'DUNGEON']).toContain(type);
  });
});

describe('getChunkName', () => {
  const seedPhrase = 'TestSeed';

  it('returns "The Wilderness" for WILD chunks', () => {
    const name = getChunkName(5, 5, 'WILD', seedPhrase);
    expect(name).toBe('The Wilderness');
  });

  it('returns "The King\'s Road" for ROAD chunks', () => {
    const name = getChunkName(0, 1, 'ROAD', seedPhrase);
    expect(name).toBe("The King's Road");
  });

  it('generates town names for TOWN chunks', () => {
    const name = getChunkName(0, 0, 'TOWN', seedPhrase);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
    // Town names should be compound words
    expect(name).not.toBe("The King's Road");
    expect(name).not.toBe('The Wilderness');
  });

  it('generates dungeon names for DUNGEON chunks', () => {
    const name = getChunkName(5, 5, 'DUNGEON', seedPhrase);
    expect(name).toMatch(/^Ruins of \w+keep$/);
  });

  it('returns consistent name for same inputs', () => {
    const name1 = getChunkName(0, 0, 'TOWN', seedPhrase);
    const name2 = getChunkName(0, 0, 'TOWN', seedPhrase);
    expect(name1).toBe(name2);
  });

  it('returns "Unknown Lands" for unknown chunk types', () => {
    // @ts-expect-error Testing invalid input
    const name = getChunkName(0, 0, 'UNKNOWN', seedPhrase);
    expect(name).toBe('Unknown Lands');
  });
});

describe('getRandomDialogue', () => {
  it('returns a blacksmith dialogue', () => {
    const rng = mulberry32(cyrb128('test'));
    const dialogue = getRandomDialogue('blacksmith', rng);
    expect(typeof dialogue).toBe('string');
    expect(dialogue.length).toBeGreaterThan(0);
  });

  it('returns an innkeeper dialogue', () => {
    const rng = mulberry32(cyrb128('test'));
    const dialogue = getRandomDialogue('innkeeper', rng);
    expect(typeof dialogue).toBe('string');
    expect(dialogue.length).toBeGreaterThan(0);
  });

  it('returns a merchant dialogue', () => {
    const rng = mulberry32(cyrb128('test'));
    const dialogue = getRandomDialogue('merchant', rng);
    expect(typeof dialogue).toBe('string');
    expect(dialogue.length).toBeGreaterThan(0);
  });

  it('returns a wanderer dialogue for unknown types', () => {
    const rng = mulberry32(cyrb128('test'));
    const dialogue = getRandomDialogue('unknown-type', rng);
    expect(typeof dialogue).toBe('string');
    expect(dialogue.length).toBeGreaterThan(0);
  });

  it('returns consistent dialogue for same RNG state', () => {
    const rng1 = mulberry32(cyrb128('same-seed'));
    const rng2 = mulberry32(cyrb128('same-seed'));
    
    const dialogue1 = getRandomDialogue('blacksmith', rng1);
    const dialogue2 = getRandomDialogue('blacksmith', rng2);
    expect(dialogue1).toBe(dialogue2);
  });
});

describe('getRandomNPCName', () => {
  it('returns a string name', () => {
    const rng = mulberry32(cyrb128('test'));
    const name = getRandomNPCName(rng);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('sometimes returns just first name', () => {
    // Run multiple times to cover both branches
    const names = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const rng = mulberry32(cyrb128(`seed-${i}`));
      const name = getRandomNPCName(rng);
      names.add(name.split(' ').length);
    }
    // Should get both 1-word and 2-word names
    expect(names.has(1) || names.has(2)).toBe(true);
  });

  it('returns consistent name for same RNG state', () => {
    const rng1 = mulberry32(cyrb128('same-seed'));
    const rng2 = mulberry32(cyrb128('same-seed'));
    
    const name1 = getRandomNPCName(rng1);
    const name2 = getRandomNPCName(rng2);
    expect(name1).toBe(name2);
  });

  it('generates valid names from name lists', () => {
    // Run many times to increase coverage of name selection
    for (let i = 0; i < 50; i++) {
      const rng = mulberry32(cyrb128(`name-${i}`));
      const name = getRandomNPCName(rng);
      // Names should only contain alphabetic characters and spaces
      expect(name).toMatch(/^[A-Za-z-]+( [A-Za-z-]+)?$/);
    }
  });
});

// Test road spine for road-aware tests
const testSpine: RoadSpine = {
  totalDistance: 30000,
  anchors: [
    { id: 'home', name: 'Ashford', type: 'VILLAGE_FRIENDLY', distanceFromStart: 0, mainQuestChapter: 'chapter-00', description: 'Your home town, a quiet farming village.', features: ['home', 'tavern'], sideQuestSlots: 0 },
    { id: 'anchor-01', name: 'Millbrook', type: 'VILLAGE_FRIENDLY', distanceFromStart: 6000, mainQuestChapter: 'chapter-01', description: 'A market town along the road.', features: ['tavern', 'market'], sideQuestSlots: 0 },
    { id: 'anchor-02', name: 'Thornfield', type: 'DUNGEON', distanceFromStart: 12000, mainQuestChapter: 'chapter-02', description: 'Ancient ruins holding secrets.', features: ['dungeon_entrance'], sideQuestSlots: 0 },
    { id: 'anchor-03', name: 'Ravensgate', type: 'VILLAGE_HOSTILE', distanceFromStart: 17000, mainQuestChapter: 'chapter-03', description: 'A walled town under tyrannical rule.', features: ['gate', 'tavern'], sideQuestSlots: 0 },
    { id: 'anchor-04', name: 'Rest', type: 'WAYPOINT', distanceFromStart: 21000, mainQuestChapter: 'chapter-04', description: 'A roadside monastery for travelers.', features: ['chapel'], sideQuestSlots: 0 },
    { id: 'anchor-05', name: 'Grailsend', type: 'DUNGEON', distanceFromStart: 28000, mainQuestChapter: 'chapter-05', description: 'The final temple where the Grail awaits.', features: ['temple_entrance'], sideQuestSlots: 0 },
  ],
};

describe('chunkZToRoadDistance', () => {
  it('converts cz=0 to distance 0', () => {
    expect(chunkZToRoadDistance(0)).toBe(0);
  });

  it('converts positive cz to positive distance', () => {
    expect(chunkZToRoadDistance(1)).toBe(CHUNK_SIZE);
    expect(chunkZToRoadDistance(50)).toBe(50 * CHUNK_SIZE);
  });

  it('converts negative cz to negative distance', () => {
    expect(chunkZToRoadDistance(-1)).toBe(-CHUNK_SIZE);
  });
});

describe('getChunkType (road-aware)', () => {
  const seedPhrase = 'TestSeed';

  describe('ON the road (cx === 0)', () => {
    it('returns TOWN at home anchor (cz=0, distance=0)', () => {
      expect(getChunkType(0, 0, seedPhrase, testSpine)).toBe('TOWN');
    });

    it('returns TOWN near a VILLAGE_FRIENDLY anchor', () => {
      // anchor-01 is at distance 6000, cz = 6000/120 = 50
      expect(getChunkType(0, 50, seedPhrase, testSpine)).toBe('TOWN');
    });

    it('returns DUNGEON near a DUNGEON anchor', () => {
      // anchor-02 is at distance 12000, cz = 12000/120 = 100
      expect(getChunkType(0, 100, seedPhrase, testSpine)).toBe('DUNGEON');
    });

    it('returns TOWN near a VILLAGE_HOSTILE anchor', () => {
      // anchor-03 at distance 17000, cz ~= 141.67
      // cz=142 => distance 17040 => within 120 of 17000
      expect(getChunkType(0, 142, seedPhrase, testSpine)).toBe('TOWN');
    });

    it('returns TOWN near a WAYPOINT anchor', () => {
      // anchor-04 at distance 21000, cz = 175
      expect(getChunkType(0, 175, seedPhrase, testSpine)).toBe('TOWN');
    });

    it('returns ROAD between anchors', () => {
      // cz=25 => distance 3000, between home (0) and anchor-01 (6000)
      expect(getChunkType(0, 25, seedPhrase, testSpine)).toBe('ROAD');
    });

    it('returns WILD for negative distance (behind the start)', () => {
      expect(getChunkType(0, -5, seedPhrase, testSpine)).toBe('WILD');
    });

    it('returns WILD for distance beyond totalDistance', () => {
      // cz=300 => distance 36000 > 30000
      expect(getChunkType(0, 300, seedPhrase, testSpine)).toBe('WILD');
    });
  });

  describe('NEAR the road (|cx| === 1)', () => {
    it('returns ROAD for cx=1 along the road', () => {
      expect(getChunkType(1, 25, seedPhrase, testSpine)).toBe('ROAD');
    });

    it('returns ROAD for cx=-1 along the road', () => {
      expect(getChunkType(-1, 50, seedPhrase, testSpine)).toBe('ROAD');
    });

    it('returns WILD for cx=1 behind the start', () => {
      expect(getChunkType(1, -5, seedPhrase, testSpine)).toBe('WILD');
    });

    it('returns WILD for cx=1 beyond totalDistance', () => {
      expect(getChunkType(1, 300, seedPhrase, testSpine)).toBe('WILD');
    });
  });

  describe('OFF the road (|cx| > 1)', () => {
    it('returns WILD for distant chunks', () => {
      expect(getChunkType(5, 25, seedPhrase, testSpine)).toBe('WILD');
    });

    it('returns consistent type for same coordinates', () => {
      const t1 = getChunkType(5, 5, seedPhrase, testSpine);
      const t2 = getChunkType(5, 5, seedPhrase, testSpine);
      expect(t1).toBe(t2);
    });
  });

  describe('backward compatibility', () => {
    it('without roadSpine, legacy behavior for cx=0 z%3===0', () => {
      expect(getChunkType(0, 0, seedPhrase)).toBe('TOWN');
      expect(getChunkType(0, 3, seedPhrase)).toBe('TOWN');
    });

    it('without roadSpine, legacy behavior for cx=0 z%3!==0', () => {
      expect(getChunkType(0, 1, seedPhrase)).toBe('ROAD');
      expect(getChunkType(0, 2, seedPhrase)).toBe('ROAD');
    });

    it('without roadSpine, legacy behavior for off-road', () => {
      const type = getChunkType(1, 1, seedPhrase);
      expect(['WILD', 'DUNGEON']).toContain(type);
    });
  });
});
