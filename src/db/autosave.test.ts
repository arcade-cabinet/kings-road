import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks so the modules under test import these.
const saveToSlotMock = vi.fn().mockResolvedValue(undefined);
const getGameSnapshotMock = vi.fn();
const getPlayTimeSecondsMock = vi.fn(() => 0);
const getInventorySnapshotMock = vi.fn();
const getQuestStateMock = vi.fn();

vi.mock('./save-service', async () => {
  const actual =
    await vi.importActual<typeof import('./save-service')>('./save-service');
  return {
    ...actual,
    saveToSlot: (slot: number, data: unknown) => saveToSlotMock(slot, data),
  };
});

vi.mock('@/ecs/actions/game', () => ({
  getGameSnapshot: () => getGameSnapshotMock(),
  getPlayTimeSeconds: () => getPlayTimeSecondsMock(),
}));

vi.mock('@/ecs/actions/inventory-ui', () => ({
  getInventorySnapshot: () => getInventorySnapshotMock(),
}));

vi.mock('@/ecs/actions/quest', () => ({
  getQuestState: () => getQuestStateMock(),
}));

import {
  AUTO_SAVE_SLOT,
  cancelPendingAutoSave,
  flushAutoSave,
  scheduleAutoSave,
  suppressAutoSave,
} from './autosave';

function setupActiveGame() {
  getGameSnapshotMock.mockReturnValue({
    seedPhrase: 'Seed Phrase Test',
    playerPosition: new THREE.Vector3(1, 2, 3),
    cameraYaw: 0,
    health: 100,
    stamina: 100,
    timeOfDay: 0.5,
    gemsCollected: 0,
    chunkDeltas: {},
    inDungeon: false,
    activeDungeon: null,
  });
  getPlayTimeSecondsMock.mockReturnValue(42);
  getInventorySnapshotMock.mockReturnValue({
    items: [],
    gold: 0,
    equipped: {},
  });
  getQuestStateMock.mockReturnValue({
    activeQuests: [{ questId: 'q1', currentStep: 1 }],
    completedQuests: ['q0'],
    triggeredQuests: ['q0', 'q1'],
  });
}

describe('autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveToSlotMock.mockClear();
    cancelPendingAutoSave();
  });

  it('does not write when the game has not started (seedPhrase empty)', async () => {
    getGameSnapshotMock.mockReturnValue({
      seedPhrase: '',
      playerPosition: new THREE.Vector3(),
      cameraYaw: 0,
      health: 0,
      stamina: 0,
      timeOfDay: 0,
      gemsCollected: 0,
      chunkDeltas: {},
      inDungeon: false,
      activeDungeon: null,
    });
    await flushAutoSave();
    expect(saveToSlotMock).not.toHaveBeenCalled();
  });

  it('flushAutoSave writes current state to AUTO_SAVE_SLOT', async () => {
    setupActiveGame();
    await flushAutoSave();
    expect(saveToSlotMock).toHaveBeenCalledTimes(1);
    const [slot, data] = saveToSlotMock.mock.calls[0];
    expect(slot).toBe(AUTO_SAVE_SLOT);
    expect(data).toMatchObject({
      seedPhrase: 'Seed Phrase Test',
      quests: {
        activeQuests: [{ questId: 'q1', currentStep: 1 }],
        completedQuests: ['q0'],
      },
    });
  });

  it('debounces back-to-back schedules into a single write', async () => {
    setupActiveGame();
    scheduleAutoSave();
    scheduleAutoSave();
    scheduleAutoSave();
    expect(saveToSlotMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(saveToSlotMock).toHaveBeenCalledTimes(1);
  });

  it('suppressAutoSave blocks scheduled + direct writes inside the block', async () => {
    setupActiveGame();
    suppressAutoSave(() => {
      scheduleAutoSave();
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(saveToSlotMock).not.toHaveBeenCalled();
    await flushAutoSave();
    expect(saveToSlotMock).toHaveBeenCalledTimes(1);
  });
});
