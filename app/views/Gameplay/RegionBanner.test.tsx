import {
  act,
  render as rtlRender,
  type RenderOptions,
  screen,
} from '@testing-library/react';
import { WorldProvider } from 'koota/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { gameWorld } from '@/ecs/world';
import { unsafe_resetSessionEntity } from '@/ecs/world';
import { setGameActive, setPlayerPosition, setRegionCrossing } from '@/ecs/actions/game';
import { RegionBanner } from './RegionBanner';

function KootaWrapper({ children }: { children: ReactNode }) {
  return <WorldProvider world={gameWorld}>{children}</WorldProvider>;
}

function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: KootaWrapper, ...options });
}

const ASHFORD: Parameters<typeof setRegionCrossing>[0] = {
  regionId: 'ashford-meadows',
  regionName: 'Ashford Meadows',
  crossingDistance: 100,
};

const MILLBROOK: Parameters<typeof setRegionCrossing>[0] = {
  regionId: 'millbrook-forests',
  regionName: 'Millbrook Forests',
  crossingDistance: 6200,
};

describe('RegionBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    unsafe_resetSessionEntity();
    setGameActive(true);
    setPlayerPosition(new THREE.Vector3(100, 1.8, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no crossing is set', () => {
    render(<RegionBanner />);
    expect(screen.queryByText('Ashford Meadows')).toBeNull();
    expect(screen.queryByText(/entering/i)).toBeNull();
  });

  it('shows region name when crossing trait is set', () => {
    render(<RegionBanner />);

    act(() => {
      setRegionCrossing(ASHFORD);
    });

    expect(screen.getByText('Ashford Meadows')).toBeTruthy();
    expect(screen.getByText(/entering/i)).toBeTruthy();
  });

  it('auto-dismisses after BANNER_DISPLAY_MS (2000ms) + FADE_OUT_MS (700ms)', () => {
    render(<RegionBanner />);

    act(() => {
      setRegionCrossing(ASHFORD);
    });
    expect(screen.getByText('Ashford Meadows')).toBeTruthy();

    // After 2000ms the dismiss timer fires and the fade begins.
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // After another 700ms the fade-out timer removes the element.
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.queryByText('Ashford Meadows')).toBeNull();
  });

  it('replaces the banner when a second crossing fires before dismiss', () => {
    render(<RegionBanner />);

    act(() => {
      setRegionCrossing(ASHFORD);
    });
    expect(screen.getByText('Ashford Meadows')).toBeTruthy();

    // Cross into a different region before the first banner dismissed.
    act(() => {
      setRegionCrossing(MILLBROOK);
    });

    expect(screen.getByText('Millbrook Forests')).toBeTruthy();
    expect(screen.queryByText('Ashford Meadows')).toBeNull();
  });

  it('does not show a banner when gameActive is false', () => {
    act(() => {
      setGameActive(false);
    });
    render(<RegionBanner />);

    act(() => {
      setRegionCrossing(ASHFORD);
    });

    expect(screen.queryByText('Ashford Meadows')).toBeNull();
  });

  it('dismisses based on distance when player moves 20m past the threshold', () => {
    render(<RegionBanner />);

    act(() => {
      setRegionCrossing(ASHFORD); // crossingDistance = 100
    });
    expect(screen.getByText('Ashford Meadows')).toBeTruthy();

    // Move player 21m past crossing point — distance check should dismiss.
    act(() => {
      setPlayerPosition(new THREE.Vector3(121, 1.8, 0));
    });

    // Advance 250ms for the distance-poll interval to fire.
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Fade begins; advance past the 700ms fade timer.
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.queryByText('Ashford Meadows')).toBeNull();
  });

  it('hides immediately when game resets (gameActive → false)', () => {
    render(<RegionBanner />);

    act(() => {
      setRegionCrossing(ASHFORD);
    });
    expect(screen.getByText('Ashford Meadows')).toBeTruthy();

    act(() => {
      setGameActive(false);
    });

    expect(screen.queryByText('Ashford Meadows')).toBeNull();
  });
});
