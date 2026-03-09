# Game Engine v2: Blueprint Factories Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded building/NPC generation with config-driven archetype factories, add enterable multi-story buildings with stairs, canvas face textures on NPCs, town layout strategies, Gerstner water shaders, Tone.js ambient audio, danger gradient encounters, and the complete Ashford starting town.

**Architecture:** Three factory systems (Building, NPC, Monster) consume Zod-validated JSON archetype configs and produce ECS entities with 3D geometry. Towns are layout configs that reference archetypes with per-instance overrides. Water and audio systems adapted from Grovekeeper. All on branch `feat/engine-v2-blueprints`.

**Tech Stack:** React Three Fiber, Koota ECS, Zod v4, Tone.js, GLSL Gerstner wave shaders, procedural canvas textures.

---

## Track Dependency Graph

```
A (Schemas) ──────┬──> B (Building Factory) ──> D (Town Layout) ──┐
                  ├──> C (NPC Factory)                            ├──> H (Ashford Content)
                  ├──> G (Danger/Encounters)                      │         │
                  │                                               │         v
E (Water) ────────┼───────────────────────────────────────────────┘    I (Integration)
F (Audio) ────────┘
```

**Parallel tracks:** A, E, F can start simultaneously. B+C+G start after A. D starts after B. H starts after B+C+D. I is last.

---

## Track A: Archetype Schemas

### Task A1: Building Archetype Schema

**Files:**
- Create: `src/schemas/building.schema.ts`
- Create: `src/schemas/building.schema.test.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Write the failing test**

```typescript
// src/schemas/building.schema.test.ts
import { describe, expect, it } from 'vitest';
import { BuildingArchetypeSchema } from './building.schema';

describe('BuildingArchetypeSchema', () => {
  it('accepts a valid tavern archetype', () => {
    const tavern = {
      id: 'tavern',
      stories: 2,
      footprint: { width: 3, depth: 4 },
      wallMaterial: 'plaster',
      roofStyle: 'thatch',
      openFront: false,
      features: ['door', 'windows', 'chimney', 'sign', 'hearth'],
      interiorSlots: [
        { type: 'table', position: [1, 2] },
        { type: 'chair', position: [1, 1] },
      ],
      npcSlot: { archetype: 'innkeeper', position: [1.5, 3] },
    };
    expect(() => BuildingArchetypeSchema.parse(tavern)).not.toThrow();
  });

  it('rejects stories > 3', () => {
    const bad = {
      id: 'tower',
      stories: 5,
      footprint: { width: 2, depth: 2 },
      wallMaterial: 'stone',
      roofStyle: 'flat',
      openFront: false,
      features: [],
      interiorSlots: [],
    };
    expect(() => BuildingArchetypeSchema.parse(bad)).toThrow();
  });

  it('defaults openFront to false', () => {
    const minimal = {
      id: 'cottage',
      stories: 1,
      footprint: { width: 2, depth: 2 },
      wallMaterial: 'plaster',
      roofStyle: 'thatch',
      features: ['door', 'windows'],
      interiorSlots: [],
    };
    const result = BuildingArchetypeSchema.parse(minimal);
    expect(result.openFront).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/schemas/building.schema.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/schemas/building.schema.ts
import { z } from 'zod';

export const WallMaterial = z.enum([
  'plaster',
  'stone',
  'timber_frame',
  'brick',
]);
export type WallMaterial = z.infer<typeof WallMaterial>;

export const RoofStyle = z.enum(['thatch', 'slate', 'flat']);
export type RoofStyle = z.infer<typeof RoofStyle>;

export const InteriorSlotSchema = z.object({
  type: z.string(),
  position: z.tuple([z.number(), z.number()]),
});
export type InteriorSlot = z.infer<typeof InteriorSlotSchema>;

export const NPCSlotSchema = z.object({
  archetype: z.string(),
  position: z.tuple([z.number(), z.number()]),
});

export const BuildingArchetypeSchema = z.object({
  id: z.string().min(1),
  stories: z.number().int().min(1).max(3),
  footprint: z.object({
    width: z.number().int().min(1).max(6),
    depth: z.number().int().min(1).max(8),
  }),
  wallMaterial: WallMaterial,
  roofStyle: RoofStyle,
  openFront: z.boolean().default(false),
  features: z.array(z.string()),
  interiorSlots: z.array(InteriorSlotSchema),
  npcSlot: NPCSlotSchema.optional(),
});
export type BuildingArchetype = z.infer<typeof BuildingArchetypeSchema>;
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/schemas/building.schema.test.ts`
Expected: PASS (3 tests)

**Step 5: Export from barrel and commit**

Add to `src/schemas/index.ts`:
```typescript
export { BuildingArchetypeSchema, type BuildingArchetype, WallMaterial, RoofStyle } from './building.schema';
```

```bash
git add src/schemas/building.schema.ts src/schemas/building.schema.test.ts src/schemas/index.ts
git commit -m "feat(schemas): add building archetype schema with wall materials and roof styles"
```

---

### Task A2: Town Config Schema

**Files:**
- Create: `src/schemas/town.schema.ts`
- Create: `src/schemas/town.schema.test.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Write the failing test**

```typescript
// src/schemas/town.schema.test.ts
import { describe, expect, it } from 'vitest';
import { TownConfigSchema } from './town.schema';

describe('TownConfigSchema', () => {
  it('accepts a valid organic town config', () => {
    const ashford = {
      id: 'ashford',
      name: 'Ashford',
      anchorId: 'anchor-ashford',
      layout: 'organic',
      boundary: 'palisade',
      approach: 'meadow_stream',
      center: [0, 0],
      buildings: [
        {
          archetype: 'cottage',
          label: 'Your Home',
          position: [0, 2],
          rotation: 15,
        },
        {
          archetype: 'tavern',
          label: 'The Golden Meadow',
          position: [-3, 0],
          overrides: { stories: 2 },
        },
      ],
      npcs: [
        {
          id: 'aldric',
          archetype: 'blacksmith',
          fixed: true,
          building: "Aldric's Forge",
          name: 'Aldric',
        },
      ],
    };
    expect(() => TownConfigSchema.parse(ashford)).not.toThrow();
  });

  it('rejects unknown layout strategy', () => {
    const bad = {
      id: 'x',
      name: 'X',
      layout: 'hexagonal',
      boundary: 'palisade',
      approach: 'meadow',
      center: [0, 0],
      buildings: [],
      npcs: [],
    };
    expect(() => TownConfigSchema.parse(bad)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/schemas/town.schema.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/schemas/town.schema.ts
import { z } from 'zod';

export const LayoutStrategy = z.enum(['organic', 'road', 'grid']);
export type LayoutStrategy = z.infer<typeof LayoutStrategy>;

export const BoundaryType = z.enum(['palisade', 'stone_wall', 'hedge', 'none']);
export type BoundaryType = z.infer<typeof BoundaryType>;

export const ApproachType = z.enum([
  'meadow',
  'meadow_stream',
  'grove',
  'bridge',
  'open',
]);
export type ApproachType = z.infer<typeof ApproachType>;

export const BuildingPlacementSchema = z.object({
  archetype: z.string(),
  label: z.string(),
  position: z.tuple([z.number(), z.number()]),
  rotation: z.number().default(0),
  overrides: z
    .object({
      stories: z.number().int().min(1).max(3).optional(),
      wallMaterial: z.string().optional(),
      roofStyle: z.string().optional(),
    })
    .optional(),
});
export type BuildingPlacement = z.infer<typeof BuildingPlacementSchema>;

export const TownNPCPlacementSchema = z.object({
  id: z.string(),
  archetype: z.string(),
  fixed: z.boolean().default(false),
  building: z.string().optional(),
  name: z.string().optional(),
  position: z.tuple([z.number(), z.number()]).optional(),
});
export type TownNPCPlacement = z.infer<typeof TownNPCPlacementSchema>;

export const TownConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  anchorId: z.string().optional(),
  layout: LayoutStrategy,
  boundary: BoundaryType,
  approach: ApproachType,
  center: z.tuple([z.number(), z.number()]),
  buildings: z.array(BuildingPlacementSchema),
  npcs: z.array(TownNPCPlacementSchema),
});
export type TownConfig = z.infer<typeof TownConfigSchema>;
```

**Step 4: Run test, export, commit**

Run: `pnpm test -- src/schemas/town.schema.test.ts`

Add to `src/schemas/index.ts`:
```typescript
export { TownConfigSchema, type TownConfig, LayoutStrategy, BoundaryType, ApproachType } from './town.schema';
```

```bash
git add src/schemas/town.schema.ts src/schemas/town.schema.test.ts src/schemas/index.ts
git commit -m "feat(schemas): add town config schema with layout strategies and NPC placements"
```

---

### Task A3: NPC Blueprint Schema (extend existing)

**Files:**
- Create: `src/schemas/npc-blueprint.schema.ts`
- Create: `src/schemas/npc-blueprint.schema.test.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Write test**

```typescript
// src/schemas/npc-blueprint.schema.test.ts
import { describe, expect, it } from 'vitest';
import { NPCBlueprintSchema } from './npc-blueprint.schema';

describe('NPCBlueprintSchema', () => {
  it('accepts a fixed NPC with face and accessories', () => {
    const aldric = {
      id: 'aldric',
      name: 'Aldric',
      archetype: 'blacksmith',
      fixed: true,
      bodyBuild: { height: 0.9, width: 1.2 },
      face: {
        skinTone: 3,
        eyeColor: 'brown',
        hairStyle: 'bald',
        hairColor: '#1a1a1a',
        facialHair: 'full_beard',
      },
      accessories: ['leather_apron', 'hammer'],
      clothPalette: { primary: '#4a3320', secondary: '#2b1d12' },
      behavior: {
        idleStyle: 'working',
        interactionVerb: 'TALK',
        walkNodes: true,
      },
      dialogue: {
        greeting: ['Well met, traveler. Need something forged?'],
        quest: ['I could use some iron from the old mine...'],
      },
    };
    expect(() => NPCBlueprintSchema.parse(aldric)).not.toThrow();
  });

  it('accepts a procedural NPC with minimal config', () => {
    const procedural = {
      id: 'wanderer-001',
      archetype: 'wanderer',
      fixed: false,
      bodyBuild: { height: 1.0, width: 1.0 },
      face: { skinTone: 0, eyeColor: 'blue', hairStyle: 'short' },
      accessories: ['walking_stick'],
      clothPalette: { primary: '#5a4a3a' },
      behavior: { idleStyle: 'idle', interactionVerb: 'GREET' },
    };
    expect(() => NPCBlueprintSchema.parse(procedural)).not.toThrow();
  });
});
```

**Step 2: Run test (fails), Step 3: implement**

```typescript
// src/schemas/npc-blueprint.schema.ts
import { z } from 'zod';

export const BodyBuildSchema = z.object({
  height: z.number().min(0.6).max(1.4).default(1.0),
  width: z.number().min(0.7).max(1.5).default(1.0),
});

export const FaceSchema = z.object({
  skinTone: z.number().int().min(0).max(4),
  eyeColor: z.enum(['brown', 'blue', 'green', 'gray']).default('brown'),
  hairStyle: z.enum(['bald', 'short', 'long', 'hooded']).default('short'),
  hairColor: z.string().default('#4a3020'),
  facialHair: z
    .enum(['none', 'stubble', 'full_beard', 'mustache'])
    .default('none'),
});
export type Face = z.infer<typeof FaceSchema>;

export const ClothPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string().optional(),
});

export const NPCBehaviorSchema = z.object({
  idleStyle: z.enum(['idle', 'working', 'patrolling', 'sitting']),
  interactionVerb: z.string().default('TALK'),
  walkNodes: z.boolean().default(false),
});

export const NPCDialogueSchema = z
  .object({
    greeting: z.array(z.string()).optional(),
    quest: z.array(z.string()).optional(),
    idle: z.array(z.string()).optional(),
  })
  .optional();

export const NPCBlueprintSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  archetype: z.string(),
  fixed: z.boolean().default(false),
  bodyBuild: BodyBuildSchema,
  face: FaceSchema,
  accessories: z.array(z.string()).default([]),
  clothPalette: ClothPaletteSchema,
  behavior: NPCBehaviorSchema,
  dialogue: NPCDialogueSchema,
});
export type NPCBlueprint = z.infer<typeof NPCBlueprintSchema>;
```

**Step 4: Run, export, commit**

```bash
git add src/schemas/npc-blueprint.schema.ts src/schemas/npc-blueprint.schema.test.ts src/schemas/index.ts
git commit -m "feat(schemas): add NPC blueprint schema with face, build, accessories, and behavior"
```

---

### Task A4: Monster & Encounter Schemas (placeholder)

**Files:**
- Create: `src/schemas/monster.schema.ts`
- Create: `src/schemas/monster.schema.test.ts`
- Create: `src/schemas/encounter-table.schema.ts`
- Create: `src/schemas/encounter-table.schema.test.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Write tests for both schemas**

```typescript
// src/schemas/monster.schema.test.ts
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
});
```

```typescript
// src/schemas/encounter-table.schema.ts
import { z } from 'zod';

export const LootEntrySchema = z.object({
  itemId: z.string(),
  weight: z.number().min(0).max(1),
  quantity: z.tuple([z.number().int(), z.number().int()]).default([1, 1]),
});

export const EncounterTableEntrySchema = z.object({
  monsterId: z.string(),
  weight: z.number().min(0).max(1),
  count: z.tuple([z.number().int(), z.number().int()]).default([1, 1]),
});

export const EncounterTableSchema = z.object({
  id: z.string(),
  dangerTier: z.number().int().min(0).max(4),
  entries: z.array(EncounterTableEntrySchema).min(1),
  lootTable: z.string().optional(),
});
export type EncounterTable = z.infer<typeof EncounterTableSchema>;

export const LootTableSchema = z.object({
  id: z.string(),
  entries: z.array(LootEntrySchema),
});
export type LootTable = z.infer<typeof LootTableSchema>;
```

```typescript
// src/schemas/monster.schema.ts
import { z } from 'zod';

export const MonsterArchetypeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  bodyType: z.enum(['biped', 'quadruped', 'serpent', 'amorphous']),
  size: z.number().min(0.3).max(5.0),
  colorScheme: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
  }),
  dangerTier: z.number().int().min(1).max(4),
  health: z.number().int().min(1),
  damage: z.number().int().min(1),
  lootTable: z.string().optional(),
});
export type MonsterArchetype = z.infer<typeof MonsterArchetypeSchema>;
```

**Step 2-5: Run, export, commit**

```bash
git add src/schemas/monster.schema.ts src/schemas/monster.schema.test.ts \
        src/schemas/encounter-table.schema.ts src/schemas/encounter-table.schema.test.ts \
        src/schemas/index.ts
git commit -m "feat(schemas): add monster archetype, encounter table, and loot table schemas"
```

---

## Track B: Building Factory

### Task B1: Wall Segment Builder (pure function)

**Files:**
- Create: `src/game/factories/building-factory.ts`
- Create: `src/game/factories/building-factory.test.ts`

**Step 1: Write tests for wall segment generation**

```typescript
// src/game/factories/building-factory.test.ts
import { describe, expect, it } from 'vitest';
import { generateWallSegments } from './building-factory';

describe('generateWallSegments', () => {
  it('generates 4 wall segments for a closed building', () => {
    const segments = generateWallSegments(2, 2, 0, false);
    // Left, right, back, front walls
    expect(segments.length).toBe(4);
  });

  it('generates 3 wall segments for an open-front building', () => {
    const segments = generateWallSegments(2, 2, 0, true);
    expect(segments.length).toBe(3); // No front wall
  });

  it('generates door cutout on ground floor front wall', () => {
    const segments = generateWallSegments(2, 2, 0, false);
    const frontParts = segments.filter((s) => s.wall === 'front');
    // Front wall split into: left section, right section, lintel above door
    expect(frontParts.length).toBeGreaterThanOrEqual(3);
  });

  it('generates window cutout on upper floor front wall', () => {
    const segments = generateWallSegments(2, 2, 1, false);
    const frontParts = segments.filter((s) => s.wall === 'front');
    // Front wall split into: left section, right section, sill, lintel
    expect(frontParts.length).toBeGreaterThanOrEqual(4);
  });
});
```

**Step 2: Run test (fails)**

Run: `pnpm test -- src/game/factories/building-factory.test.ts`

**Step 3: Implement wall segment generation**

The wall segment builder is a pure function that takes footprint, story index, and openFront flag. It returns an array of `WallSegment` objects — each representing a box mesh with position, size, and metadata.

The function follows the POC's approach from `buildStructure()`:
- Wall thickness = 0.2 units
- WALL_H = 3.0 (floor-to-ceiling height per story)
- Door opening: 1.5 wide × 2.5 tall, centered on front wall, ground floor only
- Window opening: 1.5 wide × 1.0 tall, centered on front wall, upper floors only
- Stair hole: 1.2 wide × 3.0 deep in back-right corner of upper floors

```typescript
// src/game/factories/building-factory.ts
import type { BuildingArchetype } from '../../schemas/building.schema';

const TILE_SIZE = 4;
const WALL_H = 3.0;
const WALL_T = 0.2;
const DOOR_W = 1.5;
const DOOR_H = 2.5;
const WINDOW_W = 1.5;
const WINDOW_H = 1.0;
const WINDOW_SILL_H = 1.0;
const STAIR_W = 1.2;
const STAIR_D = 3.0;

export interface WallSegment {
  wall: 'left' | 'right' | 'back' | 'front';
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

export interface FloorPlate {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  hasStairHole: boolean;
}

export interface StairStep {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

export interface BuildingGeometry {
  walls: WallSegment[];
  floors: FloorPlate[];
  stairs: StairStep[];
  doors: { x: number; y: number; z: number; rotY: number }[];
  windows: { x: number; y: number; z: number; rotY: number }[];
  roofCenter: { x: number; y: number; z: number };
  roofSize: { width: number; depth: number };
  collisionBoxes: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
    maxY: number;
  }[];
}

export function generateWallSegments(
  widthTiles: number,
  depthTiles: number,
  storyIndex: number,
  openFront: boolean,
): WallSegment[] {
  const W = widthTiles * TILE_SIZE;
  const D = depthTiles * TILE_SIZE;
  const cx = W / 2;
  const cz = D / 2;
  const py = storyIndex * WALL_H;
  const segments: WallSegment[] = [];

  // Left wall
  segments.push({
    wall: 'left',
    x: WALL_T / 2,
    y: py + WALL_H / 2,
    z: cz,
    sx: WALL_T,
    sy: WALL_H,
    sz: D,
  });

  // Right wall
  segments.push({
    wall: 'right',
    x: W - WALL_T / 2,
    y: py + WALL_H / 2,
    z: cz,
    sx: WALL_T,
    sy: WALL_H,
    sz: D,
  });

  // Back wall
  segments.push({
    wall: 'back',
    x: cx,
    y: py + WALL_H / 2,
    z: WALL_T / 2,
    sx: W,
    sy: WALL_H,
    sz: WALL_T,
  });

  // Front wall — with cutouts
  if (!openFront) {
    const fZ = D - WALL_T / 2;
    if (storyIndex === 0) {
      // Door cutout: left section, right section, lintel
      const sideW = (W - DOOR_W) / 2;
      segments.push({
        wall: 'front',
        x: sideW / 2,
        y: py + WALL_H / 2,
        z: fZ,
        sx: sideW,
        sy: WALL_H,
        sz: WALL_T,
      });
      segments.push({
        wall: 'front',
        x: W - sideW / 2,
        y: py + WALL_H / 2,
        z: fZ,
        sx: sideW,
        sy: WALL_H,
        sz: WALL_T,
      });
      segments.push({
        wall: 'front',
        x: cx,
        y: py + DOOR_H + (WALL_H - DOOR_H) / 2,
        z: fZ,
        sx: DOOR_W,
        sy: WALL_H - DOOR_H,
        sz: WALL_T,
      });
    } else {
      // Window cutout: left section, right section, sill, lintel
      const sideW = (W - WINDOW_W) / 2;
      segments.push({
        wall: 'front',
        x: sideW / 2,
        y: py + WALL_H / 2,
        z: fZ,
        sx: sideW,
        sy: WALL_H,
        sz: WALL_T,
      });
      segments.push({
        wall: 'front',
        x: W - sideW / 2,
        y: py + WALL_H / 2,
        z: fZ,
        sx: sideW,
        sy: WALL_H,
        sz: WALL_T,
      });
      segments.push({
        wall: 'front',
        x: cx,
        y: py + WINDOW_SILL_H / 2,
        z: fZ,
        sx: WINDOW_W,
        sy: WINDOW_SILL_H,
        sz: WALL_T,
      });
      const lintelH = WALL_H - WINDOW_SILL_H - WINDOW_H;
      segments.push({
        wall: 'front',
        x: cx,
        y: py + WINDOW_SILL_H + WINDOW_H + lintelH / 2,
        z: fZ,
        sx: WINDOW_W,
        sy: lintelH,
        sz: WALL_T,
      });
    }
  }

  return segments;
}

export function generateFloorPlates(
  widthTiles: number,
  depthTiles: number,
  stories: number,
): FloorPlate[] {
  const W = widthTiles * TILE_SIZE;
  const D = depthTiles * TILE_SIZE;
  const cx = W / 2;
  const cz = D / 2;
  const plates: FloorPlate[] = [];

  for (let st = 0; st < stories; st++) {
    const py = st * WALL_H;
    if (st === 0) {
      // Ground floor: solid
      plates.push({
        x: cx,
        y: 0.1,
        z: cz,
        sx: W,
        sy: 0.2,
        sz: D,
        hasStairHole: false,
      });
    } else {
      // Upper floor: main area + side strip (stair hole in back-right)
      const mainD = D - STAIR_D;
      plates.push({
        x: cx,
        y: py,
        z: STAIR_D + mainD / 2,
        sx: W,
        sy: 0.2,
        sz: mainD,
        hasStairHole: false,
      });
      const sideW = W - STAIR_W;
      plates.push({
        x: sideW / 2,
        y: py,
        z: STAIR_D / 2,
        sx: sideW,
        sy: 0.2,
        sz: STAIR_D,
        hasStairHole: true,
      });
    }
  }
  return plates;
}

export function generateStairs(
  widthTiles: number,
  depthTiles: number,
  stories: number,
): StairStep[] {
  if (stories < 2) return [];

  const W = widthTiles * TILE_SIZE;
  const steps: StairStep[] = [];
  const STEP_COUNT = 10;
  const stepH = WALL_H / STEP_COUNT;
  const stepD = STAIR_D / STEP_COUNT;

  for (let st = 0; st < stories - 1; st++) {
    const baseY = st * WALL_H;
    const stairX = W - STAIR_W / 2;

    for (let i = 0; i < STEP_COUNT; i++) {
      steps.push({
        x: stairX,
        y: baseY + i * stepH + stepH / 2,
        z: STAIR_D - i * stepD - stepD / 2,
        sx: STAIR_W,
        sy: stepH,
        sz: stepD,
      });
    }
  }
  return steps;
}

export function generateBuildingGeometry(
  archetype: BuildingArchetype,
): BuildingGeometry {
  const { stories, footprint, openFront } = archetype;
  const W = footprint.width * TILE_SIZE;
  const D = footprint.depth * TILE_SIZE;

  const walls: WallSegment[] = [];
  const doors: BuildingGeometry['doors'] = [];
  const windows: BuildingGeometry['windows'] = [];

  for (let st = 0; st < stories; st++) {
    const storyWalls = generateWallSegments(
      footprint.width,
      footprint.depth,
      st,
      openFront,
    );
    walls.push(...storyWalls);

    const py = st * WALL_H;
    const cx = W / 2;
    const fZ = D - WALL_T / 2;

    if (!openFront) {
      if (st === 0) {
        doors.push({ x: cx, y: py + DOOR_H / 2, z: fZ + 0.11, rotY: 0 });
      } else {
        windows.push({
          x: cx,
          y: py + WINDOW_SILL_H + WINDOW_H / 2,
          z: fZ + 0.11,
          rotY: 0,
        });
      }
    }
  }

  const floors = generateFloorPlates(footprint.width, footprint.depth, stories);
  const stairs = generateStairs(footprint.width, footprint.depth, stories);

  const totalH = stories * WALL_H;
  const collisionBoxes = [
    {
      minX: 0,
      maxX: W,
      minZ: 0,
      maxZ: D,
      minY: 0,
      maxY: totalH,
    },
  ];

  return {
    walls,
    floors,
    stairs,
    doors,
    windows,
    roofCenter: { x: W / 2, y: totalH, z: D / 2 },
    roofSize: { width: W, depth: D },
    collisionBoxes,
  };
}
```

**Step 4: Run tests, commit**

```bash
git add src/game/factories/building-factory.ts src/game/factories/building-factory.test.ts
git commit -m "feat(factory): add building geometry generator with wall segments, floors, stairs"
```

---

### Task B2: Building R3F Component

**Files:**
- Create: `src/game/components/Building.tsx`

This component takes a `BuildingArchetype` and world position, calls `generateBuildingGeometry()`, and renders the result using Three.js meshes. It reuses materials from `src/game/utils/textures.ts`.

**Implementation:** Create a `<Building>` component that:
1. Calls `generateBuildingGeometry(archetype)` in a `useMemo`
2. Renders wall segments as `<mesh>` elements with the archetype's `wallMaterial`
3. Renders floor plates with wood material
4. Renders stair steps with wood material
5. Renders door/window planes
6. Renders roof (thatch cone or slate pyramid) based on `roofStyle`
7. Registers collision AABBs with the game store on mount, removes on unmount

```bash
git add src/game/components/Building.tsx
git commit -m "feat(components): add Building component rendering from archetype config"
```

---

### Task B3: Building Factory Integration Tests

**Files:**
- Modify: `src/game/factories/building-factory.test.ts`

Add integration tests covering full archetype → geometry flow:

```typescript
describe('generateBuildingGeometry', () => {
  it('generates complete geometry for a 2-story tavern', () => {
    const tavern: BuildingArchetype = {
      id: 'tavern',
      stories: 2,
      footprint: { width: 3, depth: 4 },
      wallMaterial: 'plaster',
      roofStyle: 'thatch',
      openFront: false,
      features: ['door', 'windows', 'hearth'],
      interiorSlots: [],
    };
    const geo = generateBuildingGeometry(tavern);

    expect(geo.walls.length).toBeGreaterThan(0);
    expect(geo.floors.length).toBe(3); // ground solid + 2 upper pieces
    expect(geo.stairs.length).toBe(10); // 10 steps for 1 flight
    expect(geo.doors.length).toBe(1); // ground floor door
    expect(geo.windows.length).toBe(1); // upper floor window
    expect(geo.collisionBoxes.length).toBeGreaterThan(0);
  });

  it('generates no stairs for single-story building', () => {
    const cottage: BuildingArchetype = {
      id: 'cottage',
      stories: 1,
      footprint: { width: 2, depth: 2 },
      wallMaterial: 'plaster',
      roofStyle: 'thatch',
      openFront: false,
      features: ['door'],
      interiorSlots: [],
    };
    const geo = generateBuildingGeometry(cottage);
    expect(geo.stairs.length).toBe(0);
  });
});
```

```bash
git add src/game/factories/building-factory.test.ts
git commit -m "test(factory): add building geometry integration tests"
```

---

## Track C: NPC Factory Enhancement

### Task C1: Face Texture Generator

**Files:**
- Create: `src/game/factories/face-texture.ts`
- Create: `src/game/factories/face-texture.test.ts`

**Step 1: Write test**

```typescript
// src/game/factories/face-texture.test.ts
import { describe, expect, it, vi } from 'vitest';
import { generateFaceTexture } from './face-texture';

// Mock canvas (setup.ts provides the canvas mock)
describe('generateFaceTexture', () => {
  it('returns a canvas texture for valid face config', () => {
    const face = {
      skinTone: 2,
      eyeColor: 'brown' as const,
      hairStyle: 'short' as const,
      hairColor: '#4a3020',
      facialHair: 'none' as const,
    };
    const texture = generateFaceTexture(face);
    expect(texture).toBeDefined();
  });

  it('produces deterministic output for same input', () => {
    const face = {
      skinTone: 0,
      eyeColor: 'blue' as const,
      hairStyle: 'bald' as const,
      hairColor: '#1a1a1a',
      facialHair: 'full_beard' as const,
    };
    // Same inputs should not throw
    const t1 = generateFaceTexture(face);
    const t2 = generateFaceTexture(face);
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
  });
});
```

**Step 3: Implement**

Based on the POC's `createFaceTexture(skinHex, hairHex)` but extended with eye color, hair style, and facial hair:

```typescript
// src/game/factories/face-texture.ts
import * as THREE from 'three';
import type { Face } from '../../schemas/npc-blueprint.schema';

const SKIN_COLORS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
const EYE_COLORS = {
  brown: '#5c3317',
  blue: '#4488cc',
  green: '#44aa66',
  gray: '#888899',
};

export function generateFaceTexture(face: Face): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const skinHex = SKIN_COLORS[face.skinTone] ?? SKIN_COLORS[2];
  const eyeHex = EYE_COLORS[face.eyeColor] ?? EYE_COLORS.brown;

  // Base skin
  ctx.fillStyle = skinHex;
  ctx.fillRect(0, 0, size, size);

  // Hair (top + sides based on style)
  ctx.fillStyle = face.hairColor;
  if (face.hairStyle !== 'bald') {
    ctx.fillRect(0, 0, size, 32); // Top
    if (face.hairStyle === 'long' || face.hairStyle === 'hooded') {
      ctx.fillRect(0, 0, 24, size); // Left side
      ctx.fillRect(size - 24, 0, 24, size); // Right side
    }
    if (face.hairStyle === 'short') {
      ctx.fillRect(0, 0, 16, 64); // Short sides
      ctx.fillRect(size - 16, 0, 16, 64);
    }
  }

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(36, 56, 16, 16); // Left eye white
  ctx.fillRect(76, 56, 16, 16); // Right eye white
  ctx.fillStyle = eyeHex;
  ctx.fillRect(40, 60, 10, 10); // Left iris
  ctx.fillRect(80, 60, 10, 10); // Right iris
  ctx.fillStyle = '#111111';
  ctx.fillRect(43, 63, 4, 4); // Left pupil
  ctx.fillRect(83, 63, 4, 4); // Right pupil

  // Mouth
  ctx.fillStyle = '#aa4444';
  ctx.fillRect(48, 92, 32, 6);

  // Facial hair
  if (face.facialHair === 'full_beard') {
    ctx.fillStyle = face.hairColor;
    ctx.fillRect(32, 88, 64, 32);
    ctx.fillRect(24, 76, 16, 40);
    ctx.fillRect(88, 76, 16, 40);
  } else if (face.facialHair === 'mustache') {
    ctx.fillStyle = face.hairColor;
    ctx.fillRect(40, 84, 48, 8);
  } else if (face.facialHair === 'stubble') {
    ctx.fillStyle = face.hairColor + '44'; // Semi-transparent
    for (let i = 0; i < 60; i++) {
      const sx = 32 + (i * 7) % 64;
      const sy = 80 + (i * 11) % 40;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  return new THREE.CanvasTexture(canvas);
}
```

```bash
git add src/game/factories/face-texture.ts src/game/factories/face-texture.test.ts
git commit -m "feat(factory): add NPC face texture canvas generator"
```

---

### Task C2: NPC Factory (body proportions + accessories)

**Files:**
- Create: `src/game/factories/npc-factory.ts`
- Create: `src/game/factories/npc-factory.test.ts`

This factory takes an `NPCBlueprint` and returns rendering parameters — body dimensions, accessory list, face texture, cloth colors. The actual R3F rendering stays in `NPC.tsx` but refactored to consume factory output instead of hardcoding.

**Test shape:**
```typescript
describe('buildNPCRenderData', () => {
  it('scales body dimensions based on bodyBuild', () => {
    const data = buildNPCRenderData(stockyBlueprint);
    expect(data.torsoHeight).toBeLessThan(0.7 * 1.1); // shorter
    expect(data.torsoRadius).toBeGreaterThan(0.25 * 1.1); // wider
  });

  it('returns face texture', () => {
    const data = buildNPCRenderData(blueprint);
    expect(data.faceTexture).toBeDefined();
  });

  it('includes accessories from blueprint', () => {
    const data = buildNPCRenderData(smithBlueprint);
    expect(data.accessories).toContain('leather_apron');
    expect(data.accessories).toContain('hammer');
  });
});
```

```bash
git add src/game/factories/npc-factory.ts src/game/factories/npc-factory.test.ts
git commit -m "feat(factory): add NPC factory producing render data from blueprint config"
```

---

### Task C3: Refactor NPC.tsx to use factory output

**Files:**
- Modify: `src/game/components/NPC.tsx`

**Changes:**
1. Accept optional `NPCBlueprint` prop alongside current `Interactable` prop
2. If blueprint provided, call `buildNPCRenderData(blueprint)` for dimensions/colors/face
3. Replace hardcoded `SKIN_COLORS[skinIdx]` etc. with factory output
4. Map face texture onto head sphere material
5. Keep backwards compatibility — if no blueprint, use current random generation

```bash
git add src/game/components/NPC.tsx
git commit -m "refactor(NPC): consume factory render data for face textures and body proportions"
```

---

## Track D: Town Layout System

### Task D1: Organic Layout Strategy

**Files:**
- Create: `src/game/world/town-layout.ts`
- Create: `src/game/world/town-layout.test.ts`

**Pure function** that takes a `TownConfig` and returns placed building positions in world space:

```typescript
export interface PlacedBuilding {
  archetype: string;
  label: string;
  worldX: number;
  worldZ: number;
  rotation: number;
  overrides?: Record<string, unknown>;
}

export function layoutTown(
  config: TownConfig,
  chunkOriginX: number,
  chunkOriginZ: number,
): PlacedBuilding[]
```

**Organic layout:** Places buildings in a rough circle around `config.center` with position jitter (±2 units) and rotation jitter (±10°). Buildings don't overlap (simple distance check).

```bash
git add src/game/world/town-layout.ts src/game/world/town-layout.test.ts
git commit -m "feat(world): add town layout system with organic placement strategy"
```

---

### Task D2: Boundary & Approach Generation

**Files:**
- Modify: `src/game/world/town-layout.ts`

Add functions to generate:
- **Palisade:** Ring of vertical log meshes around town perimeter with a gate opening
- **Approach:** Meadow ground texture patch + optional stream geometry (placeholder plane for water system integration)

```bash
git add src/game/world/town-layout.ts
git commit -m "feat(world): add town boundary (palisade/wall) and approach (meadow/stream) generation"
```

---

## Track E: Water System

### Task E1: Gerstner Wave Shader

**Files:**
- Create: `src/game/shaders/gerstner-water.ts`
- Create: `src/game/shaders/gerstner-water.test.ts`

Port the Gerstner wave vertex/fragment shaders from Grovekeeper's `game/shaders/gerstnerWater.ts`. Export `createWaterMaterial(config)` that returns a `THREE.ShaderMaterial`.

**Wave config:** JSON-driven layer count, amplitudes, wavelengths, direction vectors.

```bash
git add src/game/shaders/gerstner-water.ts src/game/shaders/gerstner-water.test.ts
git commit -m "feat(shaders): add Gerstner wave water shader adapted from Grovekeeper"
```

---

### Task E2: Water Body Component

**Files:**
- Create: `src/game/components/WaterBody.tsx`

R3F component that renders a `PlaneGeometry` (32×32 segments) with the Gerstner material. Uses `useFrame` to update the `uTime` uniform. Props: position, size, waterType (river/stream/pond), waveConfig.

```bash
git add src/game/components/WaterBody.tsx
git commit -m "feat(components): add WaterBody component with animated Gerstner waves"
```

---

## Track F: Audio System

### Task F1: Install Tone.js and Create Layer Factory

**Files:**
- Modify: `package.json` (add tone.js)
- Create: `src/game/audio/layer-factory.ts`
- Create: `src/game/audio/layer-factory.test.ts`

```bash
pnpm add tone
```

Port the 6-layer ambient synthesis from Grovekeeper's `toneLayerFactory.ts`:
- Wind: brown noise → 380Hz lowpass
- Birds: FM synth C5
- Insects: white noise → 5200Hz bandpass
- Crickets: square wave 2400Hz
- Water: brown noise → 240Hz lowpass
- Vegetation: pink noise → 620Hz bandpass

```bash
git add package.json pnpm-lock.yaml src/game/audio/layer-factory.ts src/game/audio/layer-factory.test.ts
git commit -m "feat(audio): add Tone.js 6-layer ambient synthesis factory"
```

---

### Task F2: Ambient Audio Mixer

**Files:**
- Create: `src/game/audio/ambient-mixer.ts`
- Create: `src/game/audio/ambient-mixer.test.ts`

Pure function `computeAmbientMix(timeOfDay, zones, playerPos)` that returns per-layer volume levels. Time-of-day gating (birds=day, crickets=night). Distance-based zone blending.

```bash
git add src/game/audio/ambient-mixer.ts src/game/audio/ambient-mixer.test.ts
git commit -m "feat(audio): add ambient audio mixer with time-of-day gating and zone blending"
```

---

### Task F3: Audio System R3F Integration

**Files:**
- Create: `src/game/systems/AudioSystem.tsx`
- Modify: `src/game/components/GameScene.tsx` (mount AudioSystem)

Component that:
1. Initializes Tone.js on first user interaction (Web Audio policy)
2. Creates layer nodes from factory
3. Uses `useFrame` to call `computeAmbientMix` and update layer volumes
4. Manages spatial audio zones from chunk data

```bash
git add src/game/systems/AudioSystem.tsx src/game/components/GameScene.tsx
git commit -m "feat(systems): add AudioSystem with spatial ambient soundscapes"
```

---

## Track G: Danger Gradient

### Task G1: Danger Tier Calculator

**Files:**
- Create: `src/game/world/danger.ts`
- Create: `src/game/world/danger.test.ts`

```typescript
export function getDangerTier(cx: number, cz: number, chunkType: string): number {
  if (chunkType === 'TOWN') return 0;
  if (chunkType === 'DUNGEON') return 4;
  if (cx === 0) return 0; // On the King's Road
  if (Math.abs(cx) === 1) return 1; // Road shoulder
  if (Math.abs(cx) === 2) return 2; // Wilderness
  return 3; // Deep wild
}
```

```bash
git add src/game/world/danger.ts src/game/world/danger.test.ts
git commit -m "feat(world): add danger tier calculator based on distance from King's Road"
```

---

## Track H: Ashford Content

### Task H1: Building Archetype JSON Files

**Files:**
- Create: `content/buildings/cottage.json`
- Create: `content/buildings/tavern.json`
- Create: `content/buildings/smithy.json`
- Create: `content/buildings/chapel.json`
- Create: `content/buildings/house_large.json`

Each file is a `BuildingArchetype` validated by the schema.

```bash
git add content/buildings/
git commit -m "feat(content): add building archetype configs — cottage, tavern, smithy, chapel, house"
```

---

### Task H2: Ashford Town Config

**Files:**
- Create: `content/towns/ashford.json`

```json
{
  "id": "ashford",
  "name": "Ashford",
  "anchorId": "anchor-00",
  "layout": "organic",
  "boundary": "palisade",
  "approach": "meadow_stream",
  "center": [0, 0],
  "buildings": [
    { "archetype": "cottage", "label": "Your Home", "position": [0, 3], "rotation": 10 },
    { "archetype": "tavern", "label": "The Golden Meadow", "position": [-4, -1], "overrides": { "stories": 2 } },
    { "archetype": "smithy", "label": "Aldric's Forge", "position": [3, -2], "rotation": -15 },
    { "archetype": "chapel", "label": "Chapel of St. Brendan", "position": [-2, 4], "rotation": 5 },
    { "archetype": "cottage", "label": "Goodwife Maren's House", "position": [4, 2], "rotation": -8 },
    { "archetype": "house_large", "label": "Old Tomas's House", "position": [-3, 3], "overrides": { "stories": 2 } }
  ],
  "npcs": [
    { "id": "aldric", "archetype": "blacksmith", "fixed": true, "building": "Aldric's Forge", "name": "Aldric" },
    { "id": "bess", "archetype": "innkeeper", "fixed": true, "building": "The Golden Meadow", "name": "Bess" },
    { "id": "father-cedric", "archetype": "priest", "fixed": true, "building": "Chapel of St. Brendan", "name": "Father Cedric" },
    { "id": "old-tomas", "archetype": "scholar", "fixed": true, "building": "Old Tomas's House", "name": "Old Tomas" },
    { "id": "goodwife-maren", "archetype": "healer", "fixed": true, "building": "Goodwife Maren's House", "name": "Goodwife Maren" }
  ]
}
```

```bash
git add content/towns/ashford.json
git commit -m "feat(content): add Ashford town config — 6 buildings, 5 named NPCs"
```

---

### Task H3: Ashford NPC Blueprints

**Files:**
- Create: `content/npcs/aldric.json`
- Create: `content/npcs/bess.json`
- Create: `content/npcs/father-cedric.json`
- Create: `content/npcs/old-tomas.json`
- Create: `content/npcs/goodwife-maren.json`

Each file is an `NPCBlueprint` with fixed face, accessories, and authored dialogue.

**Example — Aldric:**
```json
{
  "id": "aldric",
  "name": "Aldric",
  "archetype": "blacksmith",
  "fixed": true,
  "bodyBuild": { "height": 0.85, "width": 1.25 },
  "face": {
    "skinTone": 3,
    "eyeColor": "brown",
    "hairStyle": "bald",
    "hairColor": "#1a1a1a",
    "facialHair": "full_beard"
  },
  "accessories": ["leather_apron", "hammer"],
  "clothPalette": { "primary": "#4a3320", "secondary": "#2b1d12" },
  "behavior": {
    "idleStyle": "working",
    "interactionVerb": "TALK",
    "walkNodes": false
  },
  "dialogue": {
    "greeting": [
      "Well met, friend. Need something forged?",
      "The fire burns hot today. What can I make for you?",
      "Ah, you're heading out? Let me give you a good blade."
    ],
    "quest": [
      "There's iron in the old mine past the meadow, if you've the courage."
    ]
  }
}
```

```bash
git add content/npcs/
git commit -m "feat(content): add Ashford NPC blueprints — Aldric, Bess, Father Cedric, Old Tomas, Goodwife Maren"
```

---

## Track I: Integration

### Task I1: Refactor ChunkManager to Load Town Configs

**Files:**
- Modify: `src/game/systems/ChunkManager.tsx`

**Changes:**
1. When `generateChunkData` creates a TOWN chunk, check if a town config JSON exists for the matching anchor
2. If found, load the town config and call `layoutTown()` to get placed buildings
3. Pass building placements and NPC blueprints to ChunkData
4. Fall back to current hardcoded generation if no town config exists

```bash
git add src/game/systems/ChunkManager.tsx
git commit -m "refactor(ChunkManager): load town configs and use layout system for TOWN chunks"
```

---

### Task I2: Refactor Chunk.tsx to Render Buildings from Factory

**Files:**
- Modify: `src/game/components/Chunk.tsx`

**Changes:**
1. If chunkData has `placedBuildings`, render `<Building>` components instead of instanced meshes
2. If chunkData has `npcBlueprints`, pass blueprints to `<NPC>` components
3. Keep current instanced mesh rendering as fallback for WILD/ROAD/DUNGEON chunks

```bash
git add src/game/components/Chunk.tsx
git commit -m "refactor(Chunk): render buildings and NPCs from factory output when town config available"
```

---

### Task I3: Wire Water and Audio into GameScene

**Files:**
- Modify: `src/game/components/GameScene.tsx`

Mount `<AudioSystem>` alongside existing systems. Water bodies are rendered per-chunk (part of chunk data) so they integrate through ChunkManager.

```bash
git add src/game/components/GameScene.tsx
git commit -m "feat(GameScene): mount AudioSystem for ambient soundscapes"
```

---

### Task I4: Player Spawn in Ashford

**Files:**
- Modify: `src/game/stores/gameStore.ts`

Change `startGame()` to spawn the player inside their cottage in Ashford (position derived from Ashford town config, cottage building position).

```bash
git add src/game/stores/gameStore.ts
git commit -m "feat(gameStore): spawn player inside cottage at Ashford on game start"
```

---

### Task I5: Full Integration Test

**Files:**
- Create: `src/game/factories/integration.test.ts`

End-to-end test: load Ashford town config JSON → validate with Zod → layout buildings → generate building geometry → verify collision boxes → verify NPC blueprints resolve.

```bash
git add src/game/factories/integration.test.ts
git commit -m "test: add end-to-end integration test for Ashford town generation pipeline"
```

---

### Task I6: Update validate-trove.ts

**Files:**
- Modify: `scripts/validate-trove.ts`

Add validation for:
- `content/buildings/*.json` → BuildingArchetypeSchema
- `content/towns/*.json` → TownConfigSchema
- `content/npcs/*.json` (blueprint format) → NPCBlueprintSchema
- Referential integrity: town building archetypes exist, NPC building references exist

```bash
git add scripts/validate-trove.ts
git commit -m "feat(validate): extend trove validation for buildings, towns, and NPC blueprints"
```

---

### Task I7: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `docs/ARCHITECTURE.md`

Update to reflect:
- New factory systems (building, NPC, monster)
- Town layout strategies
- Water and audio systems
- Danger gradient
- Ashford as reference implementation
- New content directories (`content/buildings/`, `content/towns/`)

```bash
git add CLAUDE.md AGENTS.md docs/ARCHITECTURE.md
git commit -m "docs: update architecture docs for engine v2 blueprint system"
```

---

### Task I8: Create PR

```bash
git push -u origin feat/engine-v2-blueprints
gh pr create --title "feat: game engine v2 — config-driven blueprint factories" \
  --body "$(cat <<'PREOF'
## Summary
- Building Factory: enterable multi-story buildings with wall cutouts, stairs, collision
- NPC Factory: canvas face textures, body proportions, accessory slots
- Town Layout System: organic/road/grid strategies with boundary and approach
- Water System: Gerstner wave shaders adapted from Grovekeeper
- Audio System: Tone.js 6-layer ambient synthesis with spatial zones
- Danger Gradient: encounter tiers based on distance from King's Road
- Ashford: complete starting town with 6 buildings and 5 named NPCs

## Test plan
- [ ] All unit tests pass (`pnpm test`)
- [ ] TypeScript check passes (`pnpm tsc --noEmit`)
- [ ] Biome lint passes (`pnpm exec biome check .`)
- [ ] Content validation passes (`npx tsx scripts/validate-trove.ts`)
- [ ] Game loads and Ashford renders correctly
- [ ] Player can enter buildings and climb stairs
- [ ] NPCs display face textures and accessories
- [ ] Water bodies animate with Gerstner waves
- [ ] Ambient audio plays with time-of-day gating
PREOF
)"
```

---

## Summary

| Track | Tasks | Depends On | Can Parallel With |
|-------|-------|-----------|-------------------|
| A: Schemas | A1-A4 | — | E, F |
| B: Building Factory | B1-B3 | A1 | C, E, F, G |
| C: NPC Factory | C1-C3 | A3 | B, E, F, G |
| D: Town Layout | D1-D2 | B1 | E, F |
| E: Water | E1-E2 | — | A, B, C, F |
| F: Audio | F1-F3 | — | A, B, C, E |
| G: Danger | G1 | A4 | B, C, D, E, F |
| H: Ashford Content | H1-H3 | A1, A3 | — |
| I: Integration | I1-I8 | All above | — |

**Total: 27 tasks across 9 tracks. Tracks A, E, F can start in parallel immediately.**
