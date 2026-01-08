import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i;
const CHUNK_RELOAD_KEY = 'lovable_chunk_reload_once';

// Erros causados por extensões de navegador (Google Translate, etc.)
const EXTENSION_ERROR_RE =
  /removeChild|insertBefore|appendChild|not a child of this node|Failed to execute '(removeChild|insertBefore|appendChild)' on 'Node'/i;

const getErrorMessage = (err: unknown): string | null => {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  return (err as any)?.message ?? null;
};

const isExtensionError = (message: string | null): boolean => {
  return message ? EXTENSION_ERROR_RE.test(message) : false;
};

const maybeReloadForChunkError = (err: unknown) => {
  const message = getErrorMessage(err);

  if (!message || !CHUNK_ERROR_RE.test(message)) return;

  // evita loop infinito de reload
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');

  window.location.reload();
};

window.addEventListener('error', (event) => {
  const e = event as ErrorEvent;
  const message = getErrorMessage(e.error ?? e.message);
  
  // Suprimir erros causados por extensões de navegador
  if (isExtensionError(message)) {
    e.preventDefault();
    console.warn('[Lovable] Erro de extensão suprimido:', message);
    return;
  }
  
  maybeReloadForChunkError(e.error ?? e.message);
});

window.addEventListener('unhandledrejection', (event) => {
  const e = event as PromiseRejectionEvent;
  const message = getErrorMessage(e.reason);
  
  // Suprimir erros causados por extensões de navegador
  if (isExtensionError(message)) {
    e.preventDefault();
    console.warn('[Lovable] Erro de extensão suprimido:', message);
    return;
  }
  
  maybeReloadForChunkError(e.reason);
});

createRoot(document.getElementById('root')!).render(<App />);

