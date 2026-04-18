import { createWorld, type Entity } from 'koota';

export const gameWorld = createWorld();

/**
 * Lazily-spawned singleton entity for session-scoped state (menu flags,
 * chunk context, world environment, HUD flags, quest graph, combat UI).
 *
 * Phase 0 of the Zustand → Koota migration (see
 * `docs/plans/2026-04-18-koota-migration.md`). Phases 1-5 attach traits
 * to this entity. Module-scope spawning would allocate an entity at import
 * import time even in tests that never touch it; a lazy accessor avoids
 * spawning that entity until it is first needed.
 */
let sessionEntity: Entity | null = null;

export function getSessionEntity(): Entity {
  if (sessionEntity === null) {
    sessionEntity = gameWorld.spawn();
  }
  return sessionEntity;
}

/**
 * DEV-only: reset the session entity so per-test setup starts from a clean
 * slate. Production code must never call this — the session entity lives for
 * the lifetime of the world.
 */
export function unsafe_resetSessionEntity(): void {
  if (!import.meta.env.DEV) {
    console.warn(
      '[world] unsafe_resetSessionEntity called outside DEV — ignoring',
    );
    return;
  }
  if (sessionEntity !== null) {
    // Koota patches Number.prototype.destroy so entity.destroy() releases the
    // entity and all its traits back to the world. TS doesn't see the patched
    // prototype, hence the cast.
    (sessionEntity as unknown as { destroy(): void }).destroy();
    sessionEntity = null;
  }
}
