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
import { useOilTankStore } from '@/stores/useOilTankStore';
import { device } from '@credo/base-ui/utils';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import { perms } from '@/utils/permission';
import type { OilTankRow } from '@/types';
import { OIL_TANK_CONFIG } from './oilTankConfig';

const isMobile = device.isMobile;
const canEdit = perms.oilTank.canEdit();
const canDelete = perms.oilTank.canDelete();

type Props = {
  readonly tank: OilTankRow;

  readonly onUpdated: (tank: OilTankRow) => void;
};

export function OilTankDangerZone({ tank, onUpdated }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const forceRefresh = useOilTankStore((s) => s.forceRefresh);

  const [toggleOpened, { open: openToggle, close: closeToggle }] = useDisclosure(false);
  const [toggling, setToggling] = useState(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  const surfaceConflict = useCallback(
    (err: unknown) => {
      if (!(err instanceof EntityConflictError)) return false;
      if (err.latest) onUpdated(err.latest as OilTankRow);
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
    const nextActive = !tank.isActive;
    setToggling(true);
    try {
      const updated = await useOilTankStore.getState().updateSafely({
        id: tank.id,
        version: tank.version,
        patch: { isActive: nextActive },
      });
      onUpdated(updated as OilTankRow);
      logActivity(
        'oilTank.toggleStatus',
        tank.id,
        deepDiff({ isActive: tank.isActive }, { isActive: nextActive }),
      );
      notifications.show({
        color: 'green',
        message: t(
          nextActive
            ? 'oilTanks.notifications.enableSuccess'
            : 'oilTanks.notifications.disableSuccess',
        ),
      });
      forceRefresh();
    } catch (err) {
      if (!surfaceConflict(err)) {
        notifications.show({ color: 'red', message: t('oilTanks.notifications.toggleError') });
      }
    } finally {
      setToggling(false);
      closeToggle();
    }
  }, [tank, t, onUpdated, forceRefresh, surfaceConflict, closeToggle]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await useOilTankStore.getState().updateSafely({
        id: tank.id,
        version: tank.version,
        patch: { isActive: false, extra: { ...tank.extra, isDeleted: true } },
      });
      logActivity('oilTank.delete', tank.id);
      notifications.show({ color: 'green', message: t('oilTanks.notifications.deleteSuccess') });
      forceRefresh();
      navigate(OIL_TANK_CONFIG.routes.LIST);
    } catch (err) {
      if (!surfaceConflict(err)) {
        notifications.show({ color: 'red', message: t('oilTanks.notifications.deleteError') });
      }
      closeDelete();
    } finally {
      setDeleting(false);
    }
  }, [tank, t, navigate, forceRefresh, surfaceConflict, closeDelete]);

  if (isMobile || (!canEdit && !canDelete)) return null;

  return (
    <>
      <DangerZoneCard title={t('__new__.01-common.dangerZone.title')}>
        {canEdit && (
          <DangerAction
            title={t(
              tank.isActive ? 'oilTanks.dangerZone.disableItem' : 'oilTanks.dangerZone.enableItem',
            )}
            description={t(
              tank.isActive
                ? 'oilTanks.dangerZone.disableItemDesc'
                : 'oilTanks.dangerZone.enableItemDesc',
            )}
            buttonLabel={t(
              tank.isActive
                ? '__new__.01-common.dangerZone.disableButton'
                : '__new__.01-common.dangerZone.enableButton',
            )}
            buttonIcon={tank.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            buttonColor={tank.isActive ? 'orange' : 'green'}
            onClick={openToggle}
          />
        )}
        {canEdit && canDelete && <Divider variant="dashed" />}
        {canDelete && (
          <DangerAction
            title={t('oilTanks.dangerZone.deleteItem')}
            description={t('oilTanks.dangerZone.deleteItemDesc')}
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
          tank.isActive ? 'oilTanks.dangerZone.disableItem' : 'oilTanks.dangerZone.enableItem',
        )}
        message={t(
          tank.isActive
            ? 'oilTanks.dangerZone.disableConfirm'
            : 'oilTanks.dangerZone.enableConfirm',
        )}
        confirmLabel={t(
          tank.isActive
            ? '__new__.01-common.dangerZone.disableButton'
            : '__new__.01-common.dangerZone.enableButton',
        )}
        confirmColor={tank.isActive ? 'orange' : 'green'}
        loading={toggling}
      />
      <ConfirmModal
        opened={deleteOpened}
        onClose={closeDelete}
        onConfirm={handleDelete}
        title={t('oilTanks.dangerZone.deleteItem')}
        message={t('oilTanks.dangerZone.deleteConfirm')}
        loading={deleting}
      />
    </>
  );
}
