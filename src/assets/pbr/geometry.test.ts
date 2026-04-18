import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { prepareGeometryForPbr } from './geometry';

describe('prepareGeometryForPbr', () => {
  it('no-ops when uv2 already exists', () => {
    const geo = new THREE.BufferGeometry();
    const uv = new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1], 2);
    const uv2 = new THREE.Float32BufferAttribute(
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      2,
    );
    geo.setAttribute('uv', uv);
    geo.setAttribute('uv2', uv2);

    prepareGeometryForPbr(geo);

    expect(geo.attributes.uv2).toBe(uv2);
  });

  it('clones uv into uv2 when uv2 is absent', () => {
    const geo = new THREE.BufferGeometry();
    const uv = new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1], 2);
    geo.setAttribute('uv', uv);

    prepareGeometryForPbr(geo);

    expect(geo.attributes.uv2).toBeDefined();
    expect(geo.attributes.uv2).not.toBe(uv);
    expect(Array.from(geo.attributes.uv2.array)).toEqual(Array.from(uv.array));
  });

  it('warns and skips when geometry has no UV channel', () => {
    const geo = new THREE.BufferGeometry();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    prepareGeometryForPbr(geo);

    expect(geo.attributes.uv2).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no UV channel'));
    warn.mockRestore();
  });
});
