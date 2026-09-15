import { notifications } from '@mantine/notifications';
import { useForm, type UseFormReturnType } from '@mantine/form';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EntityConflictError, validationFieldsOf } from '@/stores/createEntityStore';
import type { MasterDataFormValues, MasterDataRow, MasterDataSpec } from './spec';

export function useMasterDataWrites<Row extends MasterDataRow, Values extends MasterDataFormValues>(
  spec: MasterDataSpec<Row, Values>,
) {
  const { t } = useTranslation();
  const text = useMemo(() => spec.text(t), [spec, t]);
  const [busy, setBusy] = useState(false);

  const conflict = useCallback(
    () =>
      notifications.show({
        color: 'yellow',
        title: t('common.conflict.title'),
        message: t('common.conflict.message'),
        autoClose: 8000,
      }),
    [t],
  );

  const failed = useCallback(
    () => notifications.show({ color: 'red', message: text.notifications.error }),
    [text],
  );

  const save = useCallback(
    async (
      values: Values,
      editing: Row | null,
      form: UseFormReturnType<Values>,
    ): Promise<Row | null> => {
      const code = values.code.trim().toUpperCase();

      if (code) {
        const taken = spec.useStore
          .getState()
          .items.find((row) => row.id !== editing?.id && row.code.trim().toUpperCase() === code);
        if (taken) {
          form.setFieldError(
            'code',
            taken.extra?.isDeleted ? text.duplicate.archived : text.duplicate.live,
          );
          return null;
        }
      }

      setBusy(true);
      try {
        const patch = spec.form.patchOf(values, editing);
        const saved = editing
          ? await spec.useStore
              .getState()
              .updateSafely({ id: editing.id, version: editing.version, patch })
          : await spec.useStore.getState().createSafely({ patch });
        notifications.show({
          color: 'green',
          message: editing ? text.notifications.updated : text.notifications.created,
        });
        return saved;
      } catch (err) {
        if (err instanceof EntityConflictError) {
          conflict();
        } else if (validationFieldsOf(err)) {
          form.setFieldError('code', text.duplicate.archived);
        } else {
          failed();
        }
        return null;
      } finally {
        setBusy(false);
      }
    },
    [spec, text, conflict, failed],
  );

  const setActive = useCallback(
    async (target: Row, isActive: boolean): Promise<boolean> => {
      setBusy(true);
      try {
        await spec.useStore
          .getState()
          .updateSafely({ id: target.id, version: target.version, patch: { isActive } });
        notifications.show({ color: 'green', message: text.notifications.updated });
        return true;
      } catch (err) {
        if (err instanceof EntityConflictError) conflict();
        else failed();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [spec, text, conflict, failed],
  );

  const archive = useCallback(
    async (target: Row): Promise<boolean> => {
      setBusy(true);
      try {
        await spec.useStore.getState().deleteSafely({ id: target.id, version: target.version });
        notifications.show({ color: 'green', message: text.notifications.archived });
        return true;
      } catch (err) {
        if (err instanceof EntityConflictError) {
          conflict();
          return true;
        }
        failed();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [spec, text, conflict, failed],
  );

  return { save, setActive, archive, busy };
}

export function useMasterDataForm<Row extends MasterDataRow, Values extends MasterDataFormValues>(
  spec: MasterDataSpec<Row, Values>,
  editing: Row | null,

  initialName?: string,
): UseFormReturnType<Values> {
  const { t } = useTranslation();
  const text = useMemo(() => spec.text(t), [spec, t]);
  return useForm<Values>({
    initialValues: editing
      ? spec.form.valuesOf(editing)
      : { ...spec.form.empty, ...(initialName?.trim() ? { name: initialName.trim() } : {}) },
    validate: (values) => ({ name: values.name.trim() ? null : text.nameRequired }),
  });
}

export function useMasterDataList<Row extends MasterDataRow, Values extends MasterDataFormValues>(
  spec: MasterDataSpec<Row, Values>,
) {
  const items = spec.useStore((s) => s.items);
  const initialized = spec.useStore((s) => s.initialized);
  const loading = spec.useStore((s) => s.loading);
  const cachedAt = spec.useStore((s) => s.cachedAt);
  const loadAll = spec.useStore((s) => s.loadAll);
  const forceRefresh = spec.useStore((s) => s.forceRefresh);
  return { items, initialized, loading, cachedAt, loadAll, forceRefresh };
}
