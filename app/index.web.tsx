/**
 * Web entry point — renders the full game via Expo Router on web.
 *
 * Uses the same App component as the original Vite entry point.
 * CSS is imported here for Metro's CSS pipeline (Tailwind via PostCSS).
 */
import { useEffect } from 'react';
import '../src/index.css';
import App from '../src/App';

export default function WebGameScreen() {
  useEffect(() => {
    // Dev-only playtesting console
    if (__DEV__) {
      import('../src/game/utils/devConsole').then(({ initDevConsole }) =>
        initDevConsole(),
      );
    }
  }, []);

  return <App />;
}
