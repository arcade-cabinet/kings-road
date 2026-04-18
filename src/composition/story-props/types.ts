import type { Vec3 } from '@/core';

export interface StoryPropPlacement {
  assetId: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  /** Archetype this placement belongs to */
  archetype: StoryPropArchetype;
  /** Optional narrative text for dialogue/popup systems */
  narrativeText?: string;
}

export type StoryPropArchetype =
  | 'cairn-with-name'
  | 'rusted-sword-in-stump'
  | 'carved-initials-fence'
  | 'bouquet-by-grave'
  | 'child-toy-on-doorstep'
  | 'tally-marks-on-wall'
  | 'broken-plough'
  | 'discarded-bundle';
