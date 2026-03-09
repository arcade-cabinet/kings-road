import { describe, expect, it } from 'vitest';
import { FeatureDefinitionSchema } from './feature.schema';

describe('Feature Schema', () => {
  it('validates a complete feature definition', () => {
    const feature = {
      id: 'feat-stone-bridge-01',
      tier: 'minor',
      name: 'Old Stone Bridge',
      description:
        'A weathered stone bridge spanning a gentle brook, covered in moss.',
      visualType: 'stone_bridge',
      interactable: true,
      dialogueOnInteract:
        'The stones here have been worn smooth by centuries of travelers.',
    };
    expect(() => FeatureDefinitionSchema.parse(feature)).not.toThrow();
  });

  it('applies default interactable of false', () => {
    const feature = {
      id: 'feat-wildflowers-01',
      tier: 'ambient',
      name: 'Wildflower Patch',
      description: 'A colorful patch of wildflowers swaying in the breeze.',
      visualType: 'wildflowers',
    };
    const parsed = FeatureDefinitionSchema.parse(feature);
    expect(parsed.interactable).toBe(false);
  });

  it('rejects feature with invalid tier', () => {
    const feature = {
      id: 'feat-bad',
      tier: 'legendary',
      name: 'Bad Feature',
      description: 'This feature has an invalid tier setting.',
      visualType: 'unknown',
    };
    expect(() => FeatureDefinitionSchema.parse(feature)).toThrow();
  });

  it('rejects feature with too-short description', () => {
    const feature = {
      id: 'feat-bad',
      tier: 'ambient',
      name: 'Bad',
      description: 'Too short',
      visualType: 'unknown',
    };
    expect(() => FeatureDefinitionSchema.parse(feature)).toThrow();
  });
});
