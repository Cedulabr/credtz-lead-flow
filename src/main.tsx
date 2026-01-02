import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i;
const CHUNK_RELOAD_KEY = 'lovable_chunk_reload_once';

const maybeReloadForChunkError = (err: unknown) => {
  const message =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : (err as any)?.message;

  if (!message || !CHUNK_ERROR_RE.test(message)) return;

  // evita loop infinito de reload
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');

  window.location.reload();
};

window.addEventListener('error', (event) => {
  const e = event as ErrorEvent;
  maybeReloadForChunkError(e.error ?? e.message);
});

window.addEventListener('unhandledrejection', (event) => {
  const e = event as PromiseRejectionEvent;
  maybeReloadForChunkError(e.reason);
});

createRoot(document.getElementById('root')!).render(<App />);

