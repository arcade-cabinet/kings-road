/**
 * Story wrappers for MainMenu — used by Playwright CT.
 *
 * MainMenu reads from useGameStore. We pre-set state in the browser
 * via the wrapper so the component renders without needing a real game.
 */
import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { MainMenu } from './MainMenu';

/**
 * Renders MainMenu with gameActive=false and a fixed seed.
 * The seed is deterministic so screenshots are stable.
 */
export function MainMenuDefault() {
  useEffect(() => {
    useGameStore.setState({
      gameActive: false,
      seedPhrase: 'Golden Verdant Meadow',
    });
  }, []);

  return <MainMenu />;
}

/**
 * Renders MainMenu with gameActive=true — should return null.
 */
export function MainMenuHidden() {
  useEffect(() => {
    useGameStore.setState({ gameActive: true });
  }, []);

  return (
    <div data-testid="main-menu-hidden-wrapper">
      <MainMenu />
    </div>
  );
}
