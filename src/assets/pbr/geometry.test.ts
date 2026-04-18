import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { prepareGeometryForPbr } from './geometry';

describe('prepareGeometryForPbr', () => {
  it('is a no-op when geometry has uv', () => {
    const geo = new THREE.BufferGeometry();
    const uv = new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1], 2);
    geo.setAttribute('uv', uv);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    prepareGeometryForPbr(geo);

    expect(geo.attributes.uv).toBe(uv);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns when geometry has no uv attribute', () => {
    const geo = new THREE.BufferGeometry();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    prepareGeometryForPbr(geo);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no `uv`'));
    warn.mockRestore();
  });

  it('does not touch the uv2 attribute slot', () => {
    // Regression test: the previous implementation cloned uv → uv2 on the
    // mistaken assumption that three.js aoMap reads from uv2. In three
    // r150+, aoMap.channel defaults to 0, which resolves to the `uv`
    // attribute. Writing to uv2 allocated memory no shader reads.
    const geo = new THREE.BufferGeometry();
    const uv = new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1], 2);
    geo.setAttribute('uv', uv);

    prepareGeometryForPbr(geo);

    expect(geo.attributes.uv2).toBeUndefined();
  });
});
