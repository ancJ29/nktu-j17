import { cMngtConnector } from '@credo/connectors/connector';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useOilTankStore, OIL_TANK_RECORD_TARGET } from '@/stores/useOilTankStore';
import type { OilTankRow, OperationLog, OperationLogExtra } from '@/types';
import type { OperationLogWriteEvent } from '@/pages/operation-logs/operationLogConfig';
import {
  movementDelta,
  movementYears,
  replayBalance,
  OIL_TANK_MOVEMENT_TYPES,
} from './oilTankBalance';

const MAX_LEVEL_RETRIES = 3;

async function fetchTank(id: string): Promise<OilTankRow> {
  const res = await cMngtConnector.getSingleRecordById(OIL_TANK_RECORD_TARGET, { id });
  return res.item as OilTankRow;
}

async function patchLevel(
  tankId: string,
  nextFor: (tank: OilTankRow) => number,
  seed?: OilTankRow,
): Promise<OilTankRow> {
  let tank = seed ?? (await fetchTank(tankId));
  for (let attempt = 0; ; attempt++) {
    try {
      return (await useOilTankStore.getState().updateSafely({
        id: tank.id,
        version: tank.version,

        patch: { extra: { ...tank.extra, currentLevel: nextFor(tank) } },
      })) as OilTankRow;
    } catch (err) {
      if (!(err instanceof EntityConflictError) || attempt >= MAX_LEVEL_RETRIES) throw err;

      tank = (err.latest as OilTankRow | undefined) ?? (await fetchTank(tank.id));
    }
  }
}

export async function applyMovementToTankLevel(event: OperationLogWriteEvent): Promise<void> {
  const previous = event.op === 'update' ? event.previous : null;
  const next = event.op === 'delete' ? null : event.log;
  const delta = movementDelta(previous, next);
  if (delta === 0) return;
  await patchLevel(event.targetId, (tank) => {
    const current = tank.extra?.currentLevel;
    const base = typeof current === 'number' && Number.isFinite(current) ? current : 0;

    return Math.round((base + delta) * 100) / 100;
  });
}

async function readLedger(tank: OilTankRow, toYear: number): Promise<OperationLog[]> {
  const openingYear = Number(String(tank.extra?.openingDate ?? '').slice(0, 4));

  const fromYear = Number.isFinite(openingYear)
    ? openingYear
    : new Date(tank.createdAt).getFullYear();

  const logs: OperationLog[] = [];
  for (const year of movementYears(fromYear, toYear)) {
    const res = await cMngtConnector.getOperationLogsByTarget<OperationLogExtra>({
      targetId: tank.id,
      period: String(year),
    });
    for (const log of res.operationLogs as OperationLog[]) {
      if (OIL_TANK_MOVEMENT_TYPES.includes(log.logType)) logs.push(log);
    }
  }
  return logs;
}

export type RecomputeResult = {
  level: number;

  previousLevel: number | null;

  drift: number;

  movementCount: number;
};

export async function recomputeTankLevel(
  tankId: string,
  today = new Date(),
): Promise<RecomputeResult> {
  const tank = await fetchTank(tankId);
  const logs = await readLedger(tank, today.getFullYear());
  const opening = tank.extra?.openingLevel;
  const level = replayBalance(typeof opening === 'number' ? opening : 0, logs);
  const before = tank.extra?.currentLevel;
  const previousLevel = typeof before === 'number' && Number.isFinite(before) ? before : null;

  await patchLevel(tankId, () => level, tank);

  return {
    level,
    previousLevel,
    drift: previousLevel === null ? 0 : Math.round((level - previousLevel) * 100) / 100,
    movementCount: logs.length,
  };
}
