import { notifications } from '@mantine/notifications';
import type { TFunction } from 'i18next';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import type { DeliveryRequest, DeliveryRequestExtra, SalesOrder } from '@/types';
import {
  getInitialStatusValue as getDrInitialStatusValue,
  getReleaseTargetValue as getDrReleaseTargetValue,
  runTransition as runDrTransition,
} from '@/pages/delivery-requests/transitionEngine';
import type { SoFollowUp } from './transitionEngine';

export type DispatchActor = { id: string; name: string } | undefined;

export async function dispatchSoFollowUp(
  followUp: SoFollowUp,
  updatedSo: SalesOrder,
  actor: DispatchActor,
  t: TFunction,
): Promise<void> {
  switch (followUp.kind) {
    case 'release-linked-drs':
      return releaseLinkedDrsOnSoRelease(updatedSo, actor, t);
  }
}

async function releaseLinkedDrsOnSoRelease(
  updatedSo: SalesOrder,
  actor: DispatchActor,
  t: TFunction,
): Promise<void> {
  const drTarget = getDrReleaseTargetValue();
  if (!drTarget) return;
  const drInitial = getDrInitialStatusValue();
  if (!drInitial) return;

  const allDrs = useDeliveryRequestStore.getState().items as DeliveryRequest[];
  const candidates = allDrs.filter((d) => {
    if (d.salesOrderId !== updatedSo.id) return false;
    if (d.isClosed) return false;
    const drExtra = (d.extra ?? {}) as DeliveryRequestExtra;
    return (drExtra.status ?? '') === drInitial;
  });
  if (candidates.length === 0) return;

  let advanced = 0;
  let firstFailure: string | undefined;
  for (const dr of candidates) {
    const res = await runDrTransition({
      request: dr,
      toStatusValue: drTarget,
      actor,
    });
    if (res.ok) {
      advanced += 1;
    } else if (!firstFailure) {
      firstFailure =
        res.failure.kind === 'patch-error' ? res.failure.error.message : res.failure.kind;
    }
  }

  if (advanced > 0) {
    notifications.show({
      color: 'green',
      message: t('deliveryRequests.notifications.drsAutoReleasedSuccess', {
        count: advanced,
        total: candidates.length,
        status: drTarget,
      }),
    });
  }
  if (firstFailure) {
    notifications.show({
      color: 'yellow',
      title: t('deliveryRequests.notifications.drsAutoReleasedFailedTitle'),
      message: firstFailure,
      autoClose: 10000,
    });
  }
}
