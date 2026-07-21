
import { cMngtConnector } from '@credo/connectors/connector';
import { transportOrderBundle } from '@/stores/useTransportOrderStore';
import { featureFlags } from '@/utils/features';
import type { OperationLog, TransportOrder, TransportOrderTripLogRef, TripLogExtra } from '@/types';
import { diffTripLogs, fingerprintTripLogs, periodOf, planTripLogs } from './tripLogPlan';

function partitionReader() {
  const cache = new Map<string, Promise<Map<string, OperationLog>>>();
  return (targetId: string, period: string) => {
    const key = `${targetId}-${period}`;
    let entry = cache.get(key);
    if (!entry) {
      entry = cMngtConnector
        .getOperationLogsByTarget<TripLogExtra>({ targetId, period })
        .then((res) => new Map((res.operationLogs as OperationLog[]).map((l) => [l.id, l])))
        .catch(() => new Map<string, OperationLog>());
      cache.set(key, entry);
    }
    return entry;
  };
}

export async function reconcileTripLogs(order: TransportOrder): Promise<TransportOrder> {
  
  
  if (!featureFlags.trucks.enabled) return order;

  const plans = planTripLogs(order);
  const hash = fingerprintTripLogs(plans);
  const sync = order.extra?.tripLogSync;
  if (sync?.hash === hash) return order;

  const refs = sync?.refs ?? [];
  const ops = diffTripLogs(plans, refs);
  const readPartition = partitionReader();
  const nextRefs: TransportOrderTripLogRef[] = [];

  for (const op of ops) {
    if (op.kind === 'create') {
      const { operationLog } = await cMngtConnector.createOperationLog<TripLogExtra>({
        targetId: op.plan.targetId,
        targetCode: op.plan.targetCode,
        logType: 'trip',
        logDate: op.plan.logDate,
        extra: op.plan.extra,
      });
      nextRefs.push({
        logId: operationLog.id,
        targetId: op.plan.targetId,
        period: periodOf(op.plan.logDate),
        tripIndex: op.plan.tripIndex,
      });
      continue;
    }

    const existing = (await readPartition(op.ref.targetId, op.ref.period)).get(op.ref.logId);

    if (op.kind === 'delete') {
      
      
      if (!existing) continue;
      await cMngtConnector.deleteOperationLog({
        id: op.ref.logId,
        targetId: op.ref.targetId,
        period: op.ref.period,
        version: existing.version,
      });
      continue;
    }

    
    
    if (!existing) {
      const { operationLog } = await cMngtConnector.createOperationLog<TripLogExtra>({
        targetId: op.plan.targetId,
        targetCode: op.plan.targetCode,
        logType: 'trip',
        logDate: op.plan.logDate,
        extra: op.plan.extra,
      });
      nextRefs.push({
        logId: operationLog.id,
        targetId: op.plan.targetId,
        period: periodOf(op.plan.logDate),
        tripIndex: op.plan.tripIndex,
      });
      continue;
    }
    await cMngtConnector.updateOperationLog<TripLogExtra>({
      id: op.ref.logId,
      targetId: op.ref.targetId,
      period: op.ref.period,
      version: existing.version,
      logDate: op.plan.logDate,
      
      
      extra: { ...(existing.extra as TripLogExtra), ...op.plan.extra },
    });
    nextRefs.push({
      logId: op.ref.logId,
      targetId: op.ref.targetId,
      
      
      period: periodOf(op.plan.logDate),
      tripIndex: op.plan.tripIndex,
    });
  }

  return transportOrderBundle.updateSafely({
    id: order.id,
    version: order.version,
    patch: { extra: { ...order.extra, tripLogSync: { hash, refs: nextRefs } } },
  });
}
