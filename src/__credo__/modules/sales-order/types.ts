import type { CMngtSalesOrderItem as SalesOrderItem } from '@credo/connectors/types';

export type {
  CMngtSalesOrder as SalesOrder,
  CMngtSalesOrderItem as SalesOrderItem,
} from '@credo/connectors/types';

export interface CreateSalesOrderInput<TExtra = Record<string, unknown>> {
  orderNumber: string;
  customerName: string;
  items: SalesOrderItem[];
  notes?: string;
  extra?: TExtra;
}

export interface UpdateSalesOrderInput<TExtra = Record<string, unknown>> {
  version?: string;
  customerName?: string;
  items?: SalesOrderItem[];
  notes?: string;
  isClosed?: boolean;
  extra?: TExtra;
}

export interface SalesOrderFilter {
  isClosed?: boolean;
  search?: string;
  fromPeriod?: string;
  toPeriod?: string;
}
