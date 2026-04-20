import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/lib/configure-gltf';
import App from './App.tsx';
import { hasReportedError } from './runtime-error-bus';
import { ErrorOverlay } from './views/ErrorOverlay';
import '@/index.css';

// Dev-only playtesting console: window.__DEV__
if (import.meta.env.DEV) {
  import('@/utils/devConsole').then(({ initDevConsole }) =>
    initDevConsole(),
  );
}

/**
 * Crash-level global error fallback — renders a standalone error overlay
 * into a dedicated DOM node outside the React root so errors are ALWAYS
 * visible even if React itself is wedged.
 *
 * App.tsx registers its own `window.error` / `unhandledrejection` listeners
 * earlier in module-eval order (imported from this file at line 4), so they
 * fire first and latch the runtime-error-bus. This fallback skips when the
 * bus already has an error — the App-level `<ErrorOverlay>` inside the React
 * tree handles it with richer styling. This fallback only kicks in when the
 * App-level listener couldn't latch (bus module failed to load, React root
 * never mounted, etc.).
 */
function showGlobalError(error: Error | string, source: string) {
  console.error(`[GlobalError:${source}]`, error);

  // App.tsx's listener ran first and the runtime-error-bus has latched —
  // the App-level ErrorOverlay will render inside the React tree.
  if (hasReportedError()) return;

  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // Still guard against multiple DOM overlays from repeated throws in the
  // same tick while the React tree is actually down.
  if (document.getElementById('global-error-overlay')) return;

  const container = document.createElement('div');
  container.id = 'global-error-overlay';
  document.body.appendChild(container);

  // ErrorOverlay is statically imported above — App.tsx and ErrorBoundary
  // already pull it into the main bundle, so a dynamic import here doesn't
  // save bytes (Vite even warns about it: "dynamic import will not move
  // module into another chunk"). Using the static import keeps the crash
  // path synchronous so there's no window where the error fires and the
  // overlay is still resolving its import.
  ReactDOM.createRoot(container).render(
    <ErrorOverlay error={errorObj} source={source} />,
  );
}

window.addEventListener('error', (event) => {
  showGlobalError(
    event.error instanceof Error ? event.error : new Error(event.message),
    'window.onerror',
  );
});

window.addEventListener('unhandledrejection', (event) => {
  const error =
    event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
  showGlobalError(error, 'unhandledrejection');
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
