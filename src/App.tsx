import { lazy, Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { ErrorBoundary, LoadingFallback } from '@credo/base-ui/components';
import { usePWA } from '@credo/base-ui/hooks';

import { buildHash, buildTimestamp } from '@/config/build-version';
import { isFirstBoot } from '@/config';
import { resolveClientCode } from '@/config/client-code';
import { isInternal } from '@/config/env';
import { useClientUnconfigured } from '@/utils/bootState';
import router from './router';
import { clearChunkReloadParam, logger } from '@credo/base-ui/utils';
import { useTranslation } from 'react-i18next';
import { isLocalhost } from '@credo/kits/misc';

const PWAInstallPrompt = lazy(() =>
  import('@credo/base-ui/components').then((m) => ({ default: m.PWAInstallPrompt })),
);
const SafariPWAGuide = lazy(() =>
  import('@credo/base-ui/components').then((m) => ({ default: m.SafariPWAGuide })),
);
const DevClientCodeModal = lazy(() =>
  import('@/components/DevClientCodeModal').then((m) => ({ default: m.DevClientCodeModal })),
);
const InternalBanner = lazy(() =>
  import('@/components/InternalBanner').then((m) => ({ default: m.InternalBanner })),
);
const DebugPanel = lazy(() =>
  import('./components/DebugPanel').then((m) => ({ default: m.DebugPanel })),
);

/** Remove the HTML loading overlay once the app is ready to render. */
function dismissLoadingOverlay() {
  const el = document.getElementById('app-loading');
  if (el) el.remove();
}

const BUNDLED_BUILD = `${buildHash}_${buildTimestamp}`;

const isLocal = isLocalhost();

export default function App() {
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      logger.debug('SW registered:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const { t } = useTranslation();

  const { checkForUpdates } = usePWA({
    bundledBuild: BUNDLED_BUILD,
    sw: { offlineReady, needRefresh, updateServiceWorker },
    labels: {
      newVersionAvailable: t('pwa.newVersionAvailable'),
      closeCompletelyInstructions: t('pwa.safari.closeCompletelyInstructions'),
      updating: t('pwa.updating'),
      reloadIn3Seconds: t('pwa.reloadIn3Seconds'),
      clickToUpdate: t('pwa.clickToUpdate'),
      reloadAutomatically: t('pwa.reloadAutomatically'),
      offlineReady: t('pwa.offlineReady'),
      appAvailableOffline: t('pwa.appAvailableOffline'),
    },
  });

  // Version check on every navigation, not just on the 30-min poll / tab focus.
  // A deploy deletes the previous build's chunks, so a tab holding the old shell
  // is one click away from a dead lazy import; catching the new build at
  // route-change time reloads it *before* that click instead of recovering after
  // (`installChunkErrorReload`). `checkForUpdates` self-throttles to once per
  // 30s, so this is near-free.
  useEffect(() => router.subscribe(() => void checkForUpdates()), [checkForUpdates]);

  // The stage-2 recovery reload lands with a cache-bust param in the URL; it has
  // done its job by the time we render, so take it back out of the address bar.
  useEffect(() => clearChunkReloadParam(), []);

  // Re-renders App when the config refresh finds the resolved client has no
  // backend config, so the overlay dismissal below reacts to it.
  // cspell:word Unconfigured
  const clientUnconfigured = useClientUnconfigured();

  // On first boot (no cached config), keep the loading overlay visible —
  // refreshConfigFromBackend() will fetch, cache, and reload the page.
  // On subsequent boots, config is cached so the theme is correct — dismiss immediately.
  // Also dismiss when no usable client is resolvable, otherwise the overlay sits
  // forever on top of the BaseLayout ClientCodePrompt underneath it:
  //   - no client code resolved at all, or
  //   - a code resolved but the backend has no config for it (clientUnconfigured).
  // In both cases refreshConfigFromBackend() never triggers a reload.
  if (!isFirstBoot || !resolveClientCode() || clientUnconfigured) {
    dismissLoadingOverlay();
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback fullScreen />}>
        <RouterProvider router={router} />
      </Suspense>
      {!isLocal && (
        <>
          <PWAInstallPrompt
            labels={{
              installTitle: t('pwa.installTitle'),
              installDescription: t('pwa.installDescription'),
              maybeLater: t('pwa.maybeLater'),
              install: t('pwa.install'),
            }}
          />
          <SafariPWAGuide
            labels={{
              installTitle: t('pwa.safari.installTitle'),
              installDescription: t('pwa.safari.installDescription'),
              remindLater: t('pwa.safari.remindLater'),
              // cspell:disable-next-line
              dontShowAgain: t('pwa.safari.dontShowAgain'),
              iosStep1: t('pwa.safari.ios.step1'),
              iosStep2: t('pwa.safari.ios.step2'),
              iosStep3: t('pwa.safari.ios.step3'),
              macStep1: t('pwa.safari.mac.step1'),
              macStep2: t('pwa.safari.mac.step2'),
              macStep3: t('pwa.safari.mac.step3'),
            }}
          />
        </>
      )}

      <DevClientCodeModal />
      <DebugPanel />
      {isInternal && <InternalBanner />}
    </ErrorBoundary>
  );
}

logger.info('Build version:', BUNDLED_BUILD);
