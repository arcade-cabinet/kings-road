# King's Road Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Aetheria prototype into King's Road — a config-driven, Zod-validated, Koota ECS game engine with pastoral mood, Holy Grail narrative spine, and agentic content pipeline for Ralph-TUI overnight generation.

**Architecture:** Zod schemas define all game content as JSON. A Koota ECS world consumes that config at runtime. React Three Fiber renders the ECS world. The 21dev R3F rendering code (instanced meshes, chunks, NPCs) is preserved and adapted as the rendering layer. A pacing engine places features algorithmically along a 1D road spine. Ralph-TUI generates quest content overnight against the schemas.

**Tech Stack:** TypeScript, React 19, Koota ECS (pmndrs), Zod 4, React Three Fiber, drei, Tailwind CSS v4, Vite, Vitest, Playwright

**Design Doc:** `docs/plans/2026-03-09-kings-road-redesign-design.md`

---

## Parallel Tracks

This plan is structured for maximum parallelism. Tracks A-C have NO dependencies on each other and can execute simultaneously. Track D depends on A. Track E depends on A+D. Track F depends on A. Track G depends on all tracks.

```
TRACK A: Schemas (Zod)          ─────┬──► TRACK D: ECS (Koota)
                                     │         │
TRACK B: Mood & Rebrand (visual) ────┤         ├──► TRACK E: Pacing + World Gen
                                     │         │
TRACK C: Cleanup & Config ──────────┤         ├──► TRACK F: Validation Pipeline
                                     │         │
                                     └─────────┴──► TRACK G: Ralph PRD + Trove Docs
```

---

## TRACK A: Zod Schema Layer

**Agent:** `schema-architect`
**Isolation:** worktree
**Dependencies:** None

### Task A1: Install Zod, scaffold schema directory

**Files:**
- Modify: `package.json`
- Create: `src/schemas/index.ts`

**Step 1: Install Zod**

Run: `pnpm add zod`

**Step 2: Create schema barrel file**

```typescript
// src/schemas/index.ts
export * from './world.schema';
export * from './quest.schema';
export * from './npc.schema';
export * from './feature.schema';
export * from './item.schema';
export * from './encounter.schema';
export * from './pacing.schema';
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml src/schemas/
git commit -m "feat: add zod dependency, scaffold schema directory"
```

### Task A2: World schema — road spine and anchors

**Files:**
- Create: `src/schemas/world.schema.ts`
- Create: `src/schemas/world.schema.test.ts`

**Step 1: Write the failing test**

```typescript
// src/schemas/world.schema.test.ts
import { describe, it, expect } from 'vitest';
import { RoadSpineSchema, AnchorPointSchema, RegionSchema } from './world.schema';

describe('World Schema', () => {
  it('validates a valid anchor point', () => {
    const anchor = {
      id: 'anchor-01',
      name: 'Millbrook',
      type: 'VILLAGE_FRIENDLY',
      distanceFromStart: 6000,
      mainQuestChapter: 'chapter-01',
      description: 'A quiet farming village at the start of the King\'s Road.',
      features: ['tavern', 'blacksmith'],
    };
    expect(() => AnchorPointSchema.parse(anchor)).not.toThrow();
  });

  it('rejects anchor with missing required fields', () => {
    const invalid = { id: 'bad', name: 'Bad' };
    expect(() => AnchorPointSchema.parse(invalid)).toThrow();
  });

  it('validates a complete road spine', () => {
    const spine = {
      totalDistance: 30000,
      anchors: [
        {
          id: 'home',
          name: 'Ashford',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 0,
          mainQuestChapter: 'chapter-00',
          description: 'Your home town.',
          features: ['home', 'tavern'],
        },
        {
          id: 'anchor-01',
          name: 'Millbrook',
          type: 'VILLAGE_FRIENDLY',
          distanceFromStart: 6000,
          mainQuestChapter: 'chapter-01',
          description: 'First stop on the road.',
          features: ['tavern'],
        },
      ],
    };
    expect(() => RoadSpineSchema.parse(spine)).not.toThrow();
  });

  it('validates a region definition', () => {
    const region = {
      id: 'region-01',
      name: 'The Shire Downs',
      biome: 'MEADOW',
      anchorRange: ['home', 'anchor-01'],
      terrainFeatures: ['rolling_hills', 'wildflowers', 'stone_walls'],
    };
    expect(() => RegionSchema.parse(region)).not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/schemas/world.schema.test.ts`
Expected: FAIL — modules not found

**Step 3: Write the schema**

```typescript
// src/schemas/world.schema.ts
import { z } from 'zod';

export const AnchorType = z.enum([
  'VILLAGE_FRIENDLY',
  'VILLAGE_HOSTILE',
  'DUNGEON',
  'WAYPOINT',
]);
export type AnchorType = z.infer<typeof AnchorType>;

export const Biome = z.enum([
  'MEADOW',
  'FOREST',
  'HILLS',
  'FARMLAND',
  'MOOR',
  'RIVERSIDE',
]);
export type Biome = z.infer<typeof Biome>;

export const AnchorPointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  type: AnchorType,
  distanceFromStart: z.number().int().nonnegative(),
  mainQuestChapter: z.string().min(1),
  description: z.string().min(10).max(500),
  features: z.array(z.string()).min(1),
  sideQuestSlots: z.number().int().nonnegative().default(0),
});
export type AnchorPoint = z.infer<typeof AnchorPointSchema>;

export const RegionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  biome: Biome,
  anchorRange: z.tuple([z.string(), z.string()]),
  terrainFeatures: z.array(z.string()).min(1),
});
export type Region = z.infer<typeof RegionSchema>;

export const RoadSpineSchema = z.object({
  totalDistance: z.number().int().positive(),
  anchors: z.array(AnchorPointSchema).min(2).refine(
    (anchors) => anchors[0].distanceFromStart === 0,
    { message: 'First anchor must be at distance 0 (home town)' }
  ),
  regions: z.array(RegionSchema).optional(),
});
export type RoadSpine = z.infer<typeof RoadSpineSchema>;
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/schemas/world.schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/schemas/world.schema.ts src/schemas/world.schema.test.ts
git commit -m "feat: add world schema — road spine, anchor points, regions"
```

### Task A3: Quest schema — macro/meso/micro with A/B branching

**Files:**
- Create: `src/schemas/quest.schema.ts`
- Create: `src/schemas/quest.schema.test.ts`

**Step 1: Write the failing test**

```typescript
// src/schemas/quest.schema.test.ts
import { describe, it, expect } from 'vitest';
import { QuestDefinitionSchema, QuestStepSchema, QuestBranchSchema } from './quest.schema';

describe('Quest Schema', () => {
  it('validates a micro quest', () => {
    const quest = {
      id: 'micro-lost-merchant',
      tier: 'micro',
      title: 'The Lost Merchant',
      estimatedMinutes: 8,
      anchorAffinity: 'anchor-01',
      trigger: { type: 'roadside', distanceRange: [5000, 7000] },
      steps: [
        {
          id: 'step-01',
          type: 'dialogue',
          npcArchetype: 'merchant',
          dialogueMinWords: 20,
          dialogueMaxWords: 80,
          dialogue: 'Good traveler, I have lost my way. The road forked and I took the wrong path. Could you escort me to Millbrook?',
        },
        {
          id: 'step-02',
          type: 'escort',
          destination: 'anchor-01',
          description: 'Escort the merchant to Millbrook.',
        },
      ],
      reward: { type: 'item', itemId: 'merchant-map' },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).not.toThrow();
  });

  it('validates a meso quest with A/B branches', () => {
    const quest = {
      id: 'meso-poisoned-well',
      tier: 'meso',
      title: 'The Poisoned Well',
      estimatedMinutes: 25,
      anchorAffinity: 'anchor-02',
      trigger: { type: 'anchor', anchorId: 'anchor-02' },
      branches: {
        A: {
          label: 'Confront the poisoner',
          steps: [
            { id: 'a-01', type: 'investigate', description: 'Search the well house for clues.', dialogueMinWords: 15, dialogueMaxWords: 60 },
            { id: 'a-02', type: 'encounter', encounterId: 'poisoner-fight' },
          ],
          reward: { type: 'modifier', modifierId: 'village-hero' },
        },
        B: {
          label: 'Find the cure',
          steps: [
            { id: 'b-01', type: 'fetch', itemId: 'moonpetal', description: 'Find moonpetal herbs in the forest.', dialogueMinWords: 15, dialogueMaxWords: 60 },
            { id: 'b-02', type: 'dialogue', npcArchetype: 'healer', dialogue: 'You found the moonpetal! Let me brew the antidote.', dialogueMinWords: 15, dialogueMaxWords: 60 },
          ],
          reward: { type: 'modifier', modifierId: 'village-healer' },
        },
      },
      reward: { type: 'item', itemId: 'well-keeper-ring' },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).not.toThrow();
  });

  it('rejects quest with too-short dialogue', () => {
    const quest = {
      id: 'bad',
      tier: 'micro',
      title: 'Bad',
      estimatedMinutes: 5,
      anchorAffinity: 'anchor-01',
      trigger: { type: 'roadside', distanceRange: [0, 100] },
      steps: [
        { id: 'step-01', type: 'dialogue', npcArchetype: 'merchant', dialogue: 'Hi.', dialogueMinWords: 20, dialogueMaxWords: 80 },
      ],
      reward: { type: 'item', itemId: 'nothing' },
    };
    expect(() => QuestDefinitionSchema.parse(quest)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/schemas/quest.schema.test.ts`
Expected: FAIL

**Step 3: Write the schema**

```typescript
// src/schemas/quest.schema.ts
import { z } from 'zod';

export const QuestTier = z.enum(['macro', 'meso', 'micro']);
export type QuestTier = z.infer<typeof QuestTier>;

export const QuestRewardSchema = z.object({
  type: z.enum(['item', 'modifier', 'unlock', 'currency']),
  itemId: z.string().optional(),
  modifierId: z.string().optional(),
  unlockId: z.string().optional(),
  amount: z.number().optional(),
});
export type QuestReward = z.infer<typeof QuestRewardSchema>;

export const QuestStepSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['dialogue', 'fetch', 'escort', 'investigate', 'encounter', 'travel', 'puzzle']),
  description: z.string().max(500).optional(),
  npcArchetype: z.string().optional(),
  dialogue: z.string().optional(),
  dialogueMinWords: z.number().int().positive().default(15),
  dialogueMaxWords: z.number().int().positive().default(80),
  destination: z.string().optional(),
  itemId: z.string().optional(),
  encounterId: z.string().optional(),
}).refine(
  (step) => {
    if (step.type === 'dialogue' && step.dialogue) {
      const wordCount = step.dialogue.split(/\s+/).length;
      return wordCount >= step.dialogueMinWords;
    }
    return true;
  },
  { message: 'Dialogue does not meet minimum word count' }
);
export type QuestStep = z.infer<typeof QuestStepSchema>;

export const QuestBranchSchema = z.object({
  label: z.string().min(3).max(100),
  steps: z.array(QuestStepSchema).min(1),
  reward: QuestRewardSchema.optional(),
});
export type QuestBranch = z.infer<typeof QuestBranchSchema>;

export const QuestTriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('roadside'), distanceRange: z.tuple([z.number(), z.number()]) }),
  z.object({ type: z.literal('anchor'), anchorId: z.string() }),
  z.object({ type: z.literal('prerequisite'), questId: z.string() }),
]);
export type QuestTrigger = z.infer<typeof QuestTriggerSchema>;

export const QuestDefinitionSchema = z.object({
  id: z.string().min(1),
  tier: QuestTier,
  title: z.string().min(3).max(100),
  estimatedMinutes: z.number().positive(),
  anchorAffinity: z.string(),
  trigger: QuestTriggerSchema,
  // Linear quests use steps, branching quests use branches
  steps: z.array(QuestStepSchema).optional(),
  branches: z.object({ A: QuestBranchSchema, B: QuestBranchSchema }).optional(),
  prerequisites: z.array(z.string()).optional(),
  reward: QuestRewardSchema,
}).refine(
  (q) => q.steps || q.branches,
  { message: 'Quest must have either steps or branches' }
).refine(
  (q) => q.tier === 'micro' || q.branches,
  { message: 'Meso and macro quests must have A/B branches' }
);
export type QuestDefinition = z.infer<typeof QuestDefinitionSchema>;
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/schemas/quest.schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/schemas/quest.schema.ts src/schemas/quest.schema.test.ts
git commit -m "feat: add quest schema — macro/meso/micro tiers with A/B branching"
```

### Task A4: NPC, feature, item, encounter schemas

**Files:**
- Create: `src/schemas/npc.schema.ts`
- Create: `src/schemas/feature.schema.ts`
- Create: `src/schemas/item.schema.ts`
- Create: `src/schemas/encounter.schema.ts`
- Create: `src/schemas/pacing.schema.ts`
- Create: `src/schemas/npc.schema.test.ts`
- Create: `src/schemas/feature.schema.test.ts`

**Step 1: Write NPC schema**

```typescript
// src/schemas/npc.schema.ts
import { z } from 'zod';

export const NPCArchetype = z.enum([
  'blacksmith', 'innkeeper', 'merchant', 'wanderer',
  'healer', 'knight', 'hermit', 'farmer', 'priest',
  'noble', 'bandit', 'scholar',
]);
export type NPCArchetype = z.infer<typeof NPCArchetype>;

export const DialogueLineSchema = z.object({
  text: z.string().min(10).max(300),
  condition: z.string().optional(), // e.g. "quest:poisoned-well:active"
});

export const NPCDefinitionSchema = z.object({
  id: z.string().min(1),
  archetype: NPCArchetype,
  namePool: z.array(z.string().min(2).max(40)).min(3),
  greetingPool: z.array(DialogueLineSchema).min(2),
  questDialogue: z.record(z.string(), z.array(DialogueLineSchema)).optional(),
  appearance: z.object({
    clothColor: z.string().optional(),
    accessory: z.string().optional(),
  }).optional(),
});
export type NPCDefinition = z.infer<typeof NPCDefinitionSchema>;
```

**Step 2: Write feature schema**

```typescript
// src/schemas/feature.schema.ts
import { z } from 'zod';

export const FeatureTier = z.enum(['ambient', 'minor', 'major']);
export type FeatureTier = z.infer<typeof FeatureTier>;

export const FeatureDefinitionSchema = z.object({
  id: z.string().min(1),
  tier: FeatureTier,
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(300),
  visualType: z.string(), // Maps to a renderer: 'stone_bridge', 'shrine', 'ruin', etc.
  interactable: z.boolean().default(false),
  dialogueOnInteract: z.string().max(300).optional(),
});
export type FeatureDefinition = z.infer<typeof FeatureDefinitionSchema>;
```

**Step 3: Write item schema**

```typescript
// src/schemas/item.schema.ts
import { z } from 'zod';

export const ItemDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  description: z.string().min(10).max(300),
  type: z.enum(['key_item', 'consumable', 'equipment', 'quest_item', 'modifier']),
  effect: z.object({
    stat: z.string().optional(),
    value: z.number().optional(),
    duration: z.number().optional(),
  }).optional(),
  stackable: z.boolean().default(false),
});
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
```

**Step 4: Write encounter schema**

```typescript
// src/schemas/encounter.schema.ts
import { z } from 'zod';

export const EncounterDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80),
  type: z.enum(['combat', 'puzzle', 'social', 'stealth', 'survival']),
  difficulty: z.number().int().min(1).max(10),
  description: z.string().min(10).max(500),
  rewards: z.array(z.object({
    itemId: z.string(),
    chance: z.number().min(0).max(1).default(1),
  })).optional(),
  failureConsequence: z.string().max(300).optional(),
});
export type EncounterDefinition = z.infer<typeof EncounterDefinitionSchema>;
```

**Step 5: Write pacing schema**

```typescript
// src/schemas/pacing.schema.ts
import { z } from 'zod';

const IntervalRange = z.tuple([z.number().positive(), z.number().positive()])
  .refine(([min, max]) => min <= max, { message: 'min must be <= max' });

export const PacingConfigSchema = z.object({
  ambientInterval: IntervalRange,
  minorInterval: IntervalRange,
  majorInterval: IntervalRange,
  questMicroInterval: IntervalRange,
  questMesoInterval: IntervalRange,
  questMacroInterval: IntervalRange,
  anchorInterval: IntervalRange,
  walkSpeed: z.number().positive().default(4),
  sprintSpeed: z.number().positive().default(7),
});
export type PacingConfig = z.infer<typeof PacingConfigSchema>;
```

**Step 6: Write tests, run, commit**

Run: `pnpm vitest run src/schemas/`
Expected: All PASS

```bash
git add src/schemas/
git commit -m "feat: add NPC, feature, item, encounter, pacing schemas"
```

### Task A5: Master game config schema — combines all schemas

**Files:**
- Create: `src/schemas/game-config.schema.ts`
- Create: `src/schemas/game-config.schema.test.ts`

**Step 1: Write combined schema**

```typescript
// src/schemas/game-config.schema.ts
import { z } from 'zod';
import { RoadSpineSchema } from './world.schema';
import { QuestDefinitionSchema } from './quest.schema';
import { NPCDefinitionSchema } from './npc.schema';
import { FeatureDefinitionSchema } from './feature.schema';
import { ItemDefinitionSchema } from './item.schema';
import { EncounterDefinitionSchema } from './encounter.schema';
import { PacingConfigSchema } from './pacing.schema';

export const GameConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  name: z.literal('kings-road'),
  world: RoadSpineSchema,
  pacing: PacingConfigSchema,
  mainQuest: z.array(QuestDefinitionSchema).min(1),
  sideQuests: z.object({
    macro: z.array(QuestDefinitionSchema),
    meso: z.array(QuestDefinitionSchema),
    micro: z.array(QuestDefinitionSchema),
  }),
  npcs: z.array(NPCDefinitionSchema),
  features: z.array(FeatureDefinitionSchema),
  items: z.array(ItemDefinitionSchema),
  encounters: z.array(EncounterDefinitionSchema),
});
export type GameConfig = z.infer<typeof GameConfigSchema>;
```

**Step 2: Write test with a minimal valid config, run, commit**

Run: `pnpm vitest run src/schemas/game-config.schema.test.ts`

```bash
git add src/schemas/
git commit -m "feat: add master game config schema combining all sub-schemas"
```

---

## TRACK B: Mood & Rebrand

**Agent:** `mood-designer`
**Isolation:** worktree
**Dependencies:** None (purely visual, no schema/ECS dependency)

### Task B1: Rebrand package.json, HTML, titles

**Files:**
- Modify: `package.json:2` — name to `kings-road`
- Modify: `index.html:6` — title to `King's Road`

**Step 1: Update package.json name**

Change line 2: `"name": "kings-road",`

**Step 2: Update index.html title**

Change: `<title>Vite + React + TS</title>` → `<title>King's Road</title>`

**Step 3: Commit**

```bash
git add package.json index.html
git commit -m "chore: rebrand package name and HTML title to King's Road"
```

### Task B2: Rebrand MainMenu — title, subtitle, mood

**Files:**
- Modify: `src/game/components/ui/MainMenu.tsx`

**Step 1: Replace all branding**

- Line 248: `Aetheria` → `King's Road`
- Line 252: `Infinite RPG Engine` → `Seek the Holy Grail`
- Replace dark background gradient `#1a1208, #080605, #030202` → warm parchment `#ede4d3, #f5f0e8, #faf6ef`
- Replace FloatingEmbers (amber/orange on black) → gentle floating particles (warm gold on cream)
- Replace blood-red Enter Realm button → warm gold/brown button
- Replace dark stone UI colors → warm cream/brown palette
- Update seed name adjectives/nouns in `gameStore.ts` to pastoral vocabulary

**Step 2: Update color constants throughout MainMenu**

Key replacements:
- `#030202` → `#f5f0e8` (background)
- `#d4af37` (gold on black) → `#6b5344` (brown on cream) for text
- `from-red-900/80 to-red-950/80` → `from-amber-700/90 to-amber-800/90` for primary button
- `text-amber-300` → `text-cream-50` or `text-amber-50` for button text
- `text-stone-500`, `text-stone-600` → `text-stone-700`, `text-stone-800` for readable text on light bg
- `bg-stone-950/80` → `bg-white/60 backdrop-blur-sm` for seed container
- `border-stone-800/50` → `border-stone-300/50`
- All `text-amber-600/60` feature icons → `text-amber-700`

**Step 3: Commit**

```bash
git add src/game/components/ui/MainMenu.tsx
git commit -m "feat: rebrand MainMenu to King's Road with pastoral mood"
```

### Task B3: Rebrand GameHUD — colors, gem counter removal

**Files:**
- Modify: `src/game/components/ui/GameHUD.tsx`

**Step 1: Update branding**

- Line 268: `King's Highway` → `The King's Road`
- Remove or repurpose gem counter (no single collectible — will be quest-driven later)
- Update dark UI colors to warm palette
- Health/stamina bars: warm tones instead of harsh red/green

**Step 2: Commit**

```bash
git add src/game/components/ui/GameHUD.tsx
git commit -m "feat: rebrand HUD to King's Road, warm pastoral palette"
```

### Task B4: Update index.css — background and base colors

**Files:**
- Modify: `src/index.css`

**Step 1: Update base styles**

```css
html, body, #root {
  background: #f5f0e8;  /* warm cream instead of #030202 */
  color: #3d2b1f;       /* dark brown instead of #e5e5e5 */
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: update base colors to warm pastoral palette"
```

### Task B5: Update GameScene — background, lighting, post-processing

**Files:**
- Modify: `src/game/components/GameScene.tsx`

**Step 1: Update scene background**

- `SceneInit`: Change `0x030202` → `0x87CEEB` (sky blue)
- Canvas `background`: `#030202` → `#87CEEB`
- Canvas `style.background`: `#030202` → `#87CEEB`
- ErrorBoundary: Update dark styles to warm palette

**Step 2: Update post-processing**

- Reduce vignette darkness: `0.6` → `0.3`
- Bloom: keep for golden sunlight glow
- Keep SMAA

**Step 3: Commit**

```bash
git add src/game/components/GameScene.tsx
git commit -m "feat: update scene to pastoral sky, softer post-processing"
```

### Task B6: Update Environment — drei Sky, warm lighting

**Files:**
- Modify: `src/game/systems/Environment.tsx`

**Step 1: Replace custom sky dome with drei Sky component**

Reference drei docs for Sky component with proper sun positioning. Use warm golden sunlight during day, soft blue moonlight at night.

- Day ambient: warm white `#fff8e7`
- Day directional: golden `#ffd700`
- Night ambient: soft blue `#1a1a3e`
- Night directional (moon): `#8888cc`
- Fog: warm cream during day, deep blue at night

**Step 2: Commit**

```bash
git add src/game/systems/Environment.tsx
git commit -m "feat: pastoral lighting with drei Sky, warm golden sunlight"
```

### Task B7: Update DialogueBox, MobileControls — warm palette

**Files:**
- Modify: `src/game/components/ui/DialogueBox.tsx`
- Modify: `src/game/components/ui/MobileControls.tsx`

**Step 1: Update DialogueBox colors**

Replace dark stone colors with parchment/cream palette.

**Step 2: Update MobileControls colors**

Same warm palette treatment.

**Step 3: Commit**

```bash
git add src/game/components/ui/DialogueBox.tsx src/game/components/ui/MobileControls.tsx
git commit -m "feat: warm pastoral palette for dialogue box and mobile controls"
```

### Task B8: Rename BloodGem → Relic (temporary, until quest system replaces it)

**Files:**
- Rename: `src/game/components/BloodGem.tsx` → `src/game/components/Relic.tsx`
- Modify: `src/game/components/Chunk.tsx` — update import
- Modify: `src/game/stores/gameStore.ts` — rename gemsCollected → relicsFound
- Modify: `src/game/utils/worldGen.ts` — update dialogue mentioning Blood Gems

**Step 1: Rename component, update all references**

**Step 2: Update NPC dialogue in worldGen.ts**

Replace "Blood Gems" dialogue with pastoral/pilgrimage themed dialogue.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: rename BloodGem to Relic, update dialogue to pastoral theme"
```

### Task B9: Update seed phrase vocabulary

**Files:**
- Modify: `src/game/stores/gameStore.ts`

**Step 1: Replace grimdark adjectives/nouns with pastoral ones**

```typescript
const ADJECTIVES = [
  'Golden', 'Verdant', 'Gentle', 'Sunlit', 'Pastoral',
  'Quiet', 'Rolling', 'Blessed', 'Winding', 'Misty',
  'Silver', 'Ancient', 'Noble', 'Fair', 'Hallowed',
  'Tranquil', 'Emerald', 'Amber',
];
const NOUNS = [
  'Meadow', 'Glen', 'Shire', 'Dale', 'Hollow',
  'Brook', 'Haven', 'Crossing', 'Fields', 'Commons',
  'Glade', 'Downs', 'Heath', 'Moor', 'Vale',
  'March',
];
```

**Step 2: Commit**

```bash
git add src/game/stores/gameStore.ts
git commit -m "feat: pastoral seed phrase vocabulary"
```

### Task B10: Update textures to pastoral palette

**Files:**
- Modify: `src/game/utils/textures.ts`

**Step 1: Update procedural texture colors**

- Stone: warmer tones (honey limestone instead of dark gray)
- Plaster: warm cream
- Wood: warm oak brown
- Grass: lush green
- Road: warm packed earth/gravel
- Thatch: golden straw

**Step 2: Commit**

```bash
git add src/game/utils/textures.ts
git commit -m "feat: pastoral warm texture palette"
```

### Task B11: Update e2e tests for new branding

**Files:**
- Modify: `e2e/game.spec.ts`

**Step 1: Update all assertions**

- `'Blood Gems Game'` → `'King\'s Road'`
- `'Aetheria'` → `'King\'s Road'`
- `'Infinite RPG Engine'` → `'Seek the Holy Grail'`

**Step 2: Run tests**

Run: `pnpm build && pnpm test:e2e`

**Step 3: Commit**

```bash
git add e2e/game.spec.ts
git commit -m "test: update e2e tests for King's Road branding"
```

---

## TRACK C: Cleanup & Config

**Agent:** `cleanup-agent`
**Isolation:** worktree
**Dependencies:** None

### Task C1: Remove dead tsconfig path aliases

**Files:**
- Modify: `tsconfig.json`

**Step 1: Remove next and next-themes aliases**

Remove lines 31-32:
```json
"next": ["src/components/next"],
"next-themes": ["src/next-themes.tsx"]
```

**Step 2: Run type check**

Run: `pnpm tsc --noEmit`
Expected: PASS (nothing imports these)

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: remove dead next/next-themes path aliases"
```

### Task C2: Fix THREE.js deprecation warnings

**Files:**
- Modify: `src/game/components/GameScene.tsx`

**Step 1: Update shadow map type**

The Canvas `shadows` prop triggers PCFSoftShadowMap deprecation. Set explicitly:
```tsx
<Canvas shadows={{ type: THREE.PCFShadowMap }}>
```

**Step 2: Commit**

```bash
git add src/game/components/GameScene.tsx
git commit -m "fix: resolve THREE.js shadow map deprecation warning"
```

### Task C3: Clean Onlook scripts from index.html

**Files:**
- Modify: `index.html`

**Step 1: Remove the Onlook Iframe Editor Script and Page Freezer script**

These are ~500 lines of injected tooling code that shouldn't be in production. Keep only the essential body content.

**Step 2: Commit**

```bash
git add index.html
git commit -m "chore: remove Onlook/PageFreezer injection scripts from index.html"
```

---

## TRACK D: Koota ECS Layer

**Agent:** `ecs-architect`
**Isolation:** worktree
**Dependencies:** Track A schemas (needs type definitions)

### Task D1: Install Koota, scaffold ECS directory

**Files:**
- Modify: `package.json`
- Create: `src/ecs/world.ts`

**Step 1: Install Koota**

Run: `pnpm add koota`

**Step 2: Create ECS world**

```typescript
// src/ecs/world.ts
import { createWorld } from 'koota';

export const gameWorld = createWorld();
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml src/ecs/
git commit -m "feat: install koota, create ECS game world"
```

### Task D2: Define core traits

**Files:**
- Create: `src/ecs/traits/index.ts`
- Create: `src/ecs/traits/player.ts`
- Create: `src/ecs/traits/spatial.ts`
- Create: `src/ecs/traits/quest.ts`
- Create: `src/ecs/traits/npc.ts`
- Create: `src/ecs/traits/pacing.ts`

**Step 1: Define spatial traits**

```typescript
// src/ecs/traits/spatial.ts
import { trait } from 'koota';

export const Position = trait({ x: 0, y: 0, z: 0 });
export const Velocity = trait({ x: 0, y: 0, z: 0 });
export const Rotation = trait({ yaw: 0, pitch: 0 });
```

**Step 2: Define player traits**

```typescript
// src/ecs/traits/player.ts
import { trait } from 'koota';

export const IsPlayer = trait();
export const Health = trait({ current: 100, max: 100 });
export const Stamina = trait({ current: 100, max: 100 });
export const Movement = trait({
  speed: 0,
  angularSpeed: 0,
  isSprinting: false,
  isGrounded: true,
});
export const PlayerInput = trait({
  forward: false, backward: false,
  left: false, right: false,
  strafeLeft: false, strafeRight: false,
  jump: false, walk: false, interact: false,
});
export const DistanceTraveled = trait({ total: 0, sinceLastFeature: 0 });
```

**Step 3: Define quest traits**

```typescript
// src/ecs/traits/quest.ts
import { trait } from 'koota';

export const QuestLog = trait(() => ({
  activeQuests: [] as Array<{ questId: string; currentStep: number; branch?: 'A' | 'B' }>,
  completedQuests: [] as string[],
  mainQuestChapter: 0,
}));
export const IsQuestGiver = trait({ questId: '' });
```

**Step 4: Define NPC traits**

```typescript
// src/ecs/traits/npc.ts
import { trait } from 'koota';

export const IsNPC = trait();
export const NPCArchetype = trait({ archetype: '' as string });
export const Dialogue = trait(() => ({
  greetings: [] as string[],
  questDialogue: {} as Record<string, string[]>,
}));
export const Interactable = trait({ radius: 3, actionVerb: 'Talk' });
```

**Step 5: Define pacing traits**

```typescript
// src/ecs/traits/pacing.ts
import { trait } from 'koota';

export const RoadPosition = trait({ distance: 0 }); // Distance along King's Road
export const IsOnRoad = trait();
export const IsAnchor = trait({ anchorId: '' });
export const IsFeature = trait({ featureId: '', tier: '' as string });
```

**Step 6: Write tests, commit**

```bash
git add src/ecs/
git commit -m "feat: define core ECS traits — player, spatial, quest, NPC, pacing"
```

### Task D3: Define actions

**Files:**
- Create: `src/ecs/actions/index.ts`

**Step 1: Create game actions**

```typescript
// src/ecs/actions/index.ts
import { createActions } from 'koota';
import { IsPlayer, Health, Stamina, Movement, PlayerInput, DistanceTraveled, QuestLog } from '../traits';
import { Position, Velocity, Rotation } from '../traits/spatial';

export const playerActions = createActions((world) => ({
  spawnPlayer: (x: number, y: number, z: number) =>
    world.spawn(IsPlayer, Position({ x, y, z }), Velocity, Rotation, Health, Stamina, Movement, PlayerInput, DistanceTraveled, QuestLog),
  updateInput: (entity: any, input: Partial<{ forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean; walk: boolean; interact: boolean }>) => {
    entity.set(PlayerInput, input);
  },
}));
```

**Step 2: Commit**

```bash
git add src/ecs/actions/
git commit -m "feat: add ECS actions for player spawning and input"
```

### Task D4: Wire WorldProvider into React app

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Wrap app in WorldProvider**

```typescript
// src/App.tsx
import { WorldProvider } from 'koota/react';
import { gameWorld } from './ecs/world';
import { Game } from './game/Game';

function App() {
  return (
    <WorldProvider world={gameWorld}>
      <Game />
    </WorldProvider>
  );
}

export default App;
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Koota WorldProvider into React app"
```

---

## TRACK E: Pacing Engine + World Gen Refactor

**Agent:** `pacing-engineer`
**Isolation:** worktree
**Dependencies:** Track A (schemas) + Track D (ECS traits)

### Task E1: Create road spine loader

**Files:**
- Create: `src/game/world/road-spine.ts`
- Create: `src/game/world/road-spine.test.ts`
- Create: `content/world/road-spine.json` (stub with 5-7 anchors)

**Step 1: Write stub road spine JSON**

```json
{
  "totalDistance": 30000,
  "anchors": [
    { "id": "home", "name": "Ashford", "type": "VILLAGE_FRIENDLY", "distanceFromStart": 0, "mainQuestChapter": "chapter-00", "description": "Your home town, a quiet farming village.", "features": ["home", "tavern", "blacksmith"] },
    { "id": "anchor-01", "name": "Millbrook", "type": "VILLAGE_FRIENDLY", "distanceFromStart": 6000, "mainQuestChapter": "chapter-01", "description": "A market town along the King's Road.", "features": ["tavern", "market", "chapel"] },
    { "id": "anchor-02", "name": "Thornfield Ruins", "type": "DUNGEON", "distanceFromStart": 12000, "mainQuestChapter": "chapter-02", "description": "Ancient ruins hiding secrets of the Grail.", "features": ["dungeon_entrance", "camp"] },
    { "id": "anchor-03", "name": "Ravensgate", "type": "VILLAGE_HOSTILE", "distanceFromStart": 17000, "mainQuestChapter": "chapter-03", "description": "A walled town under tyrannical rule.", "features": ["gate", "prison", "tavern"] },
    { "id": "anchor-04", "name": "The Pilgrim's Rest", "type": "WAYPOINT", "distanceFromStart": 21000, "mainQuestChapter": "chapter-04", "description": "A roadside monastery offering shelter to travelers.", "features": ["chapel", "garden", "library"] },
    { "id": "anchor-05", "name": "Grailsend", "type": "DUNGEON", "distanceFromStart": 28000, "mainQuestChapter": "chapter-05", "description": "The final temple where the Holy Grail awaits.", "features": ["temple_entrance", "guardian"] }
  ]
}
```

**Step 2: Write loader that validates against Zod schema**

```typescript
// src/game/world/road-spine.ts
import { RoadSpineSchema, type RoadSpine } from '../../schemas/world.schema';
import roadSpineData from '../../../content/world/road-spine.json';

let cachedSpine: RoadSpine | null = null;

export function loadRoadSpine(): RoadSpine {
  if (cachedSpine) return cachedSpine;
  cachedSpine = RoadSpineSchema.parse(roadSpineData);
  return cachedSpine;
}

export function getAnchorAtDistance(distance: number): RoadSpine['anchors'][number] | null {
  const spine = loadRoadSpine();
  // Find the closest anchor within a threshold
  const threshold = 500; // world units
  return spine.anchors.find(
    (a) => Math.abs(a.distanceFromStart - distance) < threshold
  ) ?? null;
}

export function getNextAnchor(currentDistance: number): RoadSpine['anchors'][number] | null {
  const spine = loadRoadSpine();
  return spine.anchors.find((a) => a.distanceFromStart > currentDistance) ?? null;
}
```

**Step 3: Write tests, run, commit**

### Task E2: Create pacing system — feature placement along road

**Files:**
- Create: `src/game/world/pacing-engine.ts`
- Create: `src/game/world/pacing-engine.test.ts`
- Create: `content/world/pacing.json`

This system takes the road distance, pacing config, and seed, then deterministically places features along the road axis using seeded RNG jitter.

### Task E3: Refactor worldGen.ts — road-aware chunk typing

**Files:**
- Modify: `src/game/utils/worldGen.ts`

Replace `getChunkType()` hash-based approach with road-aware logic:
- Chunks ON the road → type determined by nearest anchor
- Chunks NEAR the road → road terrain (packed earth, hedgerows)
- Chunks OFF the road → pastoral countryside (meadow, forest, farmland) based on region config

---

## TRACK F: Validation Pipeline

**Agent:** `validation-builder`
**Isolation:** worktree
**Dependencies:** Track A (schemas)

### Task F1: Create trove validation script

**Files:**
- Create: `scripts/validate-trove.ts`
- Create: `content/CONTRIBUTING.md`

**Step 1: Write validation script**

Script that:
1. Reads all JSON files from `content/`
2. Validates each against appropriate Zod schema
3. Checks referential integrity (quest prerequisites exist, NPCs reference valid archetypes)
4. Estimates duration per quest (paper playtesting)
5. Checks A/B branch coverage
6. Calculates substance score (dialogue word density, choice meaningfulness)
7. Outputs report JSON with pass/fail/warnings per file

**Step 2: Write CONTRIBUTING.md for agentic authoring**

Document:
- JSON schema examples for every content type
- Length requirements
- Tone guide (pastoral, romanticized medieval, NOT grimdark)
- A/B branching rules
- Paper playtest format
- Balance constraints

**Step 3: Commit**

```bash
git add scripts/ content/
git commit -m "feat: add trove validation pipeline and contribution guide"
```

---

## TRACK G: Ralph PRD + Docs Update

**Agent:** `ralph-prd-writer`
**Isolation:** worktree
**Dependencies:** All tracks (needs final schema shapes and contribution guide)

### Task G1: Write Ralph-TUI PRD for overnight content generation

**Files:**
- Create: `docs/prd/kings-road-content-generation.md` (or ralph-tui format)

User stories for Ralph:
1. Generate 5 main quest chapters (story beats, dialogue, encounters)
2. Generate 3 macro quest chains with A/B branching
3. Generate 10 meso quests for various anchor types
4. Generate 25 micro roadside encounters
5. Generate NPC dialogue pools for all archetypes
6. Generate ambient/minor/major feature descriptions
7. All validated against Zod schemas
8. Paper playtested automatically

### Task G2: Update all documentation

**Files:**
- Rewrite: `README.md`
- Rewrite: `AGENTS.md`
- Rewrite: `CHANGELOG.md`
- Rewrite: `docs/ARCHITECTURE.md`
- Rewrite: `docs/DESIGN.md`
- Rewrite: `docs/WORLD_GENERATION.md`
- Rewrite: `docs/GAME_SYSTEMS.md`

All referencing King's Road, pastoral mood, Holy Grail narrative, ECS architecture, config-driven design.

### Task G3: Create CLAUDE.md

Based on the actual working state of the fully refactored codebase.

---

## Execution Order Summary

```
PARALLEL START:
  Track A: Schemas (A1→A2→A3→A4→A5)
  Track B: Mood & Rebrand (B1→B2→B3→B4→B5→B6→B7→B8→B9→B10→B11)
  Track C: Cleanup (C1→C2→C3)

AFTER Track A completes:
  Track D: ECS (D1→D2→D3→D4)
  Track F: Validation (F1)

AFTER Tracks A+D complete:
  Track E: Pacing + World Gen (E1→E2→E3)

AFTER ALL complete:
  Track G: Ralph PRD + Docs (G1→G2→G3)
```

Tracks A, B, C run simultaneously. Then D+F. Then E. Then G.
Maximum 4 agents running at once during peak parallelism.
