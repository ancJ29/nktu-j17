

import type { SalesOrderStatusBadgeVariant } from '@/components/sales-orders/salesOrderStatusBadgeVariant';
import {
  DEFAULT_SALES_ORDER_STATUS_BADGE_VARIANT,
  NKTU_SALES_ORDER_STATUS_BADGE_VARIANT,
} from '@/components/sales-orders/salesOrderStatusBadgeVariant';

export type SalesOrderListVariant = {
  
  showStatsCards: boolean;
  
  showExtraDatePresets: boolean;
  
  bulkDrMode: 'simple' | 'selection';
  
  defaultDateRangeDays: number | undefined;
  
  accountingExport: { allowedDepartments: readonly string[] } | undefined;
  
  showItemsPreview: boolean;
  
  dateColumns: 'splitSortable' | 'combinedReady';
  
  showPaymentColumns: boolean;
  
  statusBadge: SalesOrderStatusBadgeVariant;
};

export const DEFAULT_SALES_ORDER_LIST_VARIANT: SalesOrderListVariant = {
  showStatsCards: true,
  showExtraDatePresets: true,
  bulkDrMode: 'simple',
  defaultDateRangeDays: undefined,
  accountingExport: undefined,
  showItemsPreview: false,
  dateColumns: 'splitSortable',
  showPaymentColumns: true,
  statusBadge: DEFAULT_SALES_ORDER_STATUS_BADGE_VARIANT,
};

export const NKTU_SALES_ORDER_LIST_VARIANT: SalesOrderListVariant = {
  showStatsCards: false,
  showExtraDatePresets: false,
  bulkDrMode: 'selection',
  defaultDateRangeDays: 90,
  
  accountingExport: { allowedDepartments: ['manager', 'accounting'] },
  
  showItemsPreview: true,
  dateColumns: 'combinedReady',
  showPaymentColumns: false,
  statusBadge: NKTU_SALES_ORDER_STATUS_BADGE_VARIANT,
};
