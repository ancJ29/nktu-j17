import { cMngtConnector } from '@credo/connectors/connector';
import type { OperationLog, OperationLogExtra, RefuelLogExtra } from '@/types';
import type { OperationLogWriteEvent } from '@/pages/operation-logs/operationLogConfig';
import { datePart, yearOf } from '@/pages/operation-logs/operationLogConfig';
import { OIL_TANK_ISSUE_LOG_TYPE } from './oilTankBalance';
import { planWriteEvent, tankBindingOf, type MirrorBinding } from './tankBridgePlan';
import { applyMovementToTankLevel } from './tankMovements';

async function findMirror(
  tankId: string,
  year: number,
  refuelLogId: string,
): Promise<OperationLog | undefined> {
  const res = await cMngtConnector.getOperationLogsByTarget<OperationLogExtra>({
    targetId: tankId,
    period: String(year),
  });
  return (res.operationLogs as OperationLog[]).find(
    (l) => l.logType === OIL_TANK_ISSUE_LOG_TYPE && l.extra?.sourceRefuelLogId === refuelLogId,
  );
}

function mirrorExtra(refuel: OperationLog, truckCode: string): OperationLogExtra {
  const e = (refuel.extra ?? {}) as RefuelLogExtra;
  return {
    ...(typeof e.litres === 'number' && { litres: e.litres }),
    ...(typeof e.unitPrice === 'number' && { unitPrice: e.unitPrice }),
    ...(typeof e.totalAmount === 'number' && { totalAmount: e.totalAmount }),
    ...(typeof e.driverName === 'string' && e.driverName && { driverName: e.driverName }),

    ...(typeof e.driverId === 'string' && e.driverId && { driverId: e.driverId }),
    truckId: refuel.targetId,
    ...(truckCode && { truckCode }),
    sourceRefuelLogId: refuel.id,
  } as OperationLogExtra;
}

async function createMirror(
  tank: MirrorBinding,
  refuel: OperationLog,
  truckCode: string,
): Promise<void> {
  const res = await cMngtConnector.createOperationLog<OperationLogExtra>({
    targetId: tank.id,
    targetCode: tank.code,
    logType: OIL_TANK_ISSUE_LOG_TYPE,
    logDate: datePart(refuel.logDate),
    extra: mirrorExtra(refuel, truckCode),
  });
  await applyMovementToTankLevel({
    op: 'create',
    log: res.operationLog as OperationLog,
    previous: null,
    targetId: tank.id,
    targetCode: tank.code,
  });
}

async function removeMirror(tankId: string, mirror: OperationLog): Promise<void> {
  await cMngtConnector.deleteOperationLog({
    id: mirror.id,
    targetId: tankId,
    period: String(yearOf(datePart(mirror.logDate))),
    version: mirror.version,
  });
  await applyMovementToTankLevel({
    op: 'delete',
    log: mirror,
    previous: null,
    targetId: tankId,
    targetCode: '',
  });
}

async function updateMirror(
  tank: MirrorBinding,
  mirror: OperationLog,
  refuel: OperationLog,
  truckCode: string,
): Promise<void> {
  const nextDate = datePart(refuel.logDate);
  const res = await cMngtConnector.updateOperationLog<OperationLogExtra>({
    id: mirror.id,
    targetId: tank.id,

    period: String(yearOf(datePart(mirror.logDate))),
    version: mirror.version,
    logDate: nextDate,
    extra: mirrorExtra(refuel, truckCode),
  });
  await applyMovementToTankLevel({
    op: 'update',
    log: res.operationLog as OperationLog,
    previous: mirror,
    targetId: tank.id,
    targetCode: tank.code,
  });
}

export async function syncTankIssue(event: OperationLogWriteEvent): Promise<void> {
  const refuel = event.log;
  const truckCode = event.targetCode;

  const plan = planWriteEvent(event, tankBindingOf);

  if (plan.kind === 'none') return;

  const previousYear = yearOf(datePart((event.previous ?? refuel).logDate));

  if (plan.kind === 'reconcile') {
    const mirror = await findMirror(plan.target.id, previousYear, refuel.id);

    if (mirror) await updateMirror(plan.target, mirror, refuel, truckCode);
    else await createMirror(plan.target, refuel, truckCode);
    return;
  }

  if (plan.kind === 'detach' || plan.kind === 'move') {
    const mirror = await findMirror(plan.from.id, previousYear, refuel.id);
    if (mirror) await removeMirror(plan.from.id, mirror);
  }
  if (plan.kind === 'attach' || plan.kind === 'move') {
    await createMirror(plan.to, refuel, truckCode);
  }
}
