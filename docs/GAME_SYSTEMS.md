---
title: Game Systems
updated: 2026-04-09
status: current
domain: technical
---

# Game Systems

This document details the gameplay systems in King's Road.

## Quest System

### Quest Tiers

King's Road uses a three-tier quest system plus a main quest line:

| Tier | Duration | Scope | Branching | Trigger |
|------|----------|-------|-----------|---------|
| **Main Quest** | 20-40 min/chapter | 6 chapters, Ashford to Grailsend | A/B required | Anchor arrival |
| **Macro** | 60-120 min | Multi-location chains | A/B required | Anchor or prerequisite |
| **Meso** | 15-45 min | Self-contained at one anchor | A/B required | Anchor arrival |
| **Micro** | 5-15 min | Roadside encounters | Linear allowed | Distance along road |

### Main Quest

The main quest follows a Holy Grail narrative across 6 chapters, one per anchor in the road spine. It is linear in progression (chapter-00 must complete before chapter-01) but each chapter offers A/B branching within it.

| Chapter | Anchor | Theme |
|---------|--------|-------|
| The Call | Ashford | Departure from home |
| The First Test | Millbrook | Test of kindness/wisdom |
| The Old Secret | Thornfield Ruins | Trial of courage |
| The Tyrant's Shadow | Ravensgate | Test of justice |
| The Vigil | The Pilgrim's Rest | Spiritual preparation |
| The Grail | Grailsend | Final revelation |

### A/B Branching

Meso and macro quests require two branches (A and B) offering meaningfully different approaches to the same situation. Branch selection happens at a decision point during the quest.

```json
{
  "branches": {
    "A": {
      "label": "Confront the poisoner",
      "steps": [...],
      "reward": { "type": "modifier", "modifierId": "village-hero" }
    },
    "B": {
      "label": "Find the cure",
      "steps": [...],
      "reward": { "type": "modifier", "modifierId": "village-healer" }
    }
  }
}
```

Rules:
- Branches must be meaningfully different (not cosmetic variations)
- Each branch has its own steps and optional reward
- The quest also has a top-level reward given regardless of branch
- Labels should be clear, actionable choices

### Quest Steps

Each quest step has a type determining its gameplay:

| Step Type | Description |
|-----------|-------------|
| `dialogue` | NPC conversation (validated word count) |
| `fetch` | Retrieve an item |
| `escort` | Accompany someone to a destination |
| `investigate` | Search an area for clues |
| `encounter` | Combat, puzzle, or social challenge |
| `travel` | Move to a location |
| `puzzle` | Solve a puzzle |

### Quest Triggers

| Type | When |
|------|------|
| `roadside` | Player reaches a distance range along the road |
| `anchor` | Player arrives at a specific anchor point |
| `prerequisite` | Another quest has been completed |

### Quest Log (ECS)

The `QuestLog` trait tracks quest state per entity:

```typescript
QuestLog = trait(() => ({
  activeQuests: [] as Array<{
    questId: string;
    currentStep: number;
    branch?: 'A' | 'B';
  }>,
  completedQuests: [] as string[],
  mainQuestChapter: 0,
}));
```

## ECS Traits

King's Road uses Koota ECS for game state. Traits are composable data components attached to entities.

### Spatial Traits

```typescript
Position = trait({ x: 0, y: 0, z: 0 });
Velocity = trait({ x: 0, y: 0, z: 0 });
Rotation = trait({ yaw: 0, pitch: 0 });
```

### Player Traits

```typescript
IsPlayer = trait();                    // Tag trait
Health = trait({ current: 100, max: 100 });
Stamina = trait({ current: 100, max: 100 });
Movement = trait({
  speed: 0, angularSpeed: 0,
  isSprinting: false, isGrounded: true,
});
PlayerInput = trait({
  forward: false, backward: false,
  left: false, right: false,
  strafeLeft: false, strafeRight: false,
  jump: false, walk: false, interact: false,
});
DistanceTraveled = trait({ total: 0, sinceLastFeature: 0 });
```

### NPC Traits

```typescript
IsNPC = trait();                       // Tag trait
NPCArchetype = trait({ archetype: '' });
Dialogue = trait(() => ({
  greetings: [] as string[],
  questDialogue: {} as Record<string, string[]>,
}));
Interactable = trait({ radius: 3, actionVerb: 'Talk' });
```

### Pacing Traits

```typescript
RoadPosition = trait({ distance: 0 }); // Distance along King's Road
IsOnRoad = trait();                     // Tag trait
IsAnchor = trait({ anchorId: '' });
IsFeature = trait({ featureId: '', tier: '' });
```

## Player Controller

### Physics Model

Simplified first-person physics:
- Horizontal: acceleration/friction model
- Vertical: gravity with ground detection
- Collision: AABB sliding (separate X and Z axes)

### Movement Constants

```typescript
GRAVITY = 25.0           // Units/s^2
JUMP_FORCE = 6.5         // Initial upward velocity
ACCELERATION = 35.0      // Movement acceleration
BASE_SPEED = 5.5         // Normal max speed
SPRINT_MULTIPLIER = 1.8  // Sprint speed
WALK_MULTIPLIER = 0.5    // Walk speed (SHIFT)
FRICTION = 20.0          // Deceleration rate
TURN_ACCEL = 12.0        // Rotation acceleration
MAX_TURN = 2.5           // Max rotation speed
```

### Stamina

| State | Speed | Stamina Change |
|-------|-------|----------------|
| Walk (SHIFT) | 50% | +20/s (fast regen) |
| Normal | 100% | +15/s (regen) |
| Sprint (joystick far) | 180% | -25/s (drain) |

Sprint stops automatically when stamina depletes.

### Head Bob

While moving: `camera.y += sin(headBobTimer) * 0.1`

## Day/Night Cycle

### Time System

```
DAY_DURATION = 600 seconds (10 real minutes = 1 game day)
timeOfDay = 0.0 to 1.0 (0 = midnight, 0.5 = noon)
```

### Sun Arc

The sun follows a circular arc. At `timeOfDay = 0.25` (6 AM), the sun rises. At `0.5` (noon) it is at zenith. At `0.75` (6 PM) it sets.

### Light Transitions

| Time | Sun | Ambient | Fog |
|------|-----|---------|-----|
| Day | Golden directional | Warm white #fff8e7 | Cream haze |
| Night | Off | Soft blue #1a1a3e | Deep blue |
| Transition | Fading intensity | Interpolated | Interpolated |

At night, the player lantern provides an orange point light with flicker effect. Windows emit warm amber glow.

## Interaction System

### Detection

Each frame, the InteractionSystem checks:
1. Distance: Is an NPC within its `radius`?
2. Line of sight: Is the player facing the NPC (dot product > 0.5)?

If both pass, the HUD shows "[E] TALK Name".

### Flow

```
Approach NPC --> Distance check --> Facing check --> Show prompt
    --> Press E --> Open DialogueBox, lock input
    --> Click "Farewell" --> Close dialogue, unlock input
```

## Input System

### Sources

- **Keyboard**: WASD movement, QE turning, Space jump, Shift walk, E interact
- **Mouse**: Click and drag for camera rotation
- **Touch**: Virtual joystick for movement, action buttons for jump/interact

All input flows into the game store, which the PlayerController reads each frame.

## Chunk Management

### Streaming

Each frame, ChunkManager determines which chunks should be loaded based on player position. Chunks within `VIEW_DISTANCE` (1 chunk in each direction) are loaded; distant chunks are unloaded.

### Persistence

When a chunk unloads:
- Collision AABBs removed from global list
- Interactables removed from global list
- Collected items tracked in `chunkDeltas` for when chunk reloads

### Memory Layout

```
Zustand Store
├── activeChunks: Map<string, ChunkData>
│   └── ChunkData: { cx, cz, key, type, name, collidables, interactables }
├── globalAABBs: AABB[]          (flat collision list)
├── globalInteractables: []      (flat NPC list)
└── chunkDeltas: Record<string>  (persistence)
```

## Rendering Pipeline

### Frame Order

1. Environment.DayNightCycle -- update time, lighting
2. ChunkManager -- load/unload chunks
3. PlayerController -- physics, camera
4. InteractionSystem -- NPC detection
5. NPC[] -- idle animation
6. Relic[] -- collection check, animation
7. PostProcessing -- SMAA, bloom, vignette
8. R3F -- render scene
