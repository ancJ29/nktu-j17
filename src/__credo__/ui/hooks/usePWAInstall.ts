import { useCallback, useEffect, useState } from 'react';
import { logger } from '../utils/logger';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type ReminderPeriod = 'tomorrow' | 'next-week' | 'next-month' | 'never';

const STORAGE_KEY = 'pwa-install-reminder';
const DISMISSED_KEY = 'pwa-install-dismissed';

interface ReminderData {
  period: ReminderPeriod;
  timestamp: number;
}

export type PWAInstallStorage = {
  getReminder: () => ReminderData | null;
  setReminder: (data: ReminderData) => void;
  isDismissed: () => boolean;
  setDismissed: (value: boolean) => void;
};

type UsePWAInstallOptions = {
  storage?: PWAInstallStorage;
};

export function usePWAInstall(options?: UsePWAInstallOptions) {
  const customStorage = options?.storage;
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [shouldShowPopup, setShouldShowPopup] = useState(false);

  const checkShouldShowPopup = useCallback((): boolean => {
    if (customStorage) {
      if (customStorage.isDismissed()) return false;
    } else {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed === 'true') return false;
    }

    let reminder: ReminderData | null = null;
    if (customStorage) {
      reminder = customStorage.getReminder();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) reminder = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    if (!reminder) return true;

    if (reminder.period === 'never') return false;

    const timePassed = Date.now() - reminder.timestamp;

    switch (reminder.period) {
      case 'tomorrow':
        return timePassed > 24 * 60 * 60 * 1000;
      case 'next-week':
        return timePassed > 7 * 24 * 60 * 60 * 1000;
      case 'next-month':
        return timePassed > 30 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  }, [customStorage]);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    const shouldShow = checkShouldShowPopup();
    setShouldShowPopup(shouldShow && !standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);

      const shouldShow = checkShouldShowPopup();
      setShouldShowPopup(shouldShow);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const setReminder = (period: ReminderPeriod) => {
    if (period === 'never') {
      if (customStorage) {
        customStorage.setDismissed(true);
      } else {
        localStorage.setItem(DISMISSED_KEY, 'true');
      }
    } else {
      const data: ReminderData = { period, timestamp: Date.now() };
      if (customStorage) {
        customStorage.setReminder(data);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    }
    setShouldShowPopup(false);
  };

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        if (customStorage) {
          customStorage.setDismissed(true);
        } else {
          localStorage.setItem(DISMISSED_KEY, 'true');
        }
        setShouldShowPopup(false);
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      logger.error('Error prompting PWA install:', error);
    }
  };

  const dismissPopup = () => {
    setShouldShowPopup(false);
  };

  return {
    isInstallable,
    isIOS,
    isStandalone,
    isMobile: isIOS || /Android/i.test(navigator.userAgent),
    shouldShowPopup,
    promptInstall,
    setReminder,
    dismissPopup,
  };
}
