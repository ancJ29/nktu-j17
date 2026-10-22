import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { supportedLngs } from '@/i18n';

type UseLanguageSyncOptions = {
  isProfileLoaded: boolean;
};

export function useLanguageSync({ isProfileLoaded }: UseLanguageSyncOptions) {
  const { i18n } = useTranslation();
  const hasAppliedSettings = useRef(false);
  const lastSavedLanguage = useRef<string | null>(null);

  
  useEffect(() => {
    if (!isProfileLoaded || hasAppliedSettings.current) return;
    hasAppliedSettings.current = true;

    const savedLanguage = sharedUserStorage.get<string>(SharedStorageKey.LANGUAGE);
    const savedBase = savedLanguage?.split('-')[0];
    const savedIsSupported = !!savedBase && supportedLngs.includes(savedBase);

    if (savedLanguage && savedIsSupported) {
      if (savedLanguage !== i18n.language) {
        i18n.changeLanguage(savedLanguage);
      }
      lastSavedLanguage.current = savedLanguage;
    } else {
      
      
      sharedUserStorage.set(SharedStorageKey.LANGUAGE, i18n.language);
      lastSavedLanguage.current = i18n.language;
    }
  }, [isProfileLoaded, i18n]);

  
  useEffect(() => {
    if (!hasAppliedSettings.current || lastSavedLanguage.current === i18n.language) {
      return;
    }

    lastSavedLanguage.current = i18n.language;
    sharedUserStorage.set(SharedStorageKey.LANGUAGE, i18n.language);
  }, [i18n.language]);
}
