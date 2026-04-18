import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AssetError } from '@/core';
import { PBR_PALETTE } from './palette';

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
      if (url.includes('_AmbientOcclusion') || url.includes('_Displacement')) {
        onError(new Error('optional map missing'));
      } else {
        onLoad(new actual.Texture());
      }
    }
  }

  return { ...actual, TextureLoader: MockTextureLoader };
});

// Register fixture material with AmbientCG packPrefix convention
PBR_PALETTE['test-stone'] = { packPrefix: 'TestStone001' };

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
});
