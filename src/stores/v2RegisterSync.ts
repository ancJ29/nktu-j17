export type SyncedRegister =
  | 'products'
  | 'materials'
  | 'vendors'
  | 'customers'
  | 'lookups'
  | 'productInventory'
  | 'materialInventory';

export type SyncableStore = {
  getState: () => { initialized: boolean; revalidate: () => Promise<void> };
  subscribe: (listener: (state: { initialized: boolean }) => void) => () => void;
};

export type RegisterEntry = {
  store: () => SyncableStore;

  enabled: () => boolean;
};

export type SyncedSet = { c: string; r: SyncedRegister[] };

export type SyncCache = {
  read: () => SyncedSet | null | undefined;
  write: (value: SyncedSet) => void;
};

export function createRegisterSync(
  registers: Record<SyncedRegister, RegisterEntry>,
  cache: SyncCache,
) {
  const names = Object.keys(registers) as SyncedRegister[];

  const read = (clientCode: string): Set<SyncedRegister> => {
    const stored = cache.read();
    if (!stored || stored.c !== clientCode) return new Set();
    return new Set(stored.r.filter((name) => name in registers));
  };

  const record = (clientCode: string, name: SyncedRegister): void => {
    const current = read(clientCode);
    if (current.has(name)) return;
    current.add(name);
    cache.write({ c: clientCode, r: [...current] });
  };

  return {
    read,
    record,

    watch(clientCode: string): () => void {
      const stops = names.flatMap((name) => {
        const entry = registers[name];
        if (!entry.enabled()) return [];
        const store = entry.store();
        if (store.getState().initialized) {
          record(clientCode, name);
          return [];
        }
        const stop = store.subscribe((state) => {
          if (!state.initialized) return;
          record(clientCode, name);
          stop();
        });
        return [stop];
      });
      return () => stops.forEach((stop) => stop());
    },

    async tick(clientCode: string): Promise<void> {
      const wanted = read(clientCode);
      await Promise.all(
        names
          .filter((name) => wanted.has(name) && registers[name].enabled())
          .map((name) => registers[name].store().getState().revalidate()),
      );
    },
  };
}
