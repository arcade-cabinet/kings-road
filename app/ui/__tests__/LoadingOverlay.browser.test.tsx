import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { LoadingOverlay } from '../LoadingOverlay';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';

test('LoadingOverlay renders when game is active and generating', async () => {
  useGameStore.setState({
    gameActive: true,
    seedPhrase: 'Golden Verdant Meadow',
    activeChunks: new Map(),
  });
  useWorldStore.setState({
    isGenerating: true,
    generationProgress: 0.3,
    generationPhase: 'Shaping the terrain...',
  });
  const screen = await render(<LoadingOverlay />);
  await expect.element(screen.getByText(/Preparing/i)).toBeInTheDocument();
});
