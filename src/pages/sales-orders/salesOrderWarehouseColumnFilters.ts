import type { ColumnFilterDef, DataTableColumnFilterLabels } from '@credo/base-ui/hooks';

import type { SalesOrder } from '@/types';
import { computeSalesOrderTotals } from '@/utils/salesOrderPricing';

type BuildArgs = {
  readonly priceVisible: boolean;

  readonly vatRate: number;
  readonly labels: DataTableColumnFilterLabels;
};

const formatNumber = (value: string): string => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : value;
};

export function buildSalesOrderWarehouseColumnFilterDefs({
  priceVisible,
  vatRate,
  labels,
}: BuildArgs): ColumnFilterDef<SalesOrder>[] {
  return [
    ...(priceVisible
      ? [
          {
            key: 'financeSubtotal',
            getValue: (o: SalesOrder) => String(computeSalesOrderTotals(o, vatRate).subtotal),
          },
          {
            key: 'financeVat',
            getValue: (o: SalesOrder) => String(computeSalesOrderTotals(o, vatRate).vat),
          },
          {
            key: 'afterTax',

            getValue: (o: SalesOrder) => {
              const { subtotal, vat } = computeSalesOrderTotals(o, vatRate);
              return String(subtotal + vat);
            },
          },
        ].map((def) => ({ ...def, getLabel: formatNumber, labels }))
      : []),
    { key: 'customerPONumber', getValue: (o) => o.extra?.customerPONumber, labels },
  ];
}
