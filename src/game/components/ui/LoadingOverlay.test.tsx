import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../stores/gameStore';
import { useWorldStore } from '../../stores/worldStore';
import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset stores to default state
    useGameStore.setState({
      gameActive: false,
      seedPhrase: 'Golden Verdant Meadow',
      activeChunks: new Map(),
    });
    useWorldStore.setState({
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
      useWorldStore.setState({
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
      useWorldStore.setState({
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
      useWorldStore.setState({
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
      useWorldStore.setState({
        isGenerating: true,
        generationProgress: 0.1,
        generationPhase: 'Shaping the terrain...',
      });
    });
    expect(screen.getByText('Preparing the Realm')).toBeTruthy();

    // Complete generation and start game
    act(() => {
      useWorldStore.setState({
        isGenerating: false,
        generationProgress: 1,
        generationPhase: '',
      });
      useGameStore.setState({ gameActive: true });
    });

    // Simulate chunks loading after MIN_DISPLAY_MS
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    act(() => {
      useGameStore.setState({
        activeChunks: new Map([['0,0', {} as never]]),
      });
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
      useWorldStore.setState({
        isGenerating: true,
        generationProgress: 0.1,
        generationPhase: 'Shaping the terrain...',
      });
    });
    expect(screen.getByText('Preparing the Realm')).toBeTruthy();

    // Complete generation
    act(() => {
      useWorldStore.setState({
        isGenerating: false,
        generationProgress: 1,
        generationPhase: '',
      });
      useGameStore.setState({ gameActive: true });
    });

    // Load chunks and wait for MIN_DISPLAY_MS
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    act(() => {
      useGameStore.setState({
        activeChunks: new Map([['0,0', {} as never]]),
      });
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
      useWorldStore.setState({
        isGenerating: true,
        generationProgress: 0.5,
        generationPhase: 'Building roads...',
      });
    });
    expect(screen.getByText('Preparing the Realm')).toBeTruthy();

    // Complete generation and load
    act(() => {
      useWorldStore.setState({
        isGenerating: false,
        generationProgress: 1,
        generationPhase: '',
      });
      useGameStore.setState({ gameActive: true });
    });
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    act(() => {
      useGameStore.setState({
        activeChunks: new Map([['0,0', {} as never]]),
      });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Preparing the Realm')).toBeNull();

    // Reset game (back to menu)
    act(() => {
      useGameStore.setState({ gameActive: false, activeChunks: new Map() });
      useWorldStore.setState({
        isGenerating: false,
        generationProgress: 0,
        generationPhase: '',
      });
    });

    // Start second game session -- overlay should appear again
    act(() => {
      useWorldStore.setState({
        isGenerating: true,
        generationProgress: 0.1,
        generationPhase: 'Shaping the terrain...',
      });
    });
    expect(screen.getByText('Preparing the Realm')).toBeTruthy();
  });
});
