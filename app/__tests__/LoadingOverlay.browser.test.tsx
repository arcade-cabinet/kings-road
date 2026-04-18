import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { LoadingOverlay } from '@app/views/Gameplay/LoadingOverlay';
import { useGameStore } from '@/stores/gameStore';
import { useWorldSession } from '@/ecs/hooks/useWorldSession';
import {
  clearWorld,
  generateWorld,
  getFeaturesAt,
  getTileAtGrid,
  getTileAtWorld,
  getWorldState,
  setWorldState,
} from '@/ecs/actions/world';

test('LoadingOverlay renders when game is active and generating', async () => {
  useGameStore.setState({
    gameActive: true,
    seedPhrase: 'Golden Verdant Meadow',
    activeChunks: new Map(),
  });
  setWorldState({
    isGenerating: true,
    generationProgress: 0.3,
    generationPhase: 'Shaping the terrain...',
  });
  const screen = await render(<LoadingOverlay />);
  await expect.element(screen.getByText(/Preparing/i)).toBeInTheDocument();
});
