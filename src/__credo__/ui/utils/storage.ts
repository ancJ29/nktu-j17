

import { logger } from './logger';

export function generateStorage<Key extends string>() {
  return {
    get<Value>(key: Key, defaultValue?: Value): Value | null {
      try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue ?? null;
        return JSON.parse(item) as Value;
      } catch {
        return defaultValue ?? null;
      }
    },

    set<Value>(key: Key, value: Value): void {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        logger.error('Failed to save to localStorage:', error);
      }
    },

    remove(key: Key): void {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        logger.error('Failed to remove from localStorage:', error);
      }
    },

    clear(): void {
      try {
        localStorage.clear();
      } catch (error) {
        logger.error('Failed to clear localStorage:', error);
      }
    },
  };
}

export type Storage<UserIdKey extends string> = ReturnType<typeof generateStorage<UserIdKey>>;

export function generateUserStorage<
  UserIdKey extends string,
  UserStorageKey extends string,
  Settings extends Record<string, unknown>,
>(userIdKey: UserIdKey, storage: Storage<UserIdKey>, defaultSettings: Settings) {
  let onChangeCallback: (() => void) | null = null;
  const namespace = 'user';

  const getStorageKey = (loginUserId: string) => `__user_data_${namespace}__.${loginUserId}`;

  type UserData = Record<string, Partial<Settings>>;

  const instance = {
    loginUserId: '',
    namespace,
    userData: {} as UserData,

    load(): void {
      const loginUserId = storage.get<string>(userIdKey);
      if (!loginUserId) {
        return;
      }
      if (!this.userData[loginUserId]) {
        const userDataKey = getStorageKey(loginUserId);
        try {
          this.userData[loginUserId] = JSON.parse(
            localStorage.getItem(userDataKey) ?? '{}',
          ) as Partial<Settings>;
        } catch {
          this.userData[loginUserId] = {};
          localStorage.removeItem(userDataKey);
        }
      }
    },

    save(): void {
      const loginUserId = this.loginUserId || storage.get<string>(userIdKey);
      if (!loginUserId) {
        return;
      }
      localStorage.setItem(getStorageKey(loginUserId), JSON.stringify(this.userData[loginUserId]));
    },

    
    get<Key extends UserStorageKey>(key: Key): Settings[Key] {
      const loginUserId = this.loginUserId || storage.get<string>(userIdKey);
      if (!loginUserId) {
        return defaultSettings[key];
      }

      this.load();

      const userData = this.userData[loginUserId] ?? {};
      const value = userData[key];
      return value !== undefined ? (value as Settings[Key]) : defaultSettings[key];
    },

    
    set<Key extends UserStorageKey>(key: Key, value: Settings[Key]): void {
      const loginUserId = storage.get<string>(userIdKey);
      if (!loginUserId) {
        return;
      }

      this.load();

      if (this.userData[loginUserId]) {
        const isChanged = this.userData[loginUserId][key] !== value;
        if (isChanged) {
          this.userData[loginUserId][key] = value;
          this.save();
          onChangeCallback?.();
        }
      }
    },

    
    exportSettings(): Partial<Settings> {
      const loginUserId = this.loginUserId || storage.get<string>(userIdKey);
      if (!loginUserId) return {};
      this.load();
      return { ...this.userData[loginUserId] };
    },

    
    importSettings(settings: Partial<Settings>): void {
      logger.debug(`[${new Date().toISOString()}] import-settings...`, settings);
      const loginUserId = this.loginUserId || storage.get<string>(userIdKey);
      if (!loginUserId || !settings) return;
      this.load();
      const current = this.userData[loginUserId];
      logger.debug(`[${new Date().toISOString()}] import-settings current:`, current);

      this.userData[loginUserId] = {
        ...this.userData[loginUserId],
        ...settings,
      };

      this.save();
      logger.debug(
        `[${new Date().toISOString()}] import-settings save:`,
        this.userData[loginUserId],
      );
    },

    
    onChange(callback: () => void): void {
      onChangeCallback = callback;
    },
  };

  return instance;
}

export type UserStorageInstance = ReturnType<typeof generateUserStorage>;
