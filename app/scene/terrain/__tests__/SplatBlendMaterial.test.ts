import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildSplatBlendMaterial } from '../SplatBlendMaterial';

function makeSplatMap(size = 4): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  // Full weight on channel R (first material)
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = 255;
  }
  return new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
}

function makeMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial();
  mat.map = new THREE.Texture();
  mat.normalMap = new THREE.Texture();
  mat.roughnessMap = new THREE.Texture();
  return mat;
}

describe('buildSplatBlendMaterial', () => {
  it('returns a ShaderMaterial with lights and fog enabled', () => {
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: [makeMaterial()],
    });
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mat.lights).toBe(true);
    expect(mat.fog).toBe(true);
  });

  it('throws when given 0 materials', () => {
    expect(() =>
      buildSplatBlendMaterial({ splatMap: makeSplatMap(), materials: [] }),
    ).toThrow('1–4 materials');
  });

  it('throws when given 5 materials', () => {
    const mats = Array.from({ length: 5 }, makeMaterial);
    expect(() =>
      buildSplatBlendMaterial({ splatMap: makeSplatMap(), materials: mats }),
    ).toThrow('1–4 materials');
  });

  it('pads single material to 4 slots in uniforms', () => {
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: [makeMaterial()],
    });
    // All 4 slots should be bound (padded with first material).
    for (let i = 0; i < 4; i++) {
      expect(`uColor${i}` in mat.uniforms).toBe(true);
      expect(`uNormal${i}` in mat.uniforms).toBe(true);
      expect(`uRoughness${i}` in mat.uniforms).toBe(true);
    }
  });

  it('binds uSplatMap uniform', () => {
    const splatMap = makeSplatMap();
    const mat = buildSplatBlendMaterial({
      splatMap,
      materials: [makeMaterial()],
    });
    expect(mat.uniforms.uSplatMap.value).toBe(splatMap);
  });

  it('respects custom tileScale', () => {
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: [makeMaterial()],
      tileScale: 16,
    });
    expect(mat.uniforms.uTileScale.value).toBe(16);
  });

  it('defaults tileScale to 8', () => {
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: [makeMaterial()],
    });
    expect(mat.uniforms.uTileScale.value).toBe(8);
  });

  it('sets uHasAO to 0 when aoMap is absent', () => {
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: [makeMaterial()],
    });
    expect(mat.uniforms.uHasAO0.value).toBe(0.0);
  });

  it('sets uHasAO to 1 when aoMap is present', () => {
    const m = makeMaterial();
    m.aoMap = new THREE.Texture();
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: [m],
    });
    expect(mat.uniforms.uHasAO0.value).toBe(1.0);
  });

  it('accepts 4 materials without padding', () => {
    const mats = Array.from({ length: 4 }, makeMaterial);
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: mats,
    });
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
  });
});
