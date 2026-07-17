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
import { installChunkErrorReload, clearAllCache, reloadPage } from '@credo/base-ui/utils';
import { appApiGroup, appCredoStorageHash } from './config/env';

// Recover from stale-chunk 404s after a deploy (see @credo/base-ui chunk-error).
// Registered before the first lazy import so it can catch App's own chunk.
installChunkErrorReload();

const App = lazy(() => import('./App'));

const rootElement = document.querySelector('#root');
if (!rootElement) {
  throw new Error('Root element not found');
}

setCredoGroup(appApiGroup);

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

if (appCredoStorageHash) {
  const CREDO_STORAGE_HASH_KEY = '151f93916';
  const currentHash = localStorage.getItem(CREDO_STORAGE_HASH_KEY);
  if (currentHash !== appCredoStorageHash) {
    clearAllCache().then(() => {
      localStorage.setItem(CREDO_STORAGE_HASH_KEY, appCredoStorageHash);
      reloadPage('force clear cache');
    });
  }
}
