/**
 * Seed phrase generator — three-word pastoral nouns used to name each
 * pilgrimage. Previously lived in `src/stores/gameStore.ts`; moved here
 * when gameStore was decomposed into Koota traits so the generator is
 * a pure, state-free utility.
 */

const ADJECTIVES = [
  'Golden',
  'Verdant',
  'Gentle',
  'Sunlit',
  'Pastoral',
  'Quiet',
  'Rolling',
  'Blessed',
  'Winding',
  'Misty',
  'Silent',
  'Holy',
  'Ancient',
  'Weeping',
  'Blooming',
  'Whispering',
  'Fallen',
  'Forgotten',
  'Shimmering',
  'Eternal',
];

const NOUNS = [
  'Meadow',
  'Grove',
  'Chapel',
  'Crossing',
  'Lane',
  'Moor',
  'Ford',
  'Hollow',
  'Wold',
  'Vale',
  'Heath',
  'Brook',
  'Glen',
  'Hearth',
  'Sanctuary',
  'Reliquary',
  'Shire',
  'Haven',
  'Pilgrimage',
  'Passage',
];

export function generateSeedPhrase(): string {
  const a1 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  let a2 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  while (a1 === a2) {
    a2 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  }
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a1} ${a2} ${n}`;
}
