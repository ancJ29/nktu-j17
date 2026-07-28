import { Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconBan, IconCircleCheck, IconTrash } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DangerAction } from '@/components/DangerAction';
import { DangerZoneCard } from '@/components/DangerZoneCard';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { device } from '@credo/base-ui/utils';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import { perms } from '@/utils/permission';
import type { TruckAssetRow } from '@/types';
import { TRUCK_CONFIG } from './truckConfig';

const isMobile = device.isMobile;
const canEdit = perms.truck.canEdit();
const canDelete = perms.truck.canDelete();

type TruckDangerZoneProps = {
  truck: TruckAssetRow;

  onUpdated: (truck: TruckAssetRow) => void;
};

export function TruckDangerZone({ truck, onUpdated }: TruckDangerZoneProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const forceRefresh = useTruckAssetStore((s) => s.forceRefresh);

  const [toggleOpened, { open: openToggle, close: closeToggle }] = useDisclosure(false);
  const [toggling, setToggling] = useState(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  const surfaceConflict = useCallback(
    (err: unknown) => {
      if (!(err instanceof EntityConflictError)) return false;
      if (err.latest) onUpdated(err.latest as TruckAssetRow);
      notifications.show({
        color: 'yellow',
        title: t('common.conflict.title'),
        message: t('common.conflict.message'),
        autoClose: 8000,
      });
      return true;
    },
    [onUpdated, t],
  );

  const handleToggle = useCallback(async () => {
    const nextActive = !truck.isActive;
    setToggling(true);
    try {
      const updated = await useTruckAssetStore.getState().updateSafely({
        id: truck.id,
        version: truck.version,
        patch: { isActive: nextActive },
      });
      onUpdated(updated as TruckAssetRow);
      logActivity(
        'truck.toggleStatus',
        truck.id,
        deepDiff({ isActive: truck.isActive }, { isActive: nextActive }),
      );
      notifications.show({
        color: 'green',
        message: t(
          nextActive ? 'assets.notifications.enableSuccess' : 'assets.notifications.disableSuccess',
        ),
      });
      forceRefresh();
    } catch (err) {
      if (!surfaceConflict(err)) {
        notifications.show({ color: 'red', message: t('assets.notifications.toggleError') });
      }
    } finally {
      setToggling(false);
      closeToggle();
    }
  }, [truck, t, onUpdated, forceRefresh, surfaceConflict, closeToggle]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await useTruckAssetStore.getState().updateSafely({
        id: truck.id,
        version: truck.version,
        patch: { isActive: false, extra: { ...truck.extra, isDeleted: true } },
      });
      logActivity('truck.delete', truck.id);
      notifications.show({ color: 'green', message: t('assets.notifications.deleteSuccess') });
      forceRefresh();
      navigate(TRUCK_CONFIG.routes.LIST);
    } catch (err) {
      if (!surfaceConflict(err)) {
        notifications.show({ color: 'red', message: t('assets.notifications.deleteError') });
      }
      closeDelete();
    } finally {
      setDeleting(false);
    }
  }, [truck, t, navigate, forceRefresh, surfaceConflict, closeDelete]);

  if (isMobile || (!canEdit && !canDelete)) return null;

  return (
    <>
      <DangerZoneCard title={t('__new__.01-common.dangerZone.title')}>
        {canEdit && (
          <DangerAction
            title={t(
              truck.isActive
                ? '__new__.07-entities.trucks.dangerZone.disableItem'
                : '__new__.07-entities.trucks.dangerZone.enableItem',
            )}
            description={t(
              truck.isActive
                ? '__new__.07-entities.trucks.dangerZone.disableItemDesc'
                : '__new__.07-entities.trucks.dangerZone.enableItemDesc',
            )}
            buttonLabel={t(
              truck.isActive
                ? '__new__.01-common.dangerZone.disableButton'
                : '__new__.01-common.dangerZone.enableButton',
            )}
            buttonIcon={truck.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            buttonColor={truck.isActive ? 'orange' : 'green'}
            onClick={openToggle}
          />
        )}
        {canEdit && canDelete && <Divider variant="dashed" />}
        {canDelete && (
          <DangerAction
            title={t('__new__.07-entities.trucks.dangerZone.deleteItem')}
            description={t('__new__.07-entities.trucks.dangerZone.deleteItemDesc')}
            buttonLabel={t('__new__.01-common.actions.remove')}
            buttonIcon={<IconTrash size={14} />}
            buttonColor="danger"
            onClick={openDelete}
          />
        )}
      </DangerZoneCard>

      <ConfirmModal
        opened={toggleOpened}
        onClose={closeToggle}
        onConfirm={handleToggle}
        title={t(
          truck.isActive
            ? '__new__.07-entities.trucks.dangerZone.disableItem'
            : '__new__.07-entities.trucks.dangerZone.enableItem',
        )}
        message={t(
          truck.isActive
            ? '__new__.07-entities.trucks.dangerZone.disableConfirm'
            : '__new__.07-entities.trucks.dangerZone.enableConfirm',
        )}
        confirmLabel={t(
          truck.isActive
            ? '__new__.01-common.dangerZone.disableButton'
            : '__new__.01-common.dangerZone.enableButton',
        )}
        confirmColor={truck.isActive ? 'orange' : 'green'}
        loading={toggling}
      />
      <ConfirmModal
        opened={deleteOpened}
        onClose={closeDelete}
        onConfirm={handleDelete}
        title={t('__new__.07-entities.trucks.dangerZone.deleteItem')}
        message={t('__new__.07-entities.trucks.dangerZone.deleteConfirm')}
        loading={deleting}
      />
    </>
  );
}
