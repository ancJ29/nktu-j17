import { useCallback, useMemo, useState } from 'react';

export type RowSelection = {
  readonly selectedKeys: ReadonlySet<string>;
  readonly count: number;
  readonly isSelected: (key: string) => boolean;
  readonly toggle: (key: string) => void;
  readonly clear: () => void;

  readonly toggleAllIn: (keys: readonly string[]) => void;

  readonly headerState: (keys: readonly string[]) => {
    allSelected: boolean;
    someSelected: boolean;
  };
};

export function useRowSelection(): RowSelection {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);

      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedKeys(new Set()), []);

  const toggleAllIn = useCallback((keys: readonly string[]) => {
    setSelectedKeys((prev) => {
      if (keys.length === 0) return prev;
      const next = new Set(prev);
      const everySelected = keys.every((k) => next.has(k));
      for (const k of keys) {
        if (everySelected) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback((key: string) => selectedKeys.has(key), [selectedKeys]);

  const headerState = useCallback(
    (keys: readonly string[]) => {
      const allSelected = keys.length > 0 && keys.every((k) => selectedKeys.has(k));
      return {
        allSelected,
        someSelected: !allSelected && keys.some((k) => selectedKeys.has(k)),
      };
    },
    [selectedKeys],
  );

  return useMemo(
    () => ({
      selectedKeys,
      count: selectedKeys.size,
      isSelected,
      toggle,
      clear,
      toggleAllIn,
      headerState,
    }),
    [selectedKeys, isSelected, toggle, clear, toggleAllIn, headerState],
  );
}

export type SelectionMode = RowSelection & {
  readonly selectionMode: boolean;
  readonly enterSelectionMode: () => void;

  readonly exitSelectionMode: () => void;
  readonly toggleSelectionMode: () => void;
};

export function useSelectionMode(): SelectionMode {
  const selection = useRowSelection();
  const [selectionMode, setSelectionMode] = useState(false);
  const { clear } = selection;

  const enterSelectionMode = useCallback(() => setSelectionMode(true), []);
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    clear();
  }, [clear]);
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((on) => {
      if (on) clear();
      return !on;
    });
  }, [clear]);

  return useMemo(
    () => ({
      ...selection,
      selectionMode,
      enterSelectionMode,
      exitSelectionMode,
      toggleSelectionMode,
    }),
    [selection, selectionMode, enterSelectionMode, exitSelectionMode, toggleSelectionMode],
  );
}
