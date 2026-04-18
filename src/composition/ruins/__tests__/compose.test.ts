import { describe, expect, it } from 'vitest';
import type { BiomeConfig } from '@/biome';
import { getAssetsByCategory, RUIN_ASSETS, weightedPick } from '../assets';
import { composeRuins } from '../compose';
import type { TownConfig } from '../types';

const MOCK_BIOME: BiomeConfig = {
  id: 'thornfield',
  name: 'Thornfield Ruins',
  lighting: {
    hdri: 'thornfield-dawn',
    ambientColor: '#a0b0c0',
    ambientIntensity: 0.6,
    directionalColor: '#d4c8a0',
    directionalIntensity: 0.8,
    fogColor: '#8899aa',
    fogNear: 20,
    fogFar: 80,
  },
  terrain: {
    heightmap: 'thornfield',
    scale: 1,
    materials: ['mossy-stone'],
    displacementScale: 0,
  },
  foliage: { density: 0.6, species: [] },
  weather: { defaultState: 'fog_thick', states: [], transitionDuration: 10 },
  audio: { ambient: [], footstepMaterial: 'grass' },
  monsterPool: ['skeleton'],
};

const MOCK_TOWN: TownConfig = {
  id: 'thornfield-village',
  center: { x: 0, y: 0, z: 0 },
  radius: 40,
};

describe('composeRuins', () => {
  it('returns at least 21 placements for a town-sized chunk', () => {
    const result = composeRuins(MOCK_BIOME, MOCK_TOWN, 'test-seed');
    expect(result.length).toBeGreaterThanOrEqual(21);
  });

  it('returns no more than 38 placements', () => {
    const result = composeRuins(MOCK_BIOME, MOCK_TOWN, 'test-seed');
    expect(result.length).toBeLessThanOrEqual(38);
  });

  it('determinism — same inputs produce identical output', () => {
    const a = composeRuins(MOCK_BIOME, MOCK_TOWN, 'seed-abc');
    const b = composeRuins(MOCK_BIOME, MOCK_TOWN, 'seed-abc');
    expect(a).toEqual(b);
  });

  it('different seeds produce different output', () => {
    const a = composeRuins(MOCK_BIOME, MOCK_TOWN, 'seed-1');
    const b = composeRuins(MOCK_BIOME, MOCK_TOWN, 'seed-2');
    expect(a).not.toEqual(b);
  });

  it('different town ids produce different output for same seed', () => {
    const townA = { ...MOCK_TOWN, id: 'town-alpha' };
    const townB = { ...MOCK_TOWN, id: 'town-beta' };
    const a = composeRuins(MOCK_BIOME, townA, 'same-seed');
    const b = composeRuins(MOCK_BIOME, townB, 'same-seed');
    expect(a).not.toEqual(b);
  });

  it('all assetIds are GLB paths known in RUIN_ASSETS (no undefined paths)', () => {
    const validPaths = new Set(
      Object.values(RUIN_ASSETS).map((def) =>
        def.path.replace(/^\/assets\//, ''),
      ),
    );
    const result = composeRuins(MOCK_BIOME, MOCK_TOWN, 'asset-check');
    for (const p of result) {
      expect(
        validPaths.has(p.assetId),
        `Unknown assetId path: ${p.assetId}`,
      ).toBe(true);
    }
  });

  it('positions are within the town radius', () => {
    const result = composeRuins(MOCK_BIOME, MOCK_TOWN, 'bounds-check');
    for (const p of result) {
      const dx = p.position.x - MOCK_TOWN.center.x;
      const dz = p.position.z - MOCK_TOWN.center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      expect(dist).toBeLessThanOrEqual(MOCK_TOWN.radius + 0.001);
    }
  });

  it('no Three.js objects in placement output', () => {
    const result = composeRuins(MOCK_BIOME, MOCK_TOWN, 'no-threejs');
    for (const p of result) {
      expect(typeof p.position).toBe('object');
      expect(typeof p.position.x).toBe('number');
      expect(typeof p.assetId).toBe('string');
      expect(typeof p.scale).toBe('number');
    }
  });
});

describe('weightedPick', () => {
  it('throws on empty array instead of crashing with undefined', () => {
    expect(() => weightedPick([], () => 0.5)).toThrow('empty asset array');
  });

  it('returns a valid asset id from a non-empty array', () => {
    const ids = getAssetsByCategory('graves');
    expect(ids.length).toBeGreaterThan(0);
    const rng = (() => {
      let i = 0;
      const vals = [0.1, 0.5, 0.9];
      return () => vals[i++ % vals.length];
    })();
    const result = weightedPick(ids, rng);
    expect(typeof result).toBe('string');
    expect(RUIN_ASSETS).toHaveProperty(result);
  });

  it('all five categories have at least one asset', () => {
    for (const cat of [
      'walls',
      'graves',
      'scatter',
      'structure',
      'flora',
    ] as const) {
      expect(getAssetsByCategory(cat).length).toBeGreaterThan(0);
    }
  });
});
