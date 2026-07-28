import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { asyncDeduplicator } from '@credo/base-ui/utils';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { reportKeyOf, useNktuReportStore } from './useNktuReportStore';
import type { NktuReport, NktuReportKind } from './types';

export interface UseReportSnapshotParams {
  kind: NktuReportKind;
  periodKey: string;

  aggregate: (periodKey: string) => Promise<{ data: NktuReport['data']; sourceHash: string }>;
}

export interface ReportSnapshotState {
  snapshot: NktuReport | undefined;

  working: boolean;

  error: boolean;

  initialized: boolean;

  refresh: () => void;
}

export function useReportSnapshot({
  kind,
  periodKey,
  aggregate,
}: UseReportSnapshotParams): ReportSnapshotState {
  const items = useNktuReportStore((s) => s.items);
  const initialized = useNktuReportStore((s) => s.initialized);
  const loadAll = useNktuReportStore((s) => s.loadAll);
  const createSafely = useNktuReportStore((s) => s.createSafely);
  const updateSafely = useNktuReportStore((s) => s.updateSafely);

  const snapshot = useMemo<NktuReport | undefined>(() => {
    const key = reportKeyOf(kind, periodKey);
    return items.find((r) => r.reportKey === key && !r.extra?.isDeleted);
  }, [items, kind, periodKey]);

  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  const latestKeyRef = useRef(periodKey);

  const runEnsure = useCallback(
    async (key: string, force: boolean) => {
      setWorking(true);
      setError(false);

      const ensure = async (): Promise<'fresh' | 'created' | 'updated' | 'auto-updated'> => {
        await loadAll();
        const { data, sourceHash } = await aggregate(key);
        const existing = useNktuReportStore
          .getState()
          .items.find((r) => r.reportKey === reportKeyOf(kind, key));
        const generatedAt = Date.now();
        const generatedByName = useAuthStore.getState().user?.name;
        if (!existing) {
          await createSafely({
            patch: {
              reportKey: reportKeyOf(kind, key),
              kind,
              periodKey: key,
              generatedAt,
              ...(generatedByName ? { generatedByName } : {}),
              sourceHash,
              data,
            },
          });
          return 'created';
        }
        if (force || existing.sourceHash !== sourceHash) {
          const wasStale = existing.sourceHash !== sourceHash;
          await updateSafely({
            id: existing.id,
            version: existing.version,
            patch: {
              data,
              generatedAt,
              ...(generatedByName ? { generatedByName } : {}),
              sourceHash,
            },
          });
          return wasStale && !force ? 'auto-updated' : 'updated';
        }
        return 'fresh';
      };

      try {
        const result = force
          ? await ensure()
          : await asyncDeduplicator.call(`nktu-report:${kind}:${key}`, ensure);
        if (latestKeyRef.current === key && result === 'auto-updated') {
          notifications.show({ color: 'blue', message: 'Đã cập nhật theo dữ liệu mới nhất.' });
        }
      } catch (err) {
        if (latestKeyRef.current !== key) return;
        if (err instanceof EntityConflictError) {
          await loadAll(); // a concurrent writer won; the reloaded snapshot stands
        } else {
          setError(true);
        }
      } finally {
        if (latestKeyRef.current === key) setWorking(false);
      }
    },
    [kind, aggregate, loadAll, createSafely, updateSafely],
  );

  useEffect(() => {
    latestKeyRef.current = periodKey;

    void runEnsure(periodKey, false);
  }, [periodKey, runEnsure]);

  const refresh = useCallback(() => void runEnsure(periodKey, true), [runEnsure, periodKey]);

  return { snapshot, working, error, initialized, refresh };
}
