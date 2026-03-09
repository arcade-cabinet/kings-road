import { describe, expect, it } from 'vitest';
import { PerkSchema, SkillTreeSchema } from './skill-tree.schema';

describe('PerkSchema', () => {
  it('accepts a valid perk', () => {
    const perk = {
      id: 'iron-skin',
      name: 'Iron Skin',
      description: 'Years of hardship have toughened your hide.',
      branch: 'combat',
      tier: 1,
      cost: 1,
      effects: [
        {
          type: 'resistance',
          stat: 'physical',
          value: 5,
          description: '+5 physical resistance',
        },
      ],
    };
    expect(() => PerkSchema.parse(perk)).not.toThrow();
  });

  it('rejects a perk with tier above 5', () => {
    const perk = {
      id: 'godlike',
      name: 'Godlike Power',
      description: 'Power beyond mortal comprehension.',
      branch: 'magic',
      tier: 6,
      cost: 1,
      effects: [
        { type: 'stat_bonus', value: 100, description: '+100 all stats' },
      ],
    };
    expect(() => PerkSchema.parse(perk)).toThrow();
  });

  it('rejects a perk with no effects', () => {
    const perk = {
      id: 'empty-perk',
      name: 'Empty Perk',
      description: 'A perk that does nothing at all.',
      branch: 'survival',
      tier: 1,
      cost: 1,
      effects: [],
    };
    expect(() => PerkSchema.parse(perk)).toThrow();
  });
});

describe('SkillTreeSchema', () => {
  const makePerk = (id: string, branch: string, tier: number) => ({
    id,
    name: `Perk ${id}`,
    description: `A useful perk for the ${branch} path.`,
    branch,
    tier,
    cost: 1,
    effects: [
      { type: 'stat_bonus' as const, value: 1, description: '+1 bonus' },
    ],
  });

  it('accepts a valid skill tree with 3+ perks', () => {
    const tree = {
      id: 'main-tree',
      pointsPerLevel: 1,
      perks: [
        makePerk('slash', 'combat', 1),
        makePerk('fireball', 'magic', 1),
        makePerk('forage', 'survival', 1),
      ],
    };
    expect(() => SkillTreeSchema.parse(tree)).not.toThrow();
  });

  it('rejects a skill tree with fewer than 3 perks', () => {
    const tree = {
      id: 'tiny-tree',
      perks: [makePerk('slash', 'combat', 1)],
    };
    expect(() => SkillTreeSchema.parse(tree)).toThrow();
  });

  it('applies default pointsPerLevel of 1', () => {
    const tree = {
      id: 'default-tree',
      perks: [
        makePerk('a', 'combat', 1),
        makePerk('b', 'magic', 1),
        makePerk('c', 'survival', 1),
      ],
    };
    const parsed = SkillTreeSchema.parse(tree);
    expect(parsed.pointsPerLevel).toBe(1);
  });
});
