import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { safeSessionStorage } from './safeStorage';

const CHUNK_RELOAD_KEY = 'memokard-chunk-reload-attempted';

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(message);
}

async function refreshAppShell(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      // A normal reload is still useful when service worker update is unavailable.
    }
  }

  window.location.reload();
}

/** Reload once when a deployment invalidates a lazy-loaded chunk. */
// React.lazy itself uses ComponentType<any>; preserving that constraint keeps each page's props inferred.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  chunkName: string,
): LazyExoticComponent<T> {
  const reloadKey = `${CHUNK_RELOAD_KEY}:${chunkName}`;
  let retriedWithoutStorage = false;

  return lazy(async () => {
    try {
      const module = await importer();
      safeSessionStorage.remove(reloadKey);
      retriedWithoutStorage = false;
      return module;
    } catch (error) {
      const storedRetry = safeSessionStorage.get(reloadKey) === 'true';
      if (isChunkLoadError(error) && !storedRetry && !retriedWithoutStorage) {
        retriedWithoutStorage = !safeSessionStorage.set(reloadKey, 'true');
        await refreshAppShell();
        return new Promise<never>(() => undefined);
      }

      throw error;
    }
  });
}
