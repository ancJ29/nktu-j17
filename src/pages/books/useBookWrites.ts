import { notifications } from '@mantine/notifications';
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { EntityConflictError } from '@/stores/createEntityStore';
import type { BookEntry } from '@/types';
import { resolveActorId } from '@/utils/activityLogger';
import type { BookKind } from './bookKinds';
import { buildBookDelete, buildBookWrite, type ValidBookDraft } from './bookModel';

type Args = {
  readonly kind: BookKind;

  readonly currentKey: () => string;
  readonly setRows: Dispatch<SetStateAction<BookEntry[]>>;

  readonly reload: () => Promise<void>;
};

export function useBookWrites({ kind, currentKey, setRows, reload }: Args) {
  const { t } = useTranslation();
  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      t(key as never, options as never) as unknown as string,
    [t],
  );

  const conflict = useCallback(
    async (err: unknown) => {
      if (err instanceof EntityConflictError) {
        notifications.show({
          color: 'yellow',
          title: tr('common.conflict.title'),
          message: tr('common.conflict.message'),
        });
        await reload();
      }
    },
    [reload, tr],
  );

  const moved = useCallback(
    (key: string) =>
      notifications.show({
        message: tr('books.table.movedMonth', { month: kind.partitionLabel?.(key) ?? key }),
      }),
    [kind, tr],
  );

  const save = useCallback(
    async (valid: ValidBookDraft, existing?: BookEntry) => {
      const write = buildBookWrite(
        valid,
        { actor: resolveActorId() ?? '', fixedExtra: kind.fixedExtra },
        existing,
      );
      const key = kind.partitionKeyOf(valid.recordDate);
      try {
        if (!existing) {
          const created = await kind.bundle.createSafely({ item: write, partitionKey: key });
          if (key === currentKey()) setRows((prev) => [...prev, created]);
          else moved(key);
          return;
        }
        const from = kind.partitionKeyOf(existing.recordDate);
        const updated = await kind.bundle.updateSafely({
          id: existing.id,
          version: existing.version,
          patch: write,
          partitionKey: from,
          ...(key !== from && { newPartitionKey: key }),
        });
        if (key === from) {
          setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        } else {
          moved(key);
          setRows((prev) => prev.filter((r) => r.id !== updated.id));
          await reload();
        }
      } catch (err) {
        await conflict(err);
        throw err;
      }
    },
    [kind, currentKey, setRows, moved, reload, conflict],
  );

  const remove = useCallback(
    async (row: BookEntry) => {
      const key = kind.partitionKeyOf(row.recordDate);
      try {
        const struck = await kind.bundle.updateSafely({
          id: row.id,
          version: row.version,
          patch: buildBookDelete(row, resolveActorId() ?? '', Date.now()),
          partitionKey: key,
        });
        setRows((prev) => prev.map((r) => (r.id === struck.id ? struck : r)));
        notifications.show({ message: tr('books.table.deleted') });
      } catch (err) {
        await conflict(err);
        throw err;
      }
    },
    [kind, setRows, tr, conflict],
  );

  return { save, remove };
}
