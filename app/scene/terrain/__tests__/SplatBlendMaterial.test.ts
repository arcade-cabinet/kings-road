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
    // UniformsUtils.merge clones the uniform container but preserves the
    // texture reference, so identity on the slot matches.
    expect(mat.uniforms.uSplatMap).toBeDefined();
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

  it('does not bind AO samplers (MAX_TEXTURE_IMAGE_UNITS=16 cap)', () => {
    // 4 layers × 4 samplers (color/normal/roughness/AO) + 1 splat = 17 units,
    // which exceeds the WebGL2 guaranteed minimum and fails to compile on
    // conservative drivers. AO is approximated from roughness in-shader.
    const m = makeMaterial();
    m.aoMap = new THREE.Texture();
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: [m],
    });
    for (let i = 0; i < 4; i++) {
      expect(`uAO${i}` in mat.uniforms).toBe(false);
      expect(`uHasAO${i}` in mat.uniforms).toBe(false);
    }
  });

  it('includes the three.js light + fog uniform slots so lights:true works', () => {
    const mat = buildSplatBlendMaterial({
      splatMap: makeSplatMap(),
      materials: [makeMaterial()],
    });
    // These are the slots the renderer writes into when lights/fog are on;
    // missing them crashes setProgram every frame with "Cannot set
    // properties of undefined (setting 'value')".
    expect(mat.uniforms.ambientLightColor).toBeDefined();
    expect(mat.uniforms.directionalLights).toBeDefined();
    expect(mat.uniforms.fogColor).toBeDefined();
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
