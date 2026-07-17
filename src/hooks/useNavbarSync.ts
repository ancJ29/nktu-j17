
import { pcUserStorage, PcStorageKey } from '@/utils/storage';
import { useCallback, useEffect, useRef, useState } from 'react';

type UseNavbarSyncOptions = {
  isProfileLoaded: boolean;
};

export function useNavbarSync({ isProfileLoaded }: UseNavbarSyncOptions) {
  const [navbarOpened, setNavbarOpened] = useState(true);
  const hasAppliedSettings = useRef(false);

  
  useEffect(() => {
    if (!isProfileLoaded || hasAppliedSettings.current) return;
    hasAppliedSettings.current = true;

    const saved = pcUserStorage.get<boolean>(PcStorageKey.NAVBAR_OPENED);
    if (saved !== null) {
      setNavbarOpened(saved);
    } else {
      
      pcUserStorage.set(PcStorageKey.NAVBAR_OPENED, true);
    }
  }, [isProfileLoaded]);

  
  const toggleNavbar = useCallback(() => {
    setNavbarOpened((prev) => {
      const next = !prev;
      pcUserStorage.set(PcStorageKey.NAVBAR_OPENED, next);
      return next;
    });
  }, []);

  return { navbarOpened, toggleNavbar };
}
