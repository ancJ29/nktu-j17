import './utils/debug-only';
import './utils/local-only';

import { lazy, StrictMode, Suspense } from 'react';
import './i18n';
import './index.css';
import '@credo/base-ui/styles.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';
import { setCredoGroup } from '@credo/connectors/connector';
import { installChunkErrorReload } from '@credo/base-ui/utils';
import { appApiGroup, appCredoStorageHash } from './config/env';
import { forceClearCache } from './utils/forceClearCache';
import { isLocalhost } from '@/config/env';

// Recover from stale-chunk 404s after a deploy (see @credo/base-ui chunk-error).
// Registered before the first lazy import so it can catch App's own chunk.
installChunkErrorReload();

const App = lazy(() => import('./App'));

const rootElement = document.querySelector('#root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Storage-hash migration: a build can declare that any cache older than its
// hash must go. This runs BEFORE `setCredoGroup` on purpose — `setCredoGroup`
// schedules its own reload 100ms out, which used to fire mid-wipe, before the
// marker below was written. The marker never landed, so the next boot wiped
// again, and again: a permanent reload loop that also re-deleted the client
// code and group on every pass. `forceClearCache` restores those and writes the
// marker before its own reload, so the wipe happens exactly once.
const CREDO_STORAGE_HASH_KEY = '151f93916';
const storageHashStale =
  !!appCredoStorageHash && localStorage.getItem(CREDO_STORAGE_HASH_KEY) !== appCredoStorageHash;

if (storageHashStale) {
  if (isLocalhost) {
    alert('Storage hash stale, clearing cache and reloading...');
  }
  void forceClearCache('storage hash change', () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(CREDO_STORAGE_HASH_KEY, appCredoStorageHash);
    setCredoGroup(appApiGroup);
    return;
  });
} else {
  setCredoGroup(appApiGroup);
}

// TODO: remove this later
const redirectConfigs: Record<string, string> = {
  // 'try-credo.internal.cr3do.dev': 'https://use-credo.cr3do.dev/',
  'nktu-j17.vercel.app': 'https://nktu.cr3do.dev/',
  'nktu-j12.vercel.app': 'https://nktu.cr3do.dev/',
};

if (redirectConfigs[window.location.host]) {
  window.location.href = redirectConfigs[window.location.host];
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <MantineProvider theme={theme} forceColorScheme="light">
        <Notifications position="bottom-right" autoClose={10_000} limit={5} />
        <Suspense>
          <App />
        </Suspense>
      </MantineProvider>
    </StrictMode>,
  );
}
