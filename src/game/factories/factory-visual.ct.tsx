import { expect, test } from '@playwright/experimental-ct-react';
import {
  ChibiConfigGrid,
  FaceTextureGrid,
  FaceTexturePreview,
} from './FactoryPreview.story';

// ---------------------------------------------------------------------------
// Default face input shared across expression / hair style tests
// ---------------------------------------------------------------------------

const BASE_FACE = {
  skinTone: '#f0c8a0',
  eyeColor: '#3a5f8a',
  hairColor: '#3b2a1a',
  hairStyle: 'short' as const,
  facialHair: 'none' as const,
  expression: 'neutral' as const,
};

// ---------------------------------------------------------------------------
// Expression screenshots (7 expressions)
// ---------------------------------------------------------------------------

const EXPRESSIONS = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'surprised',
  'sleeping',
  'speaking',
] as const;

for (const expr of EXPRESSIONS) {
  test(`screenshot: face expression — ${expr}`, async ({ mount, page }) => {
    await mount(<FaceTexturePreview {...BASE_FACE} expression={expr} />);

    await expect(page.getByTestId('face-image')).toBeVisible();
    await expect(page).toHaveScreenshot(`face-expression-${expr}.png`, {
      maxDiffPixels: 50,
    });
  });
}

// ---------------------------------------------------------------------------
// Hair style screenshots (8 styles)
// ---------------------------------------------------------------------------

const HAIR_STYLES = [
  'bald',
  'short',
  'long',
  'ponytail',
  'topknot',
  'braided',
  'wild',
  'hooded',
] as const;

for (const style of HAIR_STYLES) {
  test(`screenshot: hair style — ${style}`, async ({ mount, page }) => {
    await mount(<FaceTexturePreview {...BASE_FACE} hairStyle={style} />);

    await expect(page.getByTestId('face-image')).toBeVisible();
    await expect(page).toHaveScreenshot(`face-hair-${style}.png`, {
      maxDiffPixels: 50,
    });
  });
}

// ---------------------------------------------------------------------------
// Race face textures (5 races with characteristic skin tones)
// ---------------------------------------------------------------------------

const RACE_FACES = [
  {
    ...BASE_FACE,
    race: 'human' as const,
    skinTone: '#f0c8a0',
    expression: 'neutral' as const,
    hairStyle: 'short' as const,
  },
  {
    ...BASE_FACE,
    race: 'elf' as const,
    skinTone: '#fce4c7',
    expression: 'neutral' as const,
    hairStyle: 'long' as const,
    eyeColor: '#6a3d9a',
  },
  {
    ...BASE_FACE,
    race: 'dwarf' as const,
    skinTone: '#d4a574',
    expression: 'angry' as const,
    hairStyle: 'wild' as const,
    facialHair: 'full_beard' as const,
    hairColor: '#8b6914',
  },
  {
    ...BASE_FACE,
    race: 'orc' as const,
    skinTone: '#8b5e3c',
    expression: 'angry' as const,
    hairStyle: 'topknot' as const,
    facialHair: 'none' as const,
    hairColor: '#1a1a1a',
  },
  {
    ...BASE_FACE,
    race: 'halfling' as const,
    skinTone: '#fce4c7',
    expression: 'happy' as const,
    hairStyle: 'short' as const,
    hairColor: '#c4a35a',
  },
];

test('screenshot: face textures by race', async ({ mount, page }) => {
  await mount(<FaceTextureGrid faces={RACE_FACES} columns={5} />);

  await expect(page.getByTestId('face-grid')).toBeVisible();
  await expect(page).toHaveScreenshot('face-races-grid.png', {
    maxDiffPixels: 100,
  });
});

// ---------------------------------------------------------------------------
// Chibi config variety grid (12 different seeds)
// ---------------------------------------------------------------------------

const VARIETY_SEEDS = [
  'aldric-the-brave',
  'brenna-of-ashford',
  'cedric-copperfield',
  'delia-fairweather',
  'eamon-stonehelm',
  'faye-greenhollow',
  'gareth-ironvale',
  'helena-thornbury',
  'ivar-ravensdale',
  'jorin-kettleburn',
  'kenna-briarwood',
  'leofric-dunmore',
];

test('screenshot: chibi config variety grid', async ({ mount, page }) => {
  await mount(<ChibiConfigGrid seeds={VARIETY_SEEDS} columns={4} />);

  await expect(page.getByTestId('chibi-grid')).toBeVisible();
  await expect(page).toHaveScreenshot('chibi-config-variety.png', {
    maxDiffPixels: 100,
  });
});

// ---------------------------------------------------------------------------
// Facial hair styles
// ---------------------------------------------------------------------------

const FACIAL_HAIR_STYLES = [
  'none',
  'stubble',
  'full_beard',
  'mustache',
] as const;

test('screenshot: facial hair styles', async ({ mount, page }) => {
  const faces = FACIAL_HAIR_STYLES.map((fh) => ({
    ...BASE_FACE,
    facialHair: fh,
    hairStyle: 'short' as const,
  }));

  await mount(<FaceTextureGrid faces={faces} columns={4} />);

  await expect(page.getByTestId('face-grid')).toBeVisible();
  await expect(page).toHaveScreenshot('face-facial-hair.png', {
    maxDiffPixels: 50,
  });
});
