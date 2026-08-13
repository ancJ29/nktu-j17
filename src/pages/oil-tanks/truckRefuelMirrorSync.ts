import { cMngtConnector } from '@credo/connectors/connector';
import { notifications } from '@mantine/notifications';
import type { OilTankIssueLogExtra, OperationLog, OperationLogExtra } from '@/types';
import type { OperationLogWriteEvent, TFn } from '@/pages/operation-logs/operationLogConfig';
import { datePart, yearOf } from '@/pages/operation-logs/operationLogConfig';
import { REFUEL_LOG_TYPE } from '@/utils/refuelStats';
import { planWriteEvent, truckBindingOf, type MirrorBinding } from './tankBridgePlan';

async function findMirror(
  truckId: string,
  year: number,
  issueLogId: string,
): Promise<OperationLog | undefined> {
  const res = await cMngtConnector.getOperationLogsByTarget<OperationLogExtra>({
    targetId: truckId,
    period: String(year),
  });
  return (res.operationLogs as OperationLog[]).find(
    (l) => l.logType === REFUEL_LOG_TYPE && l.extra?.sourceIssueLogId === issueLogId,
  );
}

function mirrorExtra(issue: OperationLog, tank: { id: string; code: string }): OperationLogExtra {
  const e = (issue.extra ?? {}) as OilTankIssueLogExtra;
  return {
    ...(typeof e.litres === 'number' && { litres: e.litres }),
    ...(typeof e.unitPrice === 'number' && { unitPrice: e.unitPrice }),
    ...(typeof e.totalAmount === 'number' && { totalAmount: e.totalAmount }),
    ...(typeof e.driverName === 'string' && e.driverName && { driverName: e.driverName }),
    ...(typeof e.driverId === 'string' && e.driverId && { driverId: e.driverId }),
    fuelSource: 'tank',
    oilTankId: tank.id,
    ...(tank.code && { oilTankCode: tank.code }),
    sourceIssueLogId: issue.id,
  } as OperationLogExtra;
}

async function createMirror(
  truck: MirrorBinding,
  issue: OperationLog,
  tank: { id: string; code: string },
): Promise<void> {
  await cMngtConnector.createOperationLog<OperationLogExtra>({
    targetId: truck.id,
    targetCode: truck.code,
    logType: REFUEL_LOG_TYPE,
    logDate: datePart(issue.logDate),
    extra: mirrorExtra(issue, tank),
  });
}

async function removeMirror(truckId: string, mirror: OperationLog): Promise<void> {
  await cMngtConnector.deleteOperationLog({
    id: mirror.id,
    targetId: truckId,
    period: String(yearOf(datePart(mirror.logDate))),
    version: mirror.version,
  });
}

async function updateMirror(
  truck: MirrorBinding,
  mirror: OperationLog,
  issue: OperationLog,
  tank: { id: string; code: string },
): Promise<void> {
  await cMngtConnector.updateOperationLog<OperationLogExtra>({
    id: mirror.id,
    targetId: truck.id,

    period: String(yearOf(datePart(mirror.logDate))),
    version: mirror.version,
    logDate: datePart(issue.logDate),
    extra: mirrorExtra(issue, tank),
  });
}

export async function syncTruckRefuelMirror(event: OperationLogWriteEvent, t: TFn): Promise<void> {
  try {
    const issue = event.log;
    const plan = planWriteEvent(event, truckBindingOf);

    if (plan.kind === 'none') return;

    const tank = { id: event.targetId, code: event.targetCode };

    const previousYear = yearOf(datePart((event.previous ?? issue).logDate));

    if (plan.kind === 'reconcile') {
      const mirror = await findMirror(plan.target.id, previousYear, issue.id);

      if (mirror) await updateMirror(plan.target, mirror, issue, tank);
      else await createMirror(plan.target, issue, tank);
      return;
    }

    if (plan.kind === 'detach' || plan.kind === 'move') {
      const mirror = await findMirror(plan.from.id, previousYear, issue.id);
      if (mirror) await removeMirror(plan.from.id, mirror);
    }
    if (plan.kind === 'attach' || plan.kind === 'move') {
      await createMirror(plan.to, issue, tank);
    }
  } catch {
    notifications.show({
      color: 'yellow',
      message: t('oilTanks.notifications.truckLogSyncError'),
      autoClose: 10000,
    });
  }
}
