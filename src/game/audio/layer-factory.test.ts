import { describe, expect, it, vi } from 'vitest';

// Mock Tone.js since it requires Web Audio API
// Must use function() constructors (not arrows) so they can be called with `new`
vi.mock('tone', () => {
  return {
    Noise: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.start = vi.fn();
      this.stop = vi.fn();
    }),
    Filter: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
    }),
    Gain: vi.fn(function () {
      this.gain = { value: 0 };
      this.connect = vi.fn().mockReturnThis();
      this.toDestination = vi.fn().mockReturnThis();
    }),
    FMSynth: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.triggerAttackRelease = vi.fn();
    }),
    Oscillator: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.start = vi.fn();
      this.stop = vi.fn();
    }),
    Tremolo: vi.fn(function () {
      this.connect = vi.fn().mockReturnThis();
      this.start = vi.fn().mockReturnValue(this);
    }),
    start: vi.fn(),
  };
});

import {
  createAllLayers,
  createWaterLayer,
  createWindLayer,
} from './layer-factory';

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
});
