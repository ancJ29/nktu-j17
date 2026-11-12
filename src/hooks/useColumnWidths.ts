import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DataTableResizableColumns } from '@credo/base-ui/components';

const storageKey = (list: string) => `cmngt:col-widths:${list}`;

type Widths = Record<string, number>;

export function readColumnWidths(list: string): Widths {
  try {
    const raw = localStorage.getItem(storageKey(list));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Widths = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeColumnWidth(list: string, key: string, width: number | null): Widths {
  const next = { ...readColumnWidths(list) };
  if (width === null) delete next[key];
  else next[key] = width;
  try {
    if (Object.keys(next).length === 0) localStorage.removeItem(storageKey(list));
    else localStorage.setItem(storageKey(list), JSON.stringify(next));
  } catch {
    // Preference only — losing it costs one more drag, never data.
  }
  return next;
}

export function useColumnWidths(list?: string): DataTableResizableColumns | undefined {
  const { t } = useTranslation();
  const [state, setState] = useState<{ list?: string; widths: Widths }>(() => ({
    list,
    widths: list ? readColumnWidths(list) : {},
  }));

  let widths = state.widths;
  if (state.list !== list) {
    widths = list ? readColumnWidths(list) : {};
    setState({ list, widths });
  }

  const onChange = useCallback(
    (key: string, width: number | null) => {
      if (!list) return;
      setState({ list, widths: writeColumnWidth(list, key, width) });
    },
    [list],
  );
  const label = t('__new__.01-common.list.resizeColumn');

  return useMemo(
    () => (list ? { widths, onChange, label } : undefined),
    [list, widths, onChange, label],
  );
}
