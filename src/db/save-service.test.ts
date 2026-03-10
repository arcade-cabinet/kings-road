import { describe, expect, it } from 'vitest';
import type {
  GameStoreSnapshot,
  InventorySnapshot,
  QuestStoreSnapshot,
  RestoreTarget,
  SaveData,
} from './save-service';
import { restoreGameState, snapshotGameState } from './save-service';

// ── Mock Vector3 (avoid importing Three.js in unit tests) ─────────────

function makeVec3(x: number, y: number, z: number) {
  return { x, y, z } as GameStoreSnapshot['playerPosition'];
}

// ── Fixtures ──────────────────────────────────────────────────────────

const GAME_STORE: GameStoreSnapshot = {
  seedPhrase: 'Golden Verdant Meadow',
  playerPosition: makeVec3(120.5, 1.6, 480.3),
  cameraYaw: 3.14,
  health: 85,
  stamina: 60,
  timeOfDay: 0.625,
  gemsCollected: 7,
  chunkDeltas: {
    '1,4': { gems: [2, 5] },
    '2,3': { gems: [0] },
  },
  inDungeon: false,
  activeDungeon: null,
};

const QUEST_STORE: QuestStoreSnapshot = {
  activeQuests: [
    { questId: 'chapter-00', currentStep: 2 },
    { questId: 'lost-pilgrim', currentStep: 0, branch: 'A' },
  ],
  completedQuests: ['aldrics-missing-hammer'],
  triggeredQuests: ['chapter-00', 'lost-pilgrim', 'aldrics-missing-hammer'],
};

const INVENTORY: InventorySnapshot = {
  items: [
    { itemId: 'health_potion', quantity: 3 },
    { itemId: 'iron_sword', quantity: 1 },
    { itemId: 'ration', quantity: 5 },
  ],
  gold: 42,
  equipment: {
    head: null,
    chest: null,
    legs: null,
    feet: null,
    weapon: 'iron_sword',
    shield: null,
    accessory: null,
  },
};

// ── Tests ─────────────────────────────────────────────────────────────

describe('snapshotGameState', () => {
  it('captures player position as plain object', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Test Save',
      3600,
    );
    expect(save.player.position).toEqual({ x: 120.5, y: 1.6, z: 480.3 });
  });

  it('captures seed phrase and display name', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'My Realm',
      100,
    );
    expect(save.seedPhrase).toBe('Golden Verdant Meadow');
    expect(save.displayName).toBe('My Realm');
  });

  it('captures player vitals', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      0,
    );
    expect(save.player.health).toBe(85);
    expect(save.player.stamina).toBe(60);
    expect(save.player.cameraYaw).toBe(3.14);
    expect(save.player.timeOfDay).toBe(0.625);
    expect(save.player.gemsCollected).toBe(7);
  });

  it('captures inventory items and gold', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      0,
    );
    expect(save.inventory.items).toHaveLength(3);
    expect(save.inventory.items[0]).toEqual({
      itemId: 'health_potion',
      quantity: 3,
    });
    expect(save.inventory.gold).toBe(42);
  });

  it('captures equipment slots', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      0,
    );
    expect(save.inventory.equipment.weapon).toBe('iron_sword');
    expect(save.inventory.equipment.head).toBeNull();
  });

  it('captures active quests with branches', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      0,
    );
    expect(save.quests.activeQuests).toHaveLength(2);
    expect(save.quests.activeQuests[1]).toEqual({
      questId: 'lost-pilgrim',
      currentStep: 0,
      branch: 'A',
    });
  });

  it('captures completed and triggered quests', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      0,
    );
    expect(save.quests.completedQuests).toEqual(['aldrics-missing-hammer']);
    expect(save.quests.triggeredQuests).toHaveLength(3);
  });

  it('captures chunk deltas', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      0,
    );
    expect(save.chunkDeltas['1,4']).toEqual({ gems: [2, 5] });
    expect(save.chunkDeltas['2,3']).toEqual({ gems: [0] });
  });

  it('produces a deep copy (mutation-safe)', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      0,
    );

    // Mutate the original — save should be unaffected
    GAME_STORE.chunkDeltas['1,4'].gems.push(99);
    expect(save.chunkDeltas['1,4'].gems).not.toContain(99);

    // Clean up
    GAME_STORE.chunkDeltas['1,4'].gems.pop();
  });

  it('sets savedAt to a valid ISO timestamp', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      0,
    );
    const parsed = new Date(save.savedAt);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it('records play time', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Save',
      7200,
    );
    expect(save.playTimeSeconds).toBe(7200);
  });
});

describe('SaveData is JSON-serializable', () => {
  it('round-trips through JSON.stringify/parse', () => {
    const save = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'JSON Test',
      999,
    );
    const json = JSON.stringify(save);
    const restored = JSON.parse(json);
    expect(restored).toEqual(save);
  });
});

// ── restoreGameState tests ────────────────────────────────────────────

/** Creates a mock RestoreTarget that records every call. */
function createMockTarget() {
  const calls: Record<string, unknown[]> = {
    startGame: [],
    mergeGameState: [],
    restoreInventory: [],
    restoreQuests: [],
  };
  const target: RestoreTarget = {
    startGame: (seed, pos, yaw) => {
      calls.startGame.push({ seed, pos, yaw });
    },
    mergeGameState: (partial) => {
      calls.mergeGameState.push(partial);
    },
    restoreInventory: (items, gold, equipment) => {
      calls.restoreInventory.push({ items, gold, equipment });
    },
    restoreQuests: (activeQuests, completedQuests, triggeredQuests) => {
      calls.restoreQuests.push({
        activeQuests,
        completedQuests,
        triggeredQuests,
      });
    },
  };
  return { target, calls };
}

/** Build a SaveData from the test fixtures. */
function buildTestSaveData(): SaveData {
  return snapshotGameState(GAME_STORE, QUEST_STORE, INVENTORY, 'Test', 3600);
}

describe('restoreGameState', () => {
  it('calls startGame with seed, position, and yaw from save data', () => {
    const { target, calls } = createMockTarget();
    const data = buildTestSaveData();

    restoreGameState(data, target);

    expect(calls.startGame).toHaveLength(1);
    const call = calls.startGame[0] as {
      seed: string;
      pos: { x: number; y: number; z: number };
      yaw: number;
    };
    expect(call.seed).toBe('Golden Verdant Meadow');
    expect(call.pos).toEqual({ x: 120.5, y: 1.6, z: 480.3 });
    expect(call.yaw).toBe(3.14);
  });

  it('merges health, stamina, timeOfDay, gemsCollected, and chunkDeltas', () => {
    const { target, calls } = createMockTarget();
    const data = buildTestSaveData();

    restoreGameState(data, target);

    expect(calls.mergeGameState).toHaveLength(1);
    const merged = calls.mergeGameState[0] as Record<string, unknown>;
    expect(merged.health).toBe(85);
    expect(merged.stamina).toBe(60);
    expect(merged.timeOfDay).toBe(0.625);
    expect(merged.gemsCollected).toBe(7);
    expect(merged.chunkDeltas).toEqual({
      '1,4': { gems: [2, 5] },
      '2,3': { gems: [0] },
    });
  });

  it('restores quest progress with preserved currentStep values', () => {
    const { target, calls } = createMockTarget();
    const data = buildTestSaveData();

    restoreGameState(data, target);

    expect(calls.restoreQuests).toHaveLength(1);
    const questCall = calls.restoreQuests[0] as {
      activeQuests: Array<{
        questId: string;
        currentStep: number;
        branch?: string;
      }>;
      completedQuests: string[];
      triggeredQuests: string[];
    };

    // Critically: currentStep must be 2 for chapter-00, not reset to 0
    expect(questCall.activeQuests[0]).toEqual({
      questId: 'chapter-00',
      currentStep: 2,
    });
    expect(questCall.activeQuests[1]).toEqual({
      questId: 'lost-pilgrim',
      currentStep: 0,
      branch: 'A',
    });
    expect(questCall.completedQuests).toEqual(['aldrics-missing-hammer']);
    expect(questCall.triggeredQuests).toHaveLength(3);
  });

  it('restores inventory items, gold, and equipment', () => {
    const { target, calls } = createMockTarget();
    const data = buildTestSaveData();

    restoreGameState(data, target);

    expect(calls.restoreInventory).toHaveLength(1);
    const invCall = calls.restoreInventory[0] as {
      items: Array<{ itemId: string; quantity: number }>;
      gold: number;
      equipment: Record<string, string | null>;
    };
    expect(invCall.items).toHaveLength(3);
    expect(invCall.items[0]).toEqual({ itemId: 'health_potion', quantity: 3 });
    expect(invCall.gold).toBe(42);
    expect(invCall.equipment.weapon).toBe('iron_sword');
  });

  it('does not leak references — mutating restored chunkDeltas does not affect save data', () => {
    const { target, calls } = createMockTarget();
    const data = buildTestSaveData();

    restoreGameState(data, target);

    const merged = calls.mergeGameState[0] as {
      chunkDeltas: Record<string, { gems: number[] }>;
    };
    // Mutate the restored deltas
    merged.chunkDeltas['1,4'].gems.push(999);
    // Original save data should be unaffected
    expect(data.chunkDeltas['1,4'].gems).not.toContain(999);
  });
});

// ── Full round-trip: snapshot → JSON → restore ────────────────────────

describe('save/load round-trip', () => {
  it('preserves all state through snapshot → JSON → restore', () => {
    // 1. Snapshot
    const saveData = snapshotGameState(
      GAME_STORE,
      QUEST_STORE,
      INVENTORY,
      'Round-trip Test',
      5400,
    );

    // 2. Simulate persistence (serialize → deserialize)
    const json = JSON.stringify(saveData);
    const loadedData: SaveData = JSON.parse(json);

    // 3. Restore into mock target
    const { target, calls } = createMockTarget();
    restoreGameState(loadedData, target);

    // 4. Verify everything came through
    // Player position
    const startCall = calls.startGame[0] as {
      seed: string;
      pos: { x: number; y: number; z: number };
      yaw: number;
    };
    expect(startCall.seed).toBe(GAME_STORE.seedPhrase);
    expect(startCall.pos.x).toBeCloseTo(GAME_STORE.playerPosition.x);
    expect(startCall.pos.y).toBeCloseTo(GAME_STORE.playerPosition.y);
    expect(startCall.pos.z).toBeCloseTo(GAME_STORE.playerPosition.z);
    expect(startCall.yaw).toBeCloseTo(GAME_STORE.cameraYaw);

    // Vitals
    const merged = calls.mergeGameState[0] as Record<string, unknown>;
    expect(merged.health).toBe(GAME_STORE.health);
    expect(merged.stamina).toBe(GAME_STORE.stamina);
    expect(merged.timeOfDay).toBe(GAME_STORE.timeOfDay);
    expect(merged.gemsCollected).toBe(GAME_STORE.gemsCollected);

    // Chunk deltas
    const restoredDeltas = merged.chunkDeltas as Record<
      string,
      { gems: number[] }
    >;
    expect(restoredDeltas['1,4']).toEqual(GAME_STORE.chunkDeltas['1,4']);
    expect(restoredDeltas['2,3']).toEqual(GAME_STORE.chunkDeltas['2,3']);

    // Quests with step progress
    const questCall = calls.restoreQuests[0] as {
      activeQuests: Array<{
        questId: string;
        currentStep: number;
        branch?: string;
      }>;
      completedQuests: string[];
      triggeredQuests: string[];
    };
    expect(questCall.activeQuests).toHaveLength(2);
    expect(questCall.activeQuests[0].currentStep).toBe(2); // NOT reset to 0
    expect(questCall.completedQuests).toEqual(QUEST_STORE.completedQuests);
    expect(questCall.triggeredQuests).toEqual(QUEST_STORE.triggeredQuests);

    // Inventory
    const invCall = calls.restoreInventory[0] as {
      items: Array<{ itemId: string; quantity: number }>;
      gold: number;
      equipment: Record<string, string | null>;
    };
    expect(invCall.items).toEqual(INVENTORY.items);
    expect(invCall.gold).toBe(INVENTORY.gold);
    expect(invCall.equipment).toEqual(INVENTORY.equipment);
  });

  it('handles empty inventory and no quests', () => {
    const emptyQuestStore: QuestStoreSnapshot = {
      activeQuests: [],
      completedQuests: [],
      triggeredQuests: [],
    };
    const emptyInventory: InventorySnapshot = {
      items: [],
      gold: 0,
      equipment: {
        head: null,
        chest: null,
        legs: null,
        feet: null,
        weapon: null,
        shield: null,
        accessory: null,
      },
    };

    const saveData = snapshotGameState(
      GAME_STORE,
      emptyQuestStore,
      emptyInventory,
      'Empty State',
      0,
    );

    const json = JSON.stringify(saveData);
    const loadedData: SaveData = JSON.parse(json);

    const { target, calls } = createMockTarget();
    restoreGameState(loadedData, target);

    const questCall = calls.restoreQuests[0] as {
      activeQuests: unknown[];
      completedQuests: unknown[];
      triggeredQuests: unknown[];
    };
    expect(questCall.activeQuests).toHaveLength(0);
    expect(questCall.completedQuests).toHaveLength(0);

    const invCall = calls.restoreInventory[0] as {
      items: unknown[];
      gold: number;
    };
    expect(invCall.items).toHaveLength(0);
    expect(invCall.gold).toBe(0);
  });

  it('handles chunk deltas with no gems collected', () => {
    const noDeltas: GameStoreSnapshot = {
      ...GAME_STORE,
      chunkDeltas: {},
      gemsCollected: 0,
    };

    const saveData = snapshotGameState(
      noDeltas,
      QUEST_STORE,
      INVENTORY,
      'No Deltas',
      0,
    );

    const json = JSON.stringify(saveData);
    const loadedData: SaveData = JSON.parse(json);

    const { target, calls } = createMockTarget();
    restoreGameState(loadedData, target);

    const merged = calls.mergeGameState[0] as {
      gemsCollected: number;
      chunkDeltas: Record<string, unknown>;
    };
    expect(merged.gemsCollected).toBe(0);
    expect(Object.keys(merged.chunkDeltas)).toHaveLength(0);
  });
});
