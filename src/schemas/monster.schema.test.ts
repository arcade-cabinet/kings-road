import { describe, expect, it } from 'vitest';
import { MonsterArchetypeSchema } from './monster.schema';

describe('MonsterArchetypeSchema', () => {
  it('accepts a wolf monster', () => {
    const wolf = {
      id: 'wolf',
      name: 'Gray Wolf',
      bodyType: 'quadruped',
      size: 0.8,
      colorScheme: { primary: '#666666', secondary: '#444444' },
      dangerTier: 1,
      health: 30,
      damage: 8,
      lootTable: 'common_wildlife',
    };
    expect(() => MonsterArchetypeSchema.parse(wolf)).not.toThrow();
  });

  it('rejects size below 0.3', () => {
    const tiny = {
      id: 'bug',
      name: 'Tiny Bug',
      bodyType: 'amorphous',
      size: 0.1,
      colorScheme: { primary: '#333333' },
      dangerTier: 1,
      health: 1,
      damage: 1,
    };
    expect(() => MonsterArchetypeSchema.parse(tiny)).toThrow();
  });
});
