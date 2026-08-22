import { lazy, Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { ErrorBoundary, LoadingFallback } from '@credo/base-ui/components';
import { usePWA } from '@credo/base-ui/hooks';

import { buildHash, buildTimestamp } from '@/config/build-version';
import { isFirstBoot } from '@/config';
import { isInternal } from '@/config/env';
import { useCfgReady } from '@/utils/bootState';
import { isNewVersionNotificationEnabled } from '@/utils/permission';
import { startOfflineSync } from '@/utils/offlineSync';
import router from './router';
import { clearChunkReloadParam, logger, resetReloadGuard } from '@credo/base-ui/utils';
import { useTranslation } from 'react-i18next';
import { isLocalhost } from '@/config/env';

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
    // Per-client (App Config → App Info), off by default. It gates the *notice*,
    // not the update — see `isNewVersionNotificationEnabled`.
    notify: isNewVersionNotificationEnabled(),
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

  // Work captured while offline — delivery photos, and completions the network
  // refused — lives in IndexedDB until a link comes back. Mounted app-wide, not
  // on the SO / DR detail pages: the driver who queued it is most likely
  // somewhere else in the app (or has just reopened it) by the time signal
  // returns, and the promise made at capture time was that it syncs without
  // them going back to look for it.
  useEffect(() => startOfflineSync(), []);

  // Re-renders App when the config refresh settles, so the dismissal below can
  // release the overlay on the paths that never reload.
  const cfgReady = useCfgReady();

  // A settled config refresh is this app's definition of a healthy boot; hand
  // the next legitimate reload a full budget instead of this boot's leftovers.
  useEffect(() => {
    if (cfgReady) resetReloadGuard();
  }, [cfgReady]);

  // The overlay stays up only while a boot-time reload is genuinely pending:
  //
  // - Not first boot (config cached, theme correct) → dismiss immediately.
  // - First boot → hold until `cfgReady`. It flips on EVERY outcome of the
  //   config refresh except an imminent reload: fetch settled or rejected,
  //   no client code (BaseLayout shows ClientCodePrompt), client unconfigured
  //   (same prompt), a reload suppressed by the loop breaker, and the 15s
  //   watchdog as the floor. Adding conditions here restates `cfgReady`;
  //   removing the hold re-creates the theme flash `isFirstBoot` exists for.
  if (!isFirstBoot || cfgReady) {
    dismissLoadingOverlay();
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback fullScreen />}>
        <RouterProvider router={router} />
      </Suspense>
      {!isLocalhost && (
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
