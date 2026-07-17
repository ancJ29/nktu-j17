import { ONE_MINUTE } from '@credo/kits/time';
import { createPartitionedRecordsStore } from '@/stores/createPartitionedRecordsStore';
import type { Quotation } from './types';

function monthKeysForDayRange(from: string, to: string): string[] {
  const [fy, fm] = from.slice(0, 7).split('-').map(Number);
  const [ty, tm] = to.slice(0, 7).split('-').map(Number);
  if (!fy || !fm || !ty || !tm) return [];
  if (ty < fy || (ty === fy && tm < fm)) return [];
  const keys: string[] = [];
  let y = fy;
  let m = fm;
  
  while ((y < ty || (y === ty && m <= tm)) && keys.length < 240) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}

export const quotationBundle = createPartitionedRecordsStore<Quotation>({
  
  
  
  
  entity: 'quotations',
  partitionLocate: 'creation:month',
  uniqueField: 'extra.code',
  
  
  
  cacheKey: 'qtn2.d94b1e',
  cacheTTL: 5 * ONE_MINUTE,
  staleTime: ONE_MINUTE,
  defaultRangeDays: 90,
  keysForRange: monthKeysForDayRange,
});

export const useQuotationStore = quotationBundle.useStore;

export async function markQuotationConverted(
  quotationId: string,
  salesOrder: { id: string; number: string; poDate: number },
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let current: Quotation;
    try {
      current = (await quotationBundle.fetchById(quotationId)).item;
    } catch {
      return; // quotation not found — nothing to link
    }
    if (current.extra.status === 'converted' && current.extra.generatedSalesOrderId) return;
    try {
      await quotationBundle.updateSafely({
        id: current.id,
        version: current.version,
        patch: {
          extra: {
            ...current.extra,
            status: 'converted',
            generatedSalesOrderId: salesOrder.id,
            generatedSalesOrderNumber: salesOrder.number,
            convertedAt: salesOrder.poDate,
          },
        },
      });
      return;
    } catch {
      // Conflict or transient failure — refetch + retry a couple of times, then
      // give up (best-effort; the SO is already created).
    }
  }
}
