import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/assets', () => ({
  assetUrl: (path: string) => path,
}));

// Controls whether the next load call succeeds or fails.
let shouldFail = false;
let loadCallCount = 0;

vi.mock('three-stdlib', () => ({
  RGBELoader: class {
    load(
      _url: string,
      onLoad: (t: THREE.Texture) => void,
      _onProgress: unknown,
      onError: (e: unknown) => void,
    ) {
      loadCallCount++;
      if (shouldFail) {
        onError(new Error('network fail'));
      } else {
        onLoad(new THREE.Texture());
      }
    }
  },
}));

describe('loadHdri', () => {
  beforeEach(() => {
    vi.resetModules();
    shouldFail = false;
    loadCallCount = 0;
  });

  it('concurrent calls return the same Promise (no duplicate loads)', async () => {
    const { loadHdri } = await import('./loader');

    const p1 = loadHdri('meadow');
    const p2 = loadHdri('meadow');

    expect(p1).toBe(p2);
    await Promise.all([p1, p2]);
    expect(loadCallCount).toBe(1);
  });

  it('resolved texture has EquirectangularReflectionMapping', async () => {
    const { loadHdri } = await import('./loader');
    const texture = await loadHdri('meadow');
    expect(texture.mapping).toBe(THREE.EquirectangularReflectionMapping);
  });

  it('failed load evicts cache so subsequent call retries', async () => {
    const { loadHdri } = await import('./loader');

    shouldFail = true;
    await expect(loadHdri('meadow')).rejects.toMatchObject({
      name: 'AssetError',
    });

    shouldFail = false;
    const texture = await loadHdri('meadow');
    expect(texture).toBeInstanceOf(THREE.Texture);
    expect(loadCallCount).toBe(2);
  });

  it('second call after resolution returns same cached Promise', async () => {
    const { loadHdri } = await import('./loader');

    const p1 = loadHdri('forest');
    await p1;
    const p2 = loadHdri('forest');

    expect(p1).toBe(p2);
    expect(loadCallCount).toBe(1);
  });
});
