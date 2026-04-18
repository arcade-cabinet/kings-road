import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadContentDb } from '@/db/load-content-db';
import {
  getMostRecentSave,
  restoreGameState,
} from '@/db/save-service';
import {
  type ActiveDungeon,
  generateSeedPhrase,
  useGameStore,
} from '@/stores/gameStore';
import { syncInventory } from '@/ecs/actions/inventory-ui';
import {
  resolveNarrative,
  restoreQuests,
} from '@/ecs/actions/quest';
import { useWorldStore } from '@/stores/worldStore';
import { CHUNK_SIZE, PLAYER_HEIGHT } from '@/utils/worldCoords';
import { generateDungeonLayout } from '@/world/dungeon-generator';
import { getDungeonById } from '@/world/dungeon-registry';

/**
 * CSS fade-out duration for the menu. Must stay in sync with the Tailwind
 * `duration-700` class applied to the menu container.
 */
const FADE_OUT_MS = 700;

export interface MenuOrchestratorState {
  fadeOut: boolean;
  loadingContinue: boolean;
  bootError: string | null;
  inFlight: boolean;
}

export interface MenuOrchestratorActions {
  continueFromSave: () => Promise<void>;
  beginNewPilgrimage: (seed: string | null) => Promise<void>;
  reseed: () => string;
}

export function useMenuOrchestrator(): MenuOrchestratorState &
  MenuOrchestratorActions {
  const setSeedPhrase = useGameStore((s) => s.setSeedPhrase);
  const startGame = useGameStore((s) => s.startGame);

  const [fadeOut, setFadeOut] = useState(false);
  const [loadingContinue, setLoadingContinue] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reseed = useCallback(() => {
    const s = generateSeedPhrase();
    setSeedPhrase(s);
    return s;
  }, [setSeedPhrase]);

  const continueFromSave = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBootError(null);
    setLoadingContinue(true);
    try {
      const data = await getMostRecentSave();
      if (!data) {
        setLoadingContinue(false);
        inFlightRef.current = false;
        return;
      }

      setFadeOut(true);
      await wait(FADE_OUT_MS);

      useWorldStore.setState({
        isGenerating: true,
        generationProgress: 0,
        generationPhase: 'Loading the scrolls of knowledge...',
      });
      await loadContentDb();
      await useWorldStore.getState().generateWorld(data.seedPhrase);
      resolveNarrative(data.seedPhrase);

      restoreGameState(data, {
        startGame: (seed, pos, yaw) => {
          startGame(seed, new THREE.Vector3(pos.x, pos.y, pos.z), yaw);
        },
        mergeGameState: (partial) => useGameStore.setState(partial),
        restoreInventory: (items, gold, equipment) => {
          syncInventory(items, 20, gold, equipment);
        },
        restoreQuests: (a, c, t) => {
          restoreQuests(a, c, t);
        },
        restoreDungeon: (dungeon) => {
          const layout = getDungeonById(dungeon.id);
          if (!layout) return;
          const spatial = generateDungeonLayout(layout);
          const active: ActiveDungeon = {
            id: dungeon.id,
            name: layout.name,
            spatial,
            currentRoomIndex: dungeon.currentRoomIndex,
            overworldPosition: new THREE.Vector3(
              dungeon.overworldPosition.x,
              dungeon.overworldPosition.y,
              dungeon.overworldPosition.z,
            ),
            overworldYaw: dungeon.overworldYaw,
          };
          useGameStore.getState().enterDungeon(active);
        },
      });
    } catch (err) {
      console.error('[MainMenu] continueFromSave failed:', err);
      setBootError(errorMessage(err));
      setFadeOut(false);
      setLoadingContinue(false);
      useWorldStore.setState({ isGenerating: false });
    } finally {
      inFlightRef.current = false;
    }
  }, [startGame]);

  const beginNewPilgrimage = useCallback(
    async (seed: string | null) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setBootError(null);
      try {
        // Treat null, undefined, and whitespace-only as missing.
        const trimmed = seed?.trim() ?? '';
        const currentSeed = trimmed || generateSeedPhrase();
        if (currentSeed !== seed) setSeedPhrase(currentSeed);

        setFadeOut(true);
        await wait(FADE_OUT_MS);

        useWorldStore.setState({
          isGenerating: true,
          generationProgress: 0,
          generationPhase: 'Loading the scrolls of knowledge...',
        });
        await loadContentDb();

        const generateWorld = useWorldStore.getState().generateWorld;
        const kingdomMap = await generateWorld(currentSeed);
        resolveNarrative(currentSeed);

        const ashford = kingdomMap.settlements.find((s) => s.id === 'ashford');
        const spawnGridX =
          ashford?.position[0] ?? Math.floor(kingdomMap.width / 2);
        const spawnGridY =
          ashford?.position[1] ?? Math.floor(kingdomMap.height / 2);

        const spawnPos = new THREE.Vector3(
          spawnGridX * CHUNK_SIZE + CHUNK_SIZE / 2,
          PLAYER_HEIGHT,
          spawnGridY * CHUNK_SIZE + CHUNK_SIZE / 2,
        );

        startGame(currentSeed, spawnPos, Math.PI);
      } catch (err) {
        console.error('[MainMenu] beginNewPilgrimage failed:', err);
        setBootError(errorMessage(err));
        setFadeOut(false);
        useWorldStore.setState({ isGenerating: false });
      } finally {
        inFlightRef.current = false;
      }
    },
    [setSeedPhrase, startGame],
  );

  return {
    fadeOut,
    loadingContinue,
    bootError,
    inFlight: inFlightRef.current,
    continueFromSave,
    beginNewPilgrimage,
    reseed,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
