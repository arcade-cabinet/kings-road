import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildDisplacedGeometry } from '../displacement';
import type { HeightmapData } from '../heightmap';
import { sampleHeightmap } from '../heightmap';
import { buildSplatMap } from '../splat';

// ── Fixture heightmap (4×4, values 0–1) ──────────────────────────────────────

const FIXTURE_4X4: HeightmapData = {
  width: 4,
  height: 4,
  data: new Float32Array([
    0.0, 0.2, 0.4, 0.6, 0.1, 0.3, 0.5, 0.7, 0.2, 0.4, 0.6, 0.8, 0.3, 0.5, 0.7,
    1.0,
  ]),
};

// ── sampleHeightmap ───────────────────────────────────────────────────────────

describe('sampleHeightmap', () => {
  it('returns corner values exactly at corners', () => {
    expect(sampleHeightmap(FIXTURE_4X4, 0, 0)).toBeCloseTo(0.0, 5);
    expect(sampleHeightmap(FIXTURE_4X4, 1, 1)).toBeCloseTo(1.0, 5);
    expect(sampleHeightmap(FIXTURE_4X4, 0, 1)).toBeCloseTo(0.3, 5);
    expect(sampleHeightmap(FIXTURE_4X4, 1, 0)).toBeCloseTo(0.6, 5);
  });

  it('bilinearly interpolates midpoint', () => {
    // At u=0.5, v=0.5 — center of the grid
    const h = sampleHeightmap(FIXTURE_4X4, 0.5, 0.5);
    expect(h).toBeGreaterThan(0.3);
    expect(h).toBeLessThan(0.7);
  });

  it('clamps UV outside [0,1]', () => {
    const clampedNeg = sampleHeightmap(FIXTURE_4X4, -0.5, -0.5);
    const clampedOver = sampleHeightmap(FIXTURE_4X4, 1.5, 1.5);
    expect(clampedNeg).toBeCloseTo(sampleHeightmap(FIXTURE_4X4, 0, 0), 5);
    expect(clampedOver).toBeCloseTo(sampleHeightmap(FIXTURE_4X4, 1, 1), 5);
  });
});

// ── buildDisplacedGeometry ────────────────────────────────────────────────────

describe('buildDisplacedGeometry', () => {
  it('returns a BufferGeometry with position, normal, uv, uv2 attributes', () => {
    const geo = buildDisplacedGeometry(FIXTURE_4X4, {
      chunkSize: 100,
      chunkCx: 0,
      chunkCz: 0,
      totalChunks: 4,
      segments: 4,
      heightScale: 20,
    });
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
    expect(geo.attributes.position).toBeDefined();
    expect(geo.attributes.normal).toBeDefined();
    expect(geo.attributes.uv).toBeDefined();
    expect(geo.attributes.uv2).toBeDefined();
    expect(geo.index).toBeDefined();
  });

  it('Y values in positions reflect heightmap (non-flat)', () => {
    const geo = buildDisplacedGeometry(FIXTURE_4X4, {
      chunkSize: 100,
      chunkCx: 0,
      chunkCz: 0,
      totalChunks: 4,
      segments: 8,
      heightScale: 20,
    });
    const pos = geo.attributes.position.array as Float32Array;
    const yValues: number[] = [];
    for (let i = 1; i < pos.length; i += 3) yValues.push(pos[i]);

    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    // With heightScale=20 and values 0–1 we expect some Y spread
    expect(maxY - minY).toBeGreaterThan(0);
    expect(maxY).toBeLessThanOrEqual(20 + 0.001);
    expect(minY).toBeGreaterThanOrEqual(0 - 0.001);
  });

  it('vertex count matches (segments+1)^2', () => {
    const segments = 6;
    const geo = buildDisplacedGeometry(FIXTURE_4X4, {
      chunkSize: 100,
      chunkCx: 0,
      chunkCz: 0,
      totalChunks: 4,
      segments,
    });
    expect(geo.attributes.position.count).toBe((segments + 1) ** 2);
  });

  it('triangle index count matches segments^2 * 6', () => {
    const segments = 4;
    const geo = buildDisplacedGeometry(FIXTURE_4X4, {
      chunkSize: 100,
      chunkCx: 0,
      chunkCz: 0,
      totalChunks: 4,
      segments,
    });
    expect(geo.index!.count).toBe(segments ** 2 * 6);
  });

  it('seam: shared edge between adjacent chunks samples same height', () => {
    // Right edge of chunk (0,0) and left edge of chunk (1,0) should match
    const segments = 8;
    const opts = { chunkSize: 100, totalChunks: 4, segments, heightScale: 20 };

    const geo00 = buildDisplacedGeometry(FIXTURE_4X4, {
      ...opts,
      chunkCx: 0,
      chunkCz: 0,
    });
    const geo10 = buildDisplacedGeometry(FIXTURE_4X4, {
      ...opts,
      chunkCx: 1,
      chunkCz: 0,
    });

    const pos00 = geo00.attributes.position.array as Float32Array;
    const pos10 = geo10.attributes.position.array as Float32Array;

    // Right edge of geo00: col = segments, rows 0..segments
    // Left edge of geo10: col = 0, rows 0..segments
    const stride = segments + 1;
    const yRight: number[] = [];
    const yLeft: number[] = [];
    for (let row = 0; row <= segments; row++) {
      const idxRight = (row * stride + segments) * 3 + 1;
      const idxLeft = (row * stride + 0) * 3 + 1;
      yRight.push(pos00[idxRight]);
      yLeft.push(pos10[idxLeft]);
    }

    for (let i = 0; i <= segments; i++) {
      expect(yRight[i]).toBeCloseTo(yLeft[i], 3);
    }
  });
});

// ── buildDisplacedGeometry — validation ──────────────────────────────────────

describe('buildDisplacedGeometry — validation', () => {
  it('throws on segments = 0', () => {
    expect(() =>
      buildDisplacedGeometry(FIXTURE_4X4, {
        chunkSize: 100,
        chunkCx: 0,
        chunkCz: 0,
        totalChunks: 4,
        segments: 0,
      }),
    ).toThrow('segments must be a positive finite number');
  });

  it('throws on totalChunks = 0', () => {
    expect(() =>
      buildDisplacedGeometry(FIXTURE_4X4, {
        chunkSize: 100,
        chunkCx: 0,
        chunkCz: 0,
        totalChunks: 0,
        segments: 4,
      }),
    ).toThrow('totalChunks must be a positive finite number');
  });
});

// ── buildSplatMap ─────────────────────────────────────────────────────────────

const MOCK_BIOME_CONFIG = {
  id: 'test',
  name: 'Test',
  lighting: {
    hdri: 'cold-dawn',
    ambientColor: '#ffffff',
    ambientIntensity: 0.5,
    directionalColor: '#ffffff',
    directionalIntensity: 1,
    fogColor: '#aaaaaa',
    fogNear: 50,
    fogFar: 200,
  },
  terrain: {
    heightmap: 'thornfield',
    scale: 1,
    materials: ['mossy-stone', 'dead-grass', 'packed-mud', 'lichen-stone'],
    splatWeights: {
      'mossy-stone': 0.4,
      'dead-grass': 0.3,
      'packed-mud': 0.2,
      'lichen-stone': 0.1,
    },
    displacementScale: 0,
  },
  foliage: { density: 0.5, species: [] },
  weather: {
    defaultState: 'clear',
    states: [
      {
        id: 'clear',
        probability: 1,
        fogMultiplier: 1,
        windStrength: 0,
        precipitationType: 'none' as const,
        precipitationDensity: 0,
      },
    ],
    transitionDuration: 10,
  },
  audio: { ambient: [], footstepMaterial: 'grass' },
  monsterPool: [],
};

describe('buildSplatMap', () => {
  it('throws when materials array is empty', () => {
    const emptyMaterials = {
      ...MOCK_BIOME_CONFIG,
      terrain: { ...MOCK_BIOME_CONFIG.terrain, materials: [] },
    };
    expect(() => buildSplatMap(emptyMaterials as any, 'test-seed')).toThrow(
      'biomeConfig.terrain.materials must contain at least one material',
    );
  });

  it('returns a DataTexture of the requested resolution', () => {
    const tex = buildSplatMap(MOCK_BIOME_CONFIG as any, 'test-seed', {
      resolution: 64,
    });
    expect(tex).toBeInstanceOf(THREE.DataTexture);
    expect(tex.image.width).toBe(64);
    expect(tex.image.height).toBe(64);
  });

  it('pixel RGBA channels sum close to 255', () => {
    const tex = buildSplatMap(MOCK_BIOME_CONFIG as any, 'test-seed', {
      resolution: 16,
    });
    const data = tex.image.data as Uint8Array;
    for (let i = 0; i < 10; i++) {
      const sum =
        data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2] + data[i * 4 + 3];
      expect(sum).toBeGreaterThanOrEqual(250);
      expect(sum).toBeLessThanOrEqual(260);
    }
  });

  it('dominant channel reflects dominant splatWeight', () => {
    const tex = buildSplatMap(MOCK_BIOME_CONFIG as any, 'test-seed', {
      resolution: 64,
    });
    const data = tex.image.data as Uint8Array;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let aSum = 0;
    const pixelCount = 64 * 64;
    for (let i = 0; i < pixelCount; i++) {
      rSum += data[i * 4 + 0];
      gSum += data[i * 4 + 1];
      bSum += data[i * 4 + 2];
      aSum += data[i * 4 + 3];
    }
    // mossy-stone (R, weight 0.4) should dominate
    expect(rSum).toBeGreaterThan(gSum);
    expect(rSum).toBeGreaterThan(bSum);
    expect(rSum).toBeGreaterThan(aSum);
  });

  it('is deterministic: same seed → same texture', () => {
    const tex1 = buildSplatMap(MOCK_BIOME_CONFIG as any, 'seed-abc', {
      resolution: 16,
    });
    const tex2 = buildSplatMap(MOCK_BIOME_CONFIG as any, 'seed-abc', {
      resolution: 16,
    });
    const d1 = tex1.image.data as Uint8Array;
    const d2 = tex2.image.data as Uint8Array;
    expect(Array.from(d1)).toEqual(Array.from(d2));
  });

  it('is non-identical for different seeds (varies)', () => {
    const tex1 = buildSplatMap(MOCK_BIOME_CONFIG as any, 'seed-aaa', {
      resolution: 16,
    });
    const tex2 = buildSplatMap(MOCK_BIOME_CONFIG as any, 'seed-zzz', {
      resolution: 16,
    });
    const d1 = Array.from(tex1.image.data as Uint8Array);
    const d2 = Array.from(tex2.image.data as Uint8Array);
    expect(d1).not.toEqual(d2);
  });
});
