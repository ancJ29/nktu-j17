import { logger } from '@credo/base-ui/utils';

export type ListFilterCache<T> = {
  read(): T | null;

  write(state: T): void;

  clear(): void;
};

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

type Stamped<T> = { __day: string; __v: T };

export function createListFilterCache<T extends object>(key: string): ListFilterCache<T> {
  return {
    read(): T | null {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<Stamped<T>>;

        if (!parsed || typeof parsed !== 'object' || typeof parsed.__day !== 'string') {
          localStorage.removeItem(key);
          return null;
        }

        if (parsed.__day !== todayStamp()) {
          localStorage.removeItem(key);
          return null;
        }
        return (parsed.__v ?? null) as T | null;
      } catch (err) {
        logger.warn(`[listFilterCache] read('${key}') failed`, err);
        return null;
      }
    },
    write(state: T): void {
      try {
        if (state && typeof state === 'object' && Object.keys(state).length === 0) {
          localStorage.removeItem(key);
          return;
        }
        const stamped: Stamped<T> = { __day: todayStamp(), __v: state };
        localStorage.setItem(key, JSON.stringify(stamped));
      } catch (err) {
        logger.warn(`[listFilterCache] write('${key}') failed`, err);
      }
    },
    clear(): void {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}
