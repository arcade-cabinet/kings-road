import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Tone.js since it requires Web Audio API
// Must use function() constructors (not arrows) so they can be called with `new`
vi.mock('tone', () => {
  return {
    Noise: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.start = vi.fn();
      this.stop = vi.fn();
      this.dispose = vi.fn();
    }),
    Filter: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.dispose = vi.fn();
    }),
    Gain: vi.fn(function () {
      this.gain = { value: 0 };
      this.connect = vi.fn().mockReturnThis();
      this.toDestination = vi.fn().mockReturnThis();
      this.dispose = vi.fn();
    }),
    FMSynth: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.triggerAttackRelease = vi.fn();
      this.dispose = vi.fn();
    }),
    Oscillator: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.start = vi.fn();
      this.stop = vi.fn();
      this.dispose = vi.fn();
    }),
    Tremolo: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.start = vi.fn().mockReturnValue(this);
      this.dispose = vi.fn();
    }),
    start: vi.fn(),
  };
});

import * as Tone from 'tone';

import {
  createAllLayers,
  createBirdsLayer,
  createCricketsLayer,
  createInsectsLayer,
  createVegetationLayer,
  createWaterLayer,
  createWindLayer,
} from './layer-factory';

/**
 * Pull the last instance constructed by a mocked Tone.js class so we can
 * assert methods were invoked on it. The mock fn is shaped as
 * `{ mock: { instances: unknown[] } }` and each instance is the return value
 * of the `function () { this.foo = vi.fn(); }` constructor set up in vi.mock.
 */
function lastInstance(ctor: unknown): { dispose: ReturnType<typeof vi.fn> } {
  const mock = ctor as { mock: { instances: unknown[] } };
  const instance = mock.mock.instances.at(-1);
  return instance as { dispose: ReturnType<typeof vi.fn> };
}

describe('layer-factory', () => {
  it('creates wind layer with correct name', () => {
    const layer = createWindLayer();
    expect(layer.name).toBe('wind');
    expect(layer.gain).toBeDefined();
    expect(typeof layer.start).toBe('function');
    expect(typeof layer.stop).toBe('function');
  });

  it('creates water layer with correct name', () => {
    const layer = createWaterLayer();
    expect(layer.name).toBe('water');
  });

  it('creates all 6 layers', () => {
    const layers = createAllLayers();
    expect(layers.length).toBe(6);
    const names = layers.map((l) => l.name);
    expect(names).toContain('wind');
    expect(names).toContain('birds');
    expect(names).toContain('insects');
    expect(names).toContain('crickets');
    expect(names).toContain('water');
    expect(names).toContain('vegetation');
  });

  describe('dispose', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('wind layer disposes noise + filter + gain', () => {
      const layer = createWindLayer();
      layer.dispose();
      const noise = lastInstance(Tone.Noise);
      const filter = lastInstance(Tone.Filter);
      const gain = lastInstance(Tone.Gain);
      expect(noise.dispose).toHaveBeenCalledTimes(1);
      expect(filter.dispose).toHaveBeenCalledTimes(1);
      expect(gain.dispose).toHaveBeenCalledTimes(1);
    });

    it('water layer disposes noise + filter + gain', () => {
      const layer = createWaterLayer();
      layer.dispose();
      const noise = lastInstance(Tone.Noise);
      const filter = lastInstance(Tone.Filter);
      const gain = lastInstance(Tone.Gain);
      expect(noise.dispose).toHaveBeenCalledTimes(1);
      expect(filter.dispose).toHaveBeenCalledTimes(1);
      expect(gain.dispose).toHaveBeenCalledTimes(1);
    });

    it('insects layer disposes noise + filter + gain', () => {
      const layer = createInsectsLayer();
      layer.dispose();
      const noise = lastInstance(Tone.Noise);
      const filter = lastInstance(Tone.Filter);
      const gain = lastInstance(Tone.Gain);
      expect(noise.dispose).toHaveBeenCalledTimes(1);
      expect(filter.dispose).toHaveBeenCalledTimes(1);
      expect(gain.dispose).toHaveBeenCalledTimes(1);
    });

    it('vegetation layer disposes noise + filter + gain', () => {
      const layer = createVegetationLayer();
      layer.dispose();
      const noise = lastInstance(Tone.Noise);
      const filter = lastInstance(Tone.Filter);
      const gain = lastInstance(Tone.Gain);
      expect(noise.dispose).toHaveBeenCalledTimes(1);
      expect(filter.dispose).toHaveBeenCalledTimes(1);
      expect(gain.dispose).toHaveBeenCalledTimes(1);
    });

    it('crickets layer disposes oscillator + tremolo + gain', () => {
      const layer = createCricketsLayer();
      layer.dispose();
      const osc = lastInstance(Tone.Oscillator);
      const tremolo = lastInstance(Tone.Tremolo);
      const gain = lastInstance(Tone.Gain);
      expect(osc.dispose).toHaveBeenCalledTimes(1);
      expect(tremolo.dispose).toHaveBeenCalledTimes(1);
      expect(gain.dispose).toHaveBeenCalledTimes(1);
    });

    it('birds layer disposes synth + gain and clears the schedule interval', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const layer = createBirdsLayer();
      layer.start();
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      layer.dispose();
      const synth = lastInstance(Tone.FMSynth);
      const gain = lastInstance(Tone.Gain);
      expect(synth.dispose).toHaveBeenCalledTimes(1);
      expect(gain.dispose).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});
