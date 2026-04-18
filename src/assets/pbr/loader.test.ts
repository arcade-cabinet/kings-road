import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AssetError } from '@/core';
import { PBR_PALETTE } from './palette';

let textureLoadCallCount = 0;

vi.mock('@/lib/assets', () => ({
  assetUrl: (path: string) => path,
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>();

  class MockTextureLoader {
    load(
      url: string,
      onLoad: (t: THREE.Texture) => void,
      _onProgress: unknown,
      onError: (e: unknown) => void,
    ) {
      textureLoadCallCount++;
      if (
        url.includes('_AmbientOcclusion') ||
        url.includes('_Displacement') ||
        url.includes('_Metalness')
      ) {
        onError(new Error('optional map missing'));
      } else {
        onLoad(new actual.Texture());
      }
    }
  }

  return { ...actual, TextureLoader: MockTextureLoader };
});

// Register fixture materials before importing loader.
PBR_PALETTE['test-stone'] = { packPrefix: 'TestStone001' };
PBR_PALETTE['test-granite'] = { packPrefix: 'TestGranite001' };

// Import loader after mocks and palette mutations are in place
const { loadPbrMaterial } = await import('./loader');

describe('loadPbrMaterial', () => {
  it('throws AssetError for unknown id', async () => {
    await expect(loadPbrMaterial('does-not-exist')).rejects.toMatchObject({
      name: 'AssetError',
      message: expect.stringContaining('does-not-exist'),
    });
  });

  it('throws an instance of AssetError', async () => {
    try {
      await loadPbrMaterial('unknown-id-xyz');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AssetError);
    }
  });

  it('returns MeshStandardMaterial with required maps bound', async () => {
    const mat = await loadPbrMaterial('test-stone');
    expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(mat.map).toBeInstanceOf(THREE.Texture);
    expect(mat.normalMap).toBeInstanceOf(THREE.Texture);
    expect(mat.roughnessMap).toBeInstanceOf(THREE.Texture);
  });

  it('caches — same id returns same instance', async () => {
    const a = await loadPbrMaterial('test-stone');
    const b = await loadPbrMaterial('test-stone');
    expect(a).toBe(b);
  });

  it('returns a clone (not the shared instance) when displacementScale > 0', async () => {
    const base = await loadPbrMaterial('test-stone');
    const scaled = await loadPbrMaterial('test-stone', {
      displacementScale: 0.05,
    });
    expect(scaled).not.toBe(base);
    expect(scaled.displacementScale).toBe(0.05);
  });

  it('preserves the shared cache when a consumer requests displacement', async () => {
    // Consumer A takes a cloned material with displacement; consumer B then
    // requests the same id with defaults. B must get the pristine cached
    // instance, not A's mutated one.
    const base = await loadPbrMaterial('test-stone');
    const baseScale = base.displacementScale;
    await loadPbrMaterial('test-stone', { displacementScale: 0.2 });
    const afterScaled = await loadPbrMaterial('test-stone');
    expect(afterScaled).toBe(base);
    expect(afterScaled.displacementScale).toBe(baseScale);
  });

  it('displacementScale of 0 returns the shared cached instance (no clone)', async () => {
    const a = await loadPbrMaterial('test-stone');
    const b = await loadPbrMaterial('test-stone', { displacementScale: 0 });
    expect(b).toBe(a);
  });

  it('concurrent calls share one load (no duplicate texture fetches)', async () => {
    // Use a fresh id that no prior test has loaded so the cache is cold.
    textureLoadCallCount = 0;
    const [a, b] = await Promise.all([
      loadPbrMaterial('test-granite'),
      loadPbrMaterial('test-granite'),
    ]);
    // Both resolve to the same material instance.
    expect(a).toBe(b);
    // One load = 3 required maps (Color + Normal + Roughness) + 3 optional attempts.
    // Two loads would be 12. Any count <= 6 proves deduplication.
    expect(textureLoadCallCount).toBeLessThanOrEqual(6);
  });
});
