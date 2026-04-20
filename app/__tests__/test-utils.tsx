/**
 * Shared helpers for browser-mode tests.
 *
 * Any component that reads from Koota (useFlags, useWorldSession, etc.)
 * must be mounted inside a <WorldProvider>. Render bare and it throws
 * "Koota: useWorld must be used within a WorldProvider" — exactly how
 * the pre-existing browser tests silently failed on CI before 2026-04-19.
 */
import { WorldProvider } from 'koota/react';
import type { ReactNode } from 'react';
import { gameWorld } from '@/ecs/world';

export function KootaProvider({ children }: { children: ReactNode }) {
  return <WorldProvider world={gameWorld}>{children}</WorldProvider>;
}
