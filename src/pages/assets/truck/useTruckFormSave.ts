import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import type { TruckAssetExtra, TruckAssetRow } from '@/types';

type CoreFields = {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
};

type SubmitArgs = {
  isEdit: boolean;
  id?: string;
  snapshot: TruckAssetRow | null;
  core: CoreFields;
  extra: TruckAssetExtra;
};

const ROUTES_T = ROUTES.ASSETS.TRUCKS;

export function useTruckFormSave() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async ({ isEdit, id, snapshot, core, extra }: SubmitArgs): Promise<TruckAssetRow | null> => {
      setLoading(true);
      try {
        if (isEdit && id) {
          if (!snapshot) throw new Error('Truck snapshot missing');
          const updated = await useTruckAssetStore
            .getState()
            .updateSafely({ id, version: snapshot.version, patch: { ...core, extra } });
          const diff = deepDiff(
            {
              name: snapshot.name,
              code: snapshot.code,
              description: snapshot.description,
              isActive: snapshot.isActive,
              extra: snapshot.extra,
            },
            { ...core, extra },
          );

          const onlyIsActive = Object.keys(diff).length === 1 && 'isActive' in diff;
          logActivity(onlyIsActive ? 'truck.toggleStatus' : 'truck.update', id, diff);
          notifications.show({ color: 'green', message: t('assets.notifications.updateSuccess') });
          navigate(ROUTES_T.DETAIL.replace(':id', id));
          return updated as TruckAssetRow;
        }

        const created = await useTruckAssetStore
          .getState()
          .createSafely({ patch: { ...core, extra } });
        logActivity('truck.create', created.id);
        notifications.show({ color: 'green', message: t('assets.notifications.createSuccess') });
        navigate(ROUTES_T.DETAIL.replace(':id', created.id));
        return created as TruckAssetRow;
      } catch (err) {
        if (err instanceof EntityConflictError) {
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('assets.notifications.updateError')
              : t('assets.notifications.createError'),
          });
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [t, navigate],
  );

  return { loading, submit };
}
