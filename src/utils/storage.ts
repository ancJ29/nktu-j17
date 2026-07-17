

import { cacheGet, cacheSet } from '@/utils/appCache';

export enum SharedStorageKey {
  LANGUAGE = '__LANGUAGE__',
  DEPARTMENT = '__DEPARTMENT__',
}

export enum PcStorageKey {
  NAVBAR_OPENED = '__PC_NAVBAR_OPENED__',
  IS_COMPACT = '__PC_IS_COMPACT__',
}

export enum MobileStorageKey {
  IS_COMPACT = '__MOBILE_IS_COMPACT__',
}

export type UserStorageKey = SharedStorageKey | PcStorageKey | MobileStorageKey;
export const UserStorageKey = { ...SharedStorageKey, ...PcStorageKey, ...MobileStorageKey };

export type SharedSettings = {
  [SharedStorageKey.LANGUAGE]: string;
};

export type PcSettings = {
  [PcStorageKey.NAVBAR_OPENED]: boolean;
  [PcStorageKey.IS_COMPACT]: boolean;
};

export type MobileSettings = {
  [MobileStorageKey.IS_COMPACT]: boolean;
};

export type UserSettings = {
  shared?: Partial<Record<SharedStorageKey, unknown>>;
  pc?: Partial<Record<PcStorageKey, unknown>>;
  mobile?: Partial<Record<MobileStorageKey, unknown>>;
};

type Namespace = 'shared' | 'pc' | 'mobile';

function createUserStorage<K extends string>(namespace: Namespace) {
  let onChangeCallback: (() => void) | null = null;

  function getData(): Record<string, unknown> {
    return (cacheGet('usr')?.[namespace] as Record<string, unknown>) ?? {};
  }

  function setData(data: Record<string, unknown>): void {
    const usr = cacheGet('usr') ?? {};
    usr[namespace] = data;
    cacheSet('usr', usr);
  }

  return {
    get<T>(key: K, defaultValue?: T): T | null {
      const value = getData()[key] as T | undefined;
      return value !== undefined ? value : (defaultValue ?? null);
    },

    set<T>(key: K, value: T): void {
      const data = getData();
      if (data[key] !== value) {
        data[key] = value;
        setData(data);
        onChangeCallback?.();
      }
    },

    exportSettings(): Record<string, unknown> {
      return { ...getData() };
    },

    importSettings(settings: Record<string, unknown>): void {
      if (!settings) return;
      setData({ ...getData(), ...settings });
    },

    onChange(callback: () => void): void {
      onChangeCallback = callback;
    },
  };
}

export const sharedUserStorage = createUserStorage<SharedStorageKey>('shared');

export const pcUserStorage = createUserStorage<PcStorageKey>('pc');

export const mobileUserStorage = createUserStorage<MobileStorageKey>('mobile');

export const compositeUserStorage = {
  exportSettings(): Record<string, unknown> {
    return {
      shared: sharedUserStorage.exportSettings(),
      pc: pcUserStorage.exportSettings(),
      mobile: mobileUserStorage.exportSettings(),
    };
  },

  importSettings(settings: Record<string, unknown>): void {
    const s = settings as UserSettings;
    if (s.shared) sharedUserStorage.importSettings(s.shared as Record<string, unknown>);
    if (s.pc) pcUserStorage.importSettings(s.pc as Record<string, unknown>);
    if (s.mobile) mobileUserStorage.importSettings(s.mobile as Record<string, unknown>);
  },

  onChange(callback: () => void): void {
    sharedUserStorage.onChange(callback);
    pcUserStorage.onChange(callback);
    mobileUserStorage.onChange(callback);
  },
};
