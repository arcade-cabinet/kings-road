import { describe, expect, it } from 'vitest';
import type { MonsterArchetype } from '@/schemas/monster.schema';
import { buildMonsterRenderData } from './monster-factory';

const wolf: MonsterArchetype = {
  id: 'wolf',
  name: 'Grey Wolf',
  bodyType: 'quadruped',
  size: 0.9,
  colorScheme: { primary: '#6b6b6b', secondary: '#a3a3a3' },
  dangerTier: 1,
  health: 18,
  damage: 5,
};

const skeleton: MonsterArchetype = {
  id: 'skeleton',
  name: 'Skeleton',
  bodyType: 'biped',
  size: 1.0,
  colorScheme: { primary: '#d4c5a0', secondary: '#b8a88a' },
  dangerTier: 1,
  health: 15,
  damage: 4,
};

const basilisk: MonsterArchetype = {
  id: 'basilisk',
  name: 'Basilisk',
  bodyType: 'serpent',
  size: 2.0,
  colorScheme: { primary: '#3a5a3a', secondary: '#556b2f', accent: '#ffd700' },
  dangerTier: 3,
  health: 90,
  damage: 18,
};

const slime: MonsterArchetype = {
  id: 'slime',
  name: 'Green Slime',
  bodyType: 'amorphous',
  size: 0.6,
  colorScheme: { primary: '#4a7a3b', secondary: '#6fbf56' },
  dangerTier: 1,
  health: 12,
  damage: 3,
};

describe('buildMonsterRenderData', () => {
  it('biped produces box-stack body parts', () => {
    const data = buildMonsterRenderData(skeleton);
    expect(data.bodyParts.length).toBeGreaterThanOrEqual(4);
    expect(data.bodyParts.every((p) => p.type === 'box')).toBe(true);
  });

  it('quadruped produces elongated body with cylinder legs', () => {
    const data = buildMonsterRenderData(wolf);
    const cylinders = data.bodyParts.filter((p) => p.type === 'cylinder');
    expect(cylinders.length).toBe(4); // 4 legs
    const boxes = data.bodyParts.filter((p) => p.type === 'box');
    expect(boxes.length).toBe(2); // body + head
  });

  it('serpent produces cylinder chain', () => {
    const data = buildMonsterRenderData(basilisk);
    expect(data.bodyParts.every((p) => p.type === 'cylinder')).toBe(true);
    expect(data.bodyParts.length).toBeGreaterThanOrEqual(4);
  });

  it('amorphous produces a single sphere', () => {
    const data = buildMonsterRenderData(slime);
    expect(data.bodyParts.length).toBe(1);
    expect(data.bodyParts[0].type).toBe('sphere');
  });

  it('applies colorScheme as materials', () => {
    const data = buildMonsterRenderData(wolf);
    expect(data.primaryColor).toBe('#6b6b6b');
    expect(data.secondaryColor).toBe('#a3a3a3');
  });

  it('accent color is null when not provided', () => {
    const data = buildMonsterRenderData(wolf);
    expect(data.accentColor).toBeNull();
  });

  it('accent color is set when provided', () => {
    const data = buildMonsterRenderData(basilisk);
    expect(data.accentColor).toBe('#ffd700');
  });

  it('size parameter becomes scale', () => {
    const data = buildMonsterRenderData(wolf);
    expect(data.scale).toBe(0.9);
  });

  it('secondary defaults to primary when not provided', () => {
    const noSecondary: MonsterArchetype = {
      ...skeleton,
      colorScheme: { primary: '#aaa' },
    };
    const data = buildMonsterRenderData(noSecondary);
    expect(data.secondaryColor).toBe('#aaa');
  });
});
