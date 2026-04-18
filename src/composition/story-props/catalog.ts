import type { StoryPropArchetype } from './types';

export interface StoryPropDef {
  archetype: StoryPropArchetype;
  assetId: string;
  /** Narrative text snippets (one picked at random) */
  texts: string[];
  /**
   * Biome affinity — which biomes favour this archetype.
   * Empty means it appears in all biomes.
   */
  biomeAffinity: string[];
  /** Relative weight for placement frequency */
  weight: number;
}

export const STORY_PROP_CATALOG: StoryPropDef[] = [
  {
    archetype: 'cairn-with-name',
    assetId: 'story-cairn',
    texts: [
      "A cairn of grey stones. One is scratched: 'Eliza, 1247.'",
      "Stones stacked carefully. A name is etched into the base: 'Thomas Wren.'",
      'A small cairn beside the road. Someone has placed a dried flower atop it.',
      "Three stones. Carved into the largest: 'Here I rested. Here I stayed.'",
    ],
    biomeAffinity: ['hills'],
    weight: 3,
  },
  {
    archetype: 'rusted-sword-in-stump',
    assetId: 'story-rusted-sword',
    texts: [
      'A rusted short sword driven to the hilt into a weathered tree stump.',
      'An iron blade, blade-down in rotting wood. The grip has crumbled away.',
      'Someone planted their sword here and never returned for it.',
    ],
    biomeAffinity: ['hills'],
    weight: 2,
  },
  {
    archetype: 'carved-initials-fence',
    assetId: 'story-carved-post',
    texts: [
      "A fence post with initials carved deep: 'A.M. + R.W.'",
      "Two sets of initials and a date: '1231'. The wood has grown around the cuts.",
      'Someone carved a small arrow pointing nowhere on this post.',
    ],
    biomeAffinity: [],
    weight: 2,
  },
  {
    archetype: 'bouquet-by-grave',
    assetId: 'story-dried-bouquet',
    texts: [
      'A bundle of dried wildflowers, brittle now, laid against a stone.',
      'Dead flowers tied with a strip of cloth. Left recently, or years ago.',
      'Someone still comes here. The flowers are dry but not ancient.',
    ],
    biomeAffinity: ['hills'],
    weight: 3,
  },
  {
    archetype: 'child-toy-on-doorstep',
    assetId: 'story-wooden-toy',
    texts: [
      'A small carved horse, crudely made, left on the threshold.',
      "A child's wooden doll, face worn smooth. Left in a hurry, perhaps.",
      'A tiny wagon wheel, no wagon. Someone once played here.',
    ],
    biomeAffinity: ['hills', 'meadow'],
    weight: 2,
  },
  {
    archetype: 'tally-marks-on-wall',
    assetId: 'story-tally-wall',
    texts: [
      'Tally marks scratched into stone. Forty-seven. Then they stopped.',
      'Scratch marks in groups of five, then a long gap, then three more alone.',
      'Someone counted days here. The last mark is deeper than the rest.',
    ],
    biomeAffinity: ['hills'],
    weight: 2,
  },
  {
    archetype: 'broken-plough',
    assetId: 'story-broken-plough',
    texts: [
      'A plough, iron share snapped clean, left where it fell in the field.',
      'Half a plough. The other half is somewhere in the tall grass.',
      'An abandoned plough, blade rusted orange. The field was never finished.',
    ],
    biomeAffinity: ['hills', 'meadow'],
    weight: 2,
  },
  {
    archetype: 'discarded-bundle',
    assetId: 'story-bundle',
    texts: [
      'A cloth bundle, knotted shut, dropped beside the road. Untouched.',
      'Someone left their pack here. The strap is cut, not unbuckled.',
      'A bundle of belongings wrapped in oilcloth. Still dry inside.',
    ],
    biomeAffinity: [],
    weight: 2,
  },
];

/** Pick story prop defs weighted toward a given biome */
export function getPropDefsForBiome(biomeId: string): StoryPropDef[] {
  return STORY_PROP_CATALOG.map((def) => {
    const affinity = def.biomeAffinity.includes(biomeId) ? 2 : 1;
    return { ...def, weight: def.weight * affinity };
  });
}
