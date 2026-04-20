import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveData } from './save-service';

// Mock save-service so the tests don't touch the SQL layer.
const saveToSlotMock = vi.fn().mockResolvedValue(undefined);
vi.mock('./save-service', async () => {
  const actual =
    await vi.importActual<typeof import('./save-service')>('./save-service');
  return {
    ...actual,
    saveToSlot: (slot: number, data: SaveData) => saveToSlotMock(slot, data),
  };
});

import {
  AUTO_SAVE_SLOT,
  cancelPendingAutoSave,
  flushAutoSave,
  registerAutoSaveProvider,
  resetAutoSaveThrottle,
  scheduleAutoSave,
  scheduleAutoSaveThrottled,
  suppressAutoSave,
} from './autosave';

function makeSaveData(overrides: Partial<SaveData> = {}): SaveData {
  return {
    seedPhrase: 'Seed Phrase Test',
    displayName: 'Seed Phrase Test',
    savedAt: '2026-04-20T00:00:00.000Z',
    playTimeSeconds: 42,
    player: {
      position: { x: 1, y: 2, z: 3 },
      cameraYaw: 0,
      health: 100,
      stamina: 100,
      level: 1,
      xp: 0,
      timeOfDay: 0.5,
      gemsCollected: 0,
    },
    inventory: {
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
    },
    quests: {
      activeQuests: [{ questId: 'q1', currentStep: 1 }],
      completedQuests: ['q0'],
      triggeredQuests: ['q0', 'q1'],
    },
    chunkDeltas: {},
    unlockedPerks: [],
    ...overrides,
  };
}

describe('autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveToSlotMock.mockClear();
    cancelPendingAutoSave();
    resetAutoSaveThrottle();
    registerAutoSaveProvider(null);
  });

  it('does not write when no provider is registered', async () => {
    await flushAutoSave();
    expect(saveToSlotMock).not.toHaveBeenCalled();
  });

  it('does not write when the provider returns null (game not ready)', async () => {
    registerAutoSaveProvider(() => null);
    await flushAutoSave();
    expect(saveToSlotMock).not.toHaveBeenCalled();
  });

  it('flushAutoSave writes provider output to AUTO_SAVE_SLOT', async () => {
    const data = makeSaveData();
    registerAutoSaveProvider(() => data);
    await flushAutoSave();
    expect(saveToSlotMock).toHaveBeenCalledTimes(1);
    expect(saveToSlotMock).toHaveBeenCalledWith(AUTO_SAVE_SLOT, data);
  });

  it('debounces back-to-back schedules into a single write', async () => {
    registerAutoSaveProvider(() => makeSaveData());
    scheduleAutoSave();
    scheduleAutoSave();
    scheduleAutoSave();
    expect(saveToSlotMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(saveToSlotMock).toHaveBeenCalledTimes(1);
  });

  it('suppressAutoSave blocks scheduled + direct writes inside the block', async () => {
    registerAutoSaveProvider(() => makeSaveData());
    suppressAutoSave(() => {
      scheduleAutoSave();
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(saveToSlotMock).not.toHaveBeenCalled();
    await flushAutoSave();
    expect(saveToSlotMock).toHaveBeenCalledTimes(1);
  });

  it('suppression is re-entrant (nested blocks compose)', async () => {
    registerAutoSaveProvider(() => makeSaveData());
    suppressAutoSave(() => {
      suppressAutoSave(() => {
        scheduleAutoSave();
      });
      // Inner block exited but outer is still suppressing — must stay blocked.
      scheduleAutoSave();
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(saveToSlotMock).not.toHaveBeenCalled();
  });

  describe('scheduleAutoSaveThrottled', () => {
    it('fires on leading edge then swallows calls inside the window', async () => {
      registerAutoSaveProvider(() => makeSaveData());
      scheduleAutoSaveThrottled('key', 1000);
      // Burst of calls inside the window — only the first should have
      // actually scheduled an underlying save.
      for (let i = 0; i < 10; i++) {
        scheduleAutoSaveThrottled('key', 1000);
      }
      await vi.advanceTimersByTimeAsync(500);
      expect(saveToSlotMock).toHaveBeenCalledTimes(1);
    });

    it('fires again once the window expires', async () => {
      registerAutoSaveProvider(() => makeSaveData());
      scheduleAutoSaveThrottled('key', 1000);
      await vi.advanceTimersByTimeAsync(500); // lets debounce flush
      expect(saveToSlotMock).toHaveBeenCalledTimes(1);

      // Still inside the throttle window — should be swallowed.
      scheduleAutoSaveThrottled('key', 1000);
      await vi.advanceTimersByTimeAsync(500);
      expect(saveToSlotMock).toHaveBeenCalledTimes(1);

      // Past the window — should fire again.
      await vi.advanceTimersByTimeAsync(600); // total 1600ms since first
      scheduleAutoSaveThrottled('key', 1000);
      await vi.advanceTimersByTimeAsync(500);
      expect(saveToSlotMock).toHaveBeenCalledTimes(2);
    });

    it('independent keys maintain independent windows', async () => {
      registerAutoSaveProvider(() => makeSaveData());
      scheduleAutoSaveThrottled('a', 1000);
      scheduleAutoSaveThrottled('b', 1000);
      // Both pass the throttle; they share the same debounce tick.
      await vi.advanceTimersByTimeAsync(500);
      // Note: they coalesce through the single debounce, so we see 1 flush.
      expect(saveToSlotMock).toHaveBeenCalledTimes(1);

      // Inside their window, both are swallowed.
      scheduleAutoSaveThrottled('a', 1000);
      scheduleAutoSaveThrottled('b', 1000);
      await vi.advanceTimersByTimeAsync(500);
      expect(saveToSlotMock).toHaveBeenCalledTimes(1);
    });

    it('respects suppression (no fire even on leading edge)', async () => {
      registerAutoSaveProvider(() => makeSaveData());
      suppressAutoSave(() => {
        scheduleAutoSaveThrottled('key', 1000);
      });
      await vi.advanceTimersByTimeAsync(500);
      expect(saveToSlotMock).not.toHaveBeenCalled();
    });
  });
});
