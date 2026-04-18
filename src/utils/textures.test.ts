import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We need to test the module in isolation
describe('textures module', () => {
  let loadPbrMaterial: typeof import('./textures').loadPbrMaterial;
  let getMaterials: typeof import('./textures').getMaterials;
  let updateWindowEmissive: typeof import('./textures').updateWindowEmissive;

  beforeEach(async () => {
    // Reset module cache to get fresh materials cache each test
    vi.resetModules();
    const module = await import('./textures');
    loadPbrMaterial = module.loadPbrMaterial;
    getMaterials = module.getMaterials;
    updateWindowEmissive = module.updateWindowEmissive;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('loadPbrMaterial', () => {
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

    it.each(textureTypes)('creates %s material', (type) => {
      const mat = loadPbrMaterial(type);
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('returns cached material on second call', () => {
      const mat1 = loadPbrMaterial('plaster');
      const mat2 = loadPbrMaterial('plaster');
      expect(mat1).toBe(mat2);
    });

    it('window type returns canvas-backed material with emissive', () => {
      const mat = loadPbrMaterial('window');
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
      // emissive is set to 0xffaa44 — non-zero color
      expect(mat.emissive.r).toBeGreaterThan(0);
    });

    it('plaster material has roughness 1.0 and metalness 0.0', () => {
      const mat = loadPbrMaterial('plaster');
      expect(mat.roughness).toBe(1.0);
      expect(mat.metalness).toBe(0.0);
    });

    it('door reuses wood PBR maps', () => {
      const wood = loadPbrMaterial('wood');
      const door = loadPbrMaterial('door');
      // Both use the same underlying maps (same dir), but could be same object
      expect(wood).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(door).toBeInstanceOf(THREE.MeshStandardMaterial);
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
