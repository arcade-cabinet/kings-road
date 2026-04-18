import { render } from 'vitest-browser-react';
import { beforeEach, expect, test } from 'vitest';
import { LoadingOverlay } from '@app/views/Gameplay/LoadingOverlay';
import { setGameActive, setSeedPhrase } from '@/ecs/actions/game';
import { setWorldState } from '@/ecs/actions/world';
import { unsafe_resetSessionEntity } from '@/ecs/world';

beforeEach(() => {
  unsafe_resetSessionEntity();
});

test('LoadingOverlay renders when game is active and generating', async () => {
  setGameActive(true);
  setSeedPhrase('Golden Verdant Meadow');
  setWorldState({
    isGenerating: true,
    generationProgress: 0.3,
    generationPhase: 'Shaping the terrain...',
  });
  const screen = await render(<LoadingOverlay />);
  await expect.element(screen.getByText(/Preparing/i)).toBeInTheDocument();
});
