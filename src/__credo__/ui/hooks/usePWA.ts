import { useCallback, useEffect, useRef } from 'react';

import { useLocalStorage } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { reloadPage } from '../utils/misc';

const LAST_UPDATE_CHECK_KEY = '__VERSION_CHECK_TIMESTAMP__';

export type UsePWALabels = {
  newVersionAvailable: string;
  closeCompletelyInstructions: string;
  updating: string;
  reloadIn3Seconds: string;
  clickToUpdate: string;
  reloadAutomatically: string;
  offlineReady: string;
  appAvailableOffline: string;
};

export type UsePWAOptions = {
  bundledBuild: string;

  sw: {
    offlineReady: boolean;
    needRefresh: boolean;
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };

  labels?: Partial<UsePWALabels>;

  color?: string;

  successColor?: string;
};

const isChromium = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('chrome') || ua.includes('chromium') || ua.includes('edg');
};

const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
};

const isStandalone = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

const clearSafariCaches = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
};

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

let lastCheck = Number(localStorage.getItem(LAST_UPDATE_CHECK_KEY) ?? 0);
if (isNaN(lastCheck)) {
  lastCheck = 0;
}

export function usePWA({ bundledBuild, sw, labels, color, successColor }: UsePWAOptions) {
  const { offlineReady, needRefresh, updateServiceWorker } = sw;
  const notifColor = color ?? 'primary';
  const notifSuccessColor = successColor ?? 'primary';

  const {
    newVersionAvailable = 'New Version Available',
    closeCompletelyInstructions = 'Please close and reopen the app to update',
    updating = 'Updating...',
    reloadIn3Seconds = 'Reloading in 3 seconds...',
    clickToUpdate = 'Click to update',
    reloadAutomatically = 'Reloading automatically...',
    offlineReady: offlineReadyLabel = 'Offline Ready',
    appAvailableOffline = 'App is available offline',
  } = labels ?? {};

  const updateCheckInterval = useRef<number | undefined>(undefined);
  const lastNotificationTime = useRef<number>(0);
  const lastDetectedBuild = useRef<string>('');
  const [autoUpdate, setAutoUpdate] = useLocalStorage({
    key: 'pwa-auto-update',
    defaultValue: true,
  });

  const checkForUpdates = useCallback(async () => {
    if (isDev) return;
    const LIMIT = 30e3;
    if (Date.now() - lastCheck < LIMIT) return;
    lastCheck = Date.now();

    try {
      const remoteBuild = await fetchRemoteBuild();
      if (!remoteBuild) return;

      if (remoteBuild === bundledBuild) return;

      console.log('New build detected:', remoteBuild, '(running:', bundledBuild, ')');

      const now = Date.now();
      const timeSinceLastNotification = now - lastNotificationTime.current;
      const isSameBuild = lastDetectedBuild.current === remoteBuild;

      if (isSameBuild && timeSinceLastNotification < 10 * 60 * 1000) {
        console.log('Skipping duplicate notification for build:', remoteBuild);
        return;
      }

      lastNotificationTime.current = now;
      lastDetectedBuild.current = remoteBuild;

      if (isSafari() && isStandalone()) {
        await clearSafariCaches();
        notifications.show({
          id: 'safari-update',
          title: newVersionAvailable,
          message: closeCompletelyInstructions,
          color: notifColor,
          autoClose: false,
          withCloseButton: true,
        });
      } else if (isChromium() && autoUpdate) {
        notifications.show({
          id: 'auto-update',
          title: updating,
          message: reloadIn3Seconds,
          color: notifColor,
          autoClose: 3000,
        });
        setTimeout(() => {
          const now = Date.now();
          localStorage.setItem(LAST_UPDATE_CHECK_KEY, now.toString());
          updateServiceWorker(true);
          reloadPage('PWA update detected');
        }, 3000);
      } else {
        notifications.show({
          id: 'manual-update',
          title: newVersionAvailable,
          message: clickToUpdate,
          color: notifColor,
          autoClose: false,
          onClick() {
            updateServiceWorker(true);
            reloadPage('PWA update detected');
          },
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }, [
    autoUpdate,
    updateServiceWorker,
    bundledBuild,
    newVersionAvailable,
    closeCompletelyInstructions,
    updating,
    reloadIn3Seconds,
    clickToUpdate,
    notifColor,
  ]);

  useEffect(() => {
    void checkForUpdates();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    updateCheckInterval.current = window.setInterval(checkForUpdates, 30 * 60 * 1000);

    return () => {
      if (updateCheckInterval.current) {
        window.clearInterval(updateCheckInterval.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  useEffect(() => {
    if (needRefresh) {
      const now = Date.now();
      const recentlyNotified = now - lastNotificationTime.current < 5 * 60 * 1000;
      if (recentlyNotified) return;

      if (isChromium() && autoUpdate) {
        notifications.show({
          id: 'pwa-updating',
          title: updating,
          message: reloadAutomatically,
          color: notifColor,
          autoClose: 3000,
        });
        setTimeout(() => {
          updateServiceWorker(true);
          reloadPage('PWA update detected');
        }, 3000);
      } else {
        notifications.show({
          id: 'pwa-update-sw',
          title: newVersionAvailable,
          message: clickToUpdate,
          color: notifColor,
          autoClose: false,
          onClick() {
            updateServiceWorker(true);
            reloadPage('PWA update detected');
          },
        });
      }

      lastNotificationTime.current = now;
    }
  }, [
    needRefresh,
    autoUpdate,
    updateServiceWorker,
    updating,
    reloadAutomatically,
    newVersionAvailable,
    clickToUpdate,
    notifColor,
  ]);

  useEffect(() => {
    if (offlineReady) {
      notifications.show({
        title: offlineReadyLabel,
        message: appAvailableOffline,
        color: notifSuccessColor,
      });
    }
  }, [offlineReady, offlineReadyLabel, appAvailableOffline, notifSuccessColor]);

  return {
    offlineReady,
    needRefresh,
    autoUpdate,
    updateServiceWorker,
    setAutoUpdate,
    checkForUpdates,
    isStandalone: isStandalone(),
    isSafari: isSafari(),
    isChromium: isChromium(),
  };
}

let cachedRemote: { build: string; fetchedAt: number } | null = null;

async function fetchRemoteBuild(retries = 3): Promise<string | null> {
  if (cachedRemote && cachedRemote.fetchedAt > Date.now() - 60e3) {
    return cachedRemote.build;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`/build-info.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) throw new Error(`Failed to fetch build-info: ${response.status}`);

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('json')) {
        throw new Error(
          `build-info.json is not being served (content-type: ${contentType || 'none'}). ` +
            'The deploy is missing dist/build-info.json, so update detection is disabled.',
        );
      }

      const data: { buildHash: string; buildTimestamp: string } = await response.json();
      const build = `${data.buildHash}_${data.buildTimestamp}`;
      cachedRemote = { build, fetchedAt: Date.now() };
      return build;
    } catch (error) {
      console.error(`Failed to fetch build-info (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) {
        console.error(
          '[pwa] Update detection is DISABLED — /build-info.json is unreadable. ' +
            'Users will keep running the build they already have.',
        );
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  return null;
}
