import { describe, expect, it } from 'vitest';
import { createWaterMaterial, getWaterPreset } from './gerstner-water';

describe('gerstner-water', () => {
  describe('getWaterPreset', () => {
    it('returns river preset', () => {
      const preset = getWaterPreset('river');
      expect(preset.waveLayers.length).toBe(2);
      expect(preset.opacity).toBe(0.85);
    });

    it('returns stream preset', () => {
      const preset = getWaterPreset('stream');
      expect(preset.waveLayers.length).toBe(1);
    });

    it('returns pond preset for unknown type', () => {
      const preset = getWaterPreset('ocean');
      expect(preset).toEqual(getWaterPreset('pond'));
    });
  });

  describe('createWaterMaterial', () => {
    it('creates a ShaderMaterial with correct uniforms', () => {
      const config = getWaterPreset('river');
      const material = createWaterMaterial(config);
      expect(material).toBeDefined();
      expect(material.uniforms.uTime.value).toBe(0);
      expect(material.uniforms.uLayerCount.value).toBe(2);
      expect(material.transparent).toBe(true);
    });

    it('pads wave arrays to 4 elements', () => {
      const config = getWaterPreset('stream'); // 1 layer
      const material = createWaterMaterial(config);
      expect(material.uniforms.uAmplitude.value.length).toBe(4);
      expect(material.uniforms.uAmplitude.value[0]).toBeGreaterThan(0);
      expect(material.uniforms.uAmplitude.value[1]).toBe(0);
    });
  });
});
