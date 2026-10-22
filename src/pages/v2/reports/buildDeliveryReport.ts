import type { DeliveryNoteStage } from '@credo/connectors/status-flow';
import type { DeliveryNoteV2 } from '@/types/delivery-note-v2';
import { anchorDayOf } from '../anchorDay';

export interface DeliveryCounts {
  delivered: number;

  inProgress: number;
  cancelled: number;
  total: number;
}

export interface DeliveryAssigneeRow extends DeliveryCounts {
  key: string;

  label: string;
}

export interface DeliveryReport {
  totals: DeliveryCounts;

  byAssignee: DeliveryAssigneeRow[];
  unknownStatusNotes: number;
}

export function buildDeliveryReport(
  rows: ReadonlyArray<DeliveryNoteV2>,
  input: {
    fromDay: string;
    toDay: string;

    resolveStage: (status: string) => DeliveryNoteStage | undefined;
  },
): DeliveryReport {
  const totals: DeliveryCounts = { delivered: 0, inProgress: 0, cancelled: 0, total: 0 };
  const byKey = new Map<string, DeliveryAssigneeRow>();
  let unknownStatusNotes = 0;

  for (const note of rows) {
    const day = anchorDayOf(note.deliveryDate, note.createdAt);
    if (!day || day < input.fromDay || day > input.toDay) continue;
    const stage = input.resolveStage(note.status);
    if (stage === undefined) {
      unknownStatusNotes += 1;
      continue;
    }

    const key = note.assignedTo ?? '';
    let row = byKey.get(key);
    if (!row) {
      row = {
        key,
        label: note.assignedToName ?? '',
        delivered: 0,
        inProgress: 0,
        cancelled: 0,
        total: 0,
      };
      byKey.set(key, row);
    }
    const bucket: keyof DeliveryCounts =
      stage === 'delivered' ? 'delivered' : stage === 'cancelled' ? 'cancelled' : 'inProgress';
    row[bucket] += 1;
    row.total += 1;
    totals[bucket] += 1;
    totals.total += 1;
  }

  const byAssignee = [...byKey.values()].sort(
    (a, b) =>
      b.total - a.total || b.delivered - a.delivered || a.label.localeCompare(b.label, 'vi'),
  );

  return { totals, byAssignee, unknownStatusNotes };
}
