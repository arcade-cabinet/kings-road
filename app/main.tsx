import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@/index.css';

// Dev-only playtesting console: window.__DEV__
if (import.meta.env.DEV) {
  import('@/utils/devConsole').then(({ initDevConsole }) =>
    initDevConsole(),
  );
}

/**
 * Global error handlers — catch anything that escapes React error boundaries.
 * Renders a standalone error overlay into a dedicated DOM node so errors
 * are ALWAYS visible, never swallowed.
 */
function showGlobalError(error: Error | string, source: string) {
  console.error(`[GlobalError:${source}]`, error);

  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // If there's already an error overlay, don't stack them
  if (document.getElementById('global-error-overlay')) return;

  const container = document.createElement('div');
  container.id = 'global-error-overlay';
  document.body.appendChild(container);

  // Lazy import to avoid circular deps — this is a crash handler
  import('./ui/ErrorOverlay').then(({ ErrorOverlay }) => {
    ReactDOM.createRoot(container).render(
      <ErrorOverlay error={errorObj} source={source} />,
    );
  });
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
