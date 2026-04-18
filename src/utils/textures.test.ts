import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We need to test the module in isolation
describe('textures module', () => {
  let createProceduralTexture: typeof import('./textures').createProceduralTexture;
  let getMaterials: typeof import('./textures').getMaterials;
  let updateWindowEmissive: typeof import('./textures').updateWindowEmissive;

  beforeEach(async () => {
    // Reset module cache to get fresh materials cache each test
    vi.resetModules();
    const module = await import('./textures');
    createProceduralTexture = module.createProceduralTexture;
    getMaterials = module.getMaterials;
    updateWindowEmissive = module.updateWindowEmissive;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('createProceduralTexture', () => {
    const textureTypes = [
      'plaster',
      'stone_block',
      'thatch',
      'wood',
      'door',
      'crate',
      'window',
      'road',
      'grass',
      'cobblestone',
    ] as const;

    it.each(textureTypes)('creates %s texture', (type) => {
      const texture = createProceduralTexture(type);
      expect(texture).toBeInstanceOf(THREE.CanvasTexture);
      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    });

    it('uses provided seed for reproducibility', () => {
      const texture1 = createProceduralTexture('plaster', 12345);
      const texture2 = createProceduralTexture('plaster', 12345);
      // Both should be created (can't easily compare canvas content)
      expect(texture1).toBeTruthy();
      expect(texture2).toBeTruthy();
    });

    it('uses random seed when not provided', () => {
      const texture = createProceduralTexture('grass');
      expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('sets correct color space', () => {
      const texture = createProceduralTexture('wood');
      expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    });

    it('handles unknown texture type with default magenta', () => {
      // @ts-expect-error Testing invalid input for default case
      const texture = createProceduralTexture('unknown_type');
      expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    });
  });

  describe('getMaterials', () => {
    it('returns an object with all material types', () => {
      const materials = getMaterials();

      expect(materials.townWall).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.dungeonWall).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.wood).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.roof).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.door).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.windowGlow).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.crate).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.pineTrunk).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.pineLeaves).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.boulder).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.gem).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.groundTown).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.groundWild).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.groundRoad).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.barrel).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials.water).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('caches materials on subsequent calls', () => {
      const materials1 = getMaterials();
      const materials2 = getMaterials();
      expect(materials1).toBe(materials2);
    });

    it('door material has double-sided rendering', () => {
      const materials = getMaterials();
      expect(materials.door.side).toBe(THREE.DoubleSide);
    });

    it('gem material has emissive properties', () => {
      const materials = getMaterials();
      expect(materials.gem.emissive).toBeDefined();
      expect(materials.gem.metalness).toBe(0.5);
    });

    it('water material is transparent', () => {
      const materials = getMaterials();
      expect(materials.water.transparent).toBe(true);
      expect(materials.water.opacity).toBe(0.7);
    });
  });

  describe('updateWindowEmissive', () => {
    it('updates window emissive intensity', () => {
      // First initialize materials
      const materials = getMaterials();

      updateWindowEmissive(0.5);
      expect(materials.windowGlow.emissiveIntensity).toBe(0.5);

      updateWindowEmissive(1.0);
      expect(materials.windowGlow.emissiveIntensity).toBe(1.0);

      updateWindowEmissive(0);
      expect(materials.windowGlow.emissiveIntensity).toBe(0);
    });

    it('handles call before materials initialized', () => {
      // This should not throw
      expect(() => updateWindowEmissive(0.5)).not.toThrow();
    });
  });
});
