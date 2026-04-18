import {
  act,
  render as rtlRender,
  type RenderOptions,
  screen,
} from '@testing-library/react';
import { WorldProvider } from 'koota/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setWorldState } from '@/ecs/actions/world';
import {
  addChunk,
  resetGame,
  setGameActive,
  setSeedPhrase,
} from '@/ecs/actions/game';
import { gameWorld } from '@/ecs/world';
import { unsafe_resetSessionEntity } from '@/ecs/world';
import { LoadingOverlay } from './LoadingOverlay';

/** Minimal valid chunk for triggering "chunks loaded" state */
const STUB_CHUNK = {
  cx: 0,
  cz: 0,
  key: '0,0',
  type: 'WILD' as const,
  name: 'Stub',
  collidables: [],
  interactables: [],
  collectedGems: new Set<number>(),
};

function KootaWrapper({ children }: { children: ReactNode }) {
  return <WorldProvider world={gameWorld}>{children}</WorldProvider>;
}

function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: KootaWrapper, ...options });
}

describe('LoadingOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    unsafe_resetSessionEntity();
    setGameActive(true);
    setSeedPhrase('Golden Verdant Meadow');
    setWorldState({
      isGenerating: false,
      generationProgress: 0,
      generationPhase: '',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows when isGenerating becomes true', () => {
    render(<LoadingOverlay />);
    expect(screen.queryByText('Preparing the Realm')).toBeNull();

    act(() => {
      setWorldState({
        isGenerating: true,
        generationProgress: 0.1,
        generationPhase: 'Shaping the terrain...',
      });
    });

    expect(screen.getByText('Preparing the Realm')).toBeTruthy();
  });

  it('shows the seed phrase', () => {
    render(<LoadingOverlay />);

    act(() => {
      setWorldState({
        isGenerating: true,
        generationProgress: 0.1,
        generationPhase: 'Shaping the terrain...',
      });
    });

    expect(screen.getByText('Golden Verdant Meadow')).toBeTruthy();
  });

  it('shows generation phase text from worldStore', () => {
    render(<LoadingOverlay />);

    act(() => {
      setWorldState({
        isGenerating: true,
        generationProgress: 0.3,
        generationPhase: 'Shaping the terrain...',
      });
    });

    expect(screen.getByText('Shaping the terrain...')).toBeTruthy();
  });

  it('fades out and hides once chunks are loaded', () => {
    render(<LoadingOverlay />);

    // Start generation
    act(() => {
      setWorldState({
        isGenerating: true,
        generationProgress: 0.1,
        generationPhase: 'Shaping the terrain...',
      });
    });
    expect(screen.getByText('Preparing the Realm')).toBeTruthy();

    // Complete generation and start game
    act(() => {
      setWorldState({
        isGenerating: false,
        generationProgress: 1,
        generationPhase: '',
      });
      setGameActive(true);
    });

    // Simulate chunks loading after MIN_DISPLAY_MS
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    act(() => {
      addChunk(STUB_CHUNK);
    });

    // Trigger fade-out timeout
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // After fade animation (800ms), overlay should be removed from DOM
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.queryByText('Preparing the Realm')).toBeNull();
  });

  it('does NOT loop: overlay stays hidden after fade-out while gameActive is true', () => {
    render(<LoadingOverlay />);

    // Start generation
    act(() => {
      setWorldState({
        isGenerating: true,
        generationProgress: 0.1,
        generationPhase: 'Shaping the terrain...',
      });
    });
    expect(screen.getByText('Preparing the Realm')).toBeTruthy();

    // Complete generation
    act(() => {
      setWorldState({
        isGenerating: false,
        generationProgress: 1,
        generationPhase: '',
      });
      setGameActive(true);
    });

    // Load chunks and wait for MIN_DISPLAY_MS
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    act(() => {
      addChunk(STUB_CHUNK);
    });

    // Trigger fade-out + animation complete
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Overlay should be gone
    expect(screen.queryByText('Preparing the Realm')).toBeNull();

    // Wait extra time to make sure it doesn't re-appear (the loop bug)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // MUST still be hidden -- no loop
    expect(screen.queryByText('Preparing the Realm')).toBeNull();
  });

  it('can show again after game is reset and restarted', () => {
    render(<LoadingOverlay />);

    // First game session
    act(() => {
      setWorldState({
        isGenerating: true,
        generationProgress: 0.5,
        generationPhase: 'Building roads...',
      });
    });
    expect(screen.getByText('Preparing the Realm')).toBeTruthy();

    // Complete generation and load
    act(() => {
      setWorldState({
        isGenerating: false,
        generationProgress: 1,
        generationPhase: '',
      });
      setGameActive(true);
    });
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    act(() => {
      addChunk(STUB_CHUNK);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Preparing the Realm')).toBeNull();

    // Reset game (back to menu)
    act(() => {
      resetGame();
      setGameActive(false);
      setWorldState({
        isGenerating: false,
        generationProgress: 0,
        generationPhase: '',
      });
    });

    // Start second game session -- overlay should appear again
    act(() => {
      setGameActive(true);
      setWorldState({
        isGenerating: true,
        generationProgress: 0.1,
        generationPhase: 'Shaping the terrain...',
      });
    });
    expect(screen.getByText('Preparing the Realm')).toBeTruthy();
  });
});
