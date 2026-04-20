import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the SQL layer. `listSaveSlots` iterates whatever rows we hand back
// from `sqlQuery`; `loadFromSlot` does a single-row lookup. We don't touch
// IndexedDB / better-sqlite3 at all — tests run in happy-dom.
const sqlQueryMock = vi.fn();
const sqlRunMock = vi.fn();
vi.mock('./save-db', () => ({
  sqlQuery: (...args: unknown[]) => sqlQueryMock(...args),
  sqlRun: (...args: unknown[]) => sqlRunMock(...args),
}));

import { listSaveSlots, loadFromSlot } from './save-service';

const VALID_PAYLOAD = JSON.stringify({
  seedPhrase: 'Seed',
  displayName: 'Seed',
  savedAt: '2026-04-20T00:00:00.000Z',
  playTimeSeconds: 100,
  player: {
    position: { x: 0, y: 0, z: 0 },
    cameraYaw: 0,
    health: 100,
    stamina: 100,
    level: 3,
    xp: 0,
    timeOfDay: 0.5,
    gemsCollected: 0,
  },
  inventory: { items: [], gold: 0, equipment: {} },
  quests: { activeQuests: [], completedQuests: [], triggeredQuests: [] },
  chunkDeltas: {},
  unlockedPerks: [],
});

describe('listSaveSlots resilience', () => {
  beforeEach(() => {
    sqlQueryMock.mockReset();
    sqlRunMock.mockReset();
  });

  it('returns a summary for each well-formed slot', async () => {
    sqlQueryMock.mockResolvedValue([
      { slotId: 1, payload: VALID_PAYLOAD },
      { slotId: 2, payload: VALID_PAYLOAD },
    ]);
    const summaries = await listSaveSlots();
    expect(summaries).toHaveLength(2);
    expect(summaries.map((s) => s.slotId).sort()).toEqual([1, 2]);
  });

  it('skips a corrupt slot instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sqlQueryMock.mockResolvedValue([
      { slotId: 1, payload: VALID_PAYLOAD },
      { slotId: 2, payload: 'this is not JSON' },
      { slotId: 3, payload: VALID_PAYLOAD },
    ]);
    const summaries = await listSaveSlots();
    expect(summaries.map((s) => s.slotId)).toEqual([1, 3]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('still throws when the user explicitly loads a corrupt slot', async () => {
    sqlQueryMock.mockResolvedValue([
      { slotId: 2, payload: 'this is not JSON' },
    ]);
    await expect(loadFromSlot(2)).rejects.toThrow(
      /Save slot 2 payload is corrupt/,
    );
  });
});
