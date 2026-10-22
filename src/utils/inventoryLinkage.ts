import type { DateTimeInput } from '@credo/kits/types';
import type {
  InventoryLinkage,
  InventoryLinkageSnapshotEntry,
  InventoryLinkageTransition,
  InventoryLinkageVia,
  PendingInventoryShip,
} from '@/types/sales-order';

export type LinkageActor = { id: string; name: string } | undefined;

function buildTransition(
  action: InventoryLinkageTransition['action'],
  at: DateTimeInput,
  actor: LinkageActor,
  via: InventoryLinkageVia,
): InventoryLinkageTransition {
  return {
    action,
    at,
    ...(actor && { by: { id: actor.id, name: actor.name } }),
    via,
  };
}

export function buildReservedLinkage(
  snapshot: InventoryLinkageSnapshotEntry[],
  at: DateTimeInput,
  actor: LinkageActor,
  via: InventoryLinkageVia,
): InventoryLinkage {
  return {
    state: 'reserved',
    reservedSnapshot: snapshot,
    lastTransition: buildTransition('reserve', at, actor, via),
  };
}

export function buildPendingShipLinkage(
  current: InventoryLinkage,
  snapshot: InventoryLinkageSnapshotEntry[],
  at: DateTimeInput,
  actor: LinkageActor,
  via: InventoryLinkageVia,
): InventoryLinkage {
  const pendingShip: PendingInventoryShip = {
    snapshot,
    at,
    ...(actor && { by: { id: actor.id, name: actor.name } }),
    via,
  };
  return {
    ...current,
    state: 'reserved',
    reservedSnapshot: current.reservedSnapshot ?? snapshot,
    pendingShip,
  };
}

export function buildShippedLinkage(
  snapshot: InventoryLinkageSnapshotEntry[],
  at: DateTimeInput,
  actor: LinkageActor,
  via: InventoryLinkageVia,
): InventoryLinkage {
  return {
    state: 'shipped',
    ...(snapshot.length > 0 && { shippedSnapshot: snapshot }),
    lastTransition: buildTransition('ship', at, actor, via),
  };
}

export function buildReleasedLinkage(
  at: DateTimeInput,
  actor: LinkageActor,
  via: InventoryLinkageVia,
): InventoryLinkage {
  return {
    state: 'released',
    lastTransition: buildTransition('release', at, actor, via),
  };
}
