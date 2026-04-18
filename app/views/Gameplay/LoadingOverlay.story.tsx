/**
 * Story wrappers for LoadingOverlay -- used by Playwright CT.
 *
 * LoadingOverlay reads isGenerating/generationProgress/generationPhase from
 * useWorldStore, and gameActive/activeChunks/seedPhrase from useGameStore.
 * It shows when isGenerating=true and fades out once chunks are loaded.
 */
import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';
import { LoadingOverlay } from './LoadingOverlay';

/**
 * Shows the loading overlay in its active generation state.
 * isGenerating=true => stays visible.
 */
export function LoadingOverlayVisible() {
  useEffect(() => {
    useGameStore.setState({
      gameActive: false,
      seedPhrase: 'Golden Verdant Meadow',
      activeChunks: new Map(),
    });
    useWorldStore.setState({
      isGenerating: true,
      generationProgress: 0.4,
      generationPhase: 'Shaping the terrain...',
    });
  }, []);

  return <LoadingOverlay />;
}

/**
 * Loading overlay when not generating -- should not render.
 */
export function LoadingOverlayHidden() {
  useEffect(() => {
    useGameStore.setState({
      gameActive: false,
      activeChunks: new Map(),
    });
    useWorldStore.setState({
      isGenerating: false,
      generationProgress: 0,
      generationPhase: '',
    });
  }, []);

  return (
    <div data-testid="loading-hidden-wrapper">
      <LoadingOverlay />
    </div>
  );
}
