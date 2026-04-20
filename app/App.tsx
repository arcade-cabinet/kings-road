import { WorldProvider } from 'koota/react';
import { useEffect } from 'react';
import { BiomeConfigSchema, BiomeService, biomeConfigs } from '@/biome';
import { registerAutoSaveProvider } from '@/db/autosave';
import { snapshotGameState } from '@/db/save-service';
import { applyDebugSpawn } from '@/debug';
import { getFlags, getGameSnapshot, getPlayTimeSeconds } from '@/ecs/actions/game';
import { getInventorySnapshot } from '@/ecs/actions/inventory-ui';
import { getQuestState } from '@/ecs/actions/quest';
import { loadSettings } from '@/ecs/actions/settings';
import { gameWorld } from '@/ecs/world';
import { loadRoadSpine } from '@/world/road-spine';
import { ErrorBoundary } from './ErrorBoundary';
import { Game } from './Game';
import { reportRuntimeError, useRuntimeError } from './runtime-error-bus';
import { ErrorOverlay } from './views/ErrorOverlay';

// Initialize BiomeService synchronously at module load — before any R3F frame
// fires — so getCurrentBiome() never throws due to missing init on first render.
BiomeService.init(
  biomeConfigs.map((raw) => BiomeConfigSchema.parse(raw)),
  loadRoadSpine(),
);

// Wire the autosave snapshot provider. Returns null when the game isn't in a
// save-worthy state (menu, mid-reset, mid-load) so a pending debounced save
// fired during teardown doesn't overwrite slot 0 with a half-built snapshot.
// Keeping the provider here — instead of inside `@/db/autosave` — avoids a
// circular dep between `src/ecs/actions/quest.ts` (which calls scheduleAutoSave)
// and the snapshot getters.
registerAutoSaveProvider(() => {
  const { gameActive } = getFlags();
  if (!gameActive) return null;
  const gs = getGameSnapshot();
  if (!gs.seedPhrase) return null;
  const qs = getQuestState();
  const inv = getInventorySnapshot();
  return snapshotGameState(
    gs,
    qs,
    { items: inv.items, gold: inv.gold, equipment: inv.equipped },
    gs.seedPhrase,
    getPlayTimeSeconds(),
  );
});

// Route uncaught async errors into the visible ErrorOverlay. Without this,
// Promise rejections (HDRI loads, PBR texture loads, audio decode failures)
// vanish into the DevTools console and the scene silently degrades.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    reportRuntimeError(event.reason, 'unhandledrejection');
  });
  window.addEventListener('error', (event) => {
    reportRuntimeError(event.error ?? event.message, 'window.error');
  });
}

function App() {
  const runtimeError = useRuntimeError();

  useEffect(() => {
    void loadSettings();
    applyDebugSpawn();
  }, []);

  // Runtime errors (subsystem callbacks, async loads) surface via bus →
  // overlay. React render/commit errors surface via the ErrorBoundary below.
  if (runtimeError) {
    return (
      <ErrorOverlay
        error={runtimeError.error}
        source={runtimeError.source}
      />
    );
  }

  return (
    <ErrorBoundary source="App">
      <WorldProvider world={gameWorld}>
        <Game />
      </WorldProvider>
    </ErrorBoundary>
  );
}

export default App;
