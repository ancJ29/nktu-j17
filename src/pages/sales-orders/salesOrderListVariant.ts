

export type SalesOrderListVariant = {
  
  showStatsCards: boolean;
  
  showExtraDatePresets: boolean;
  
  bulkDrMode: 'simple' | 'selection';
  
  defaultDateRangeDays: number | undefined;
  
  accountingExport: { allowedDepartments: readonly string[] } | undefined;
  
  showItemsPreview: boolean;
};

export const DEFAULT_SALES_ORDER_LIST_VARIANT: SalesOrderListVariant = {
  showStatsCards: true,
  showExtraDatePresets: true,
  bulkDrMode: 'simple',
  defaultDateRangeDays: undefined,
  accountingExport: undefined,
  showItemsPreview: false,
};

export const NKTU_SALES_ORDER_LIST_VARIANT: SalesOrderListVariant = {
  showStatsCards: false,
  showExtraDatePresets: false,
  bulkDrMode: 'selection',
  defaultDateRangeDays: 90,
  
  accountingExport: { allowedDepartments: ['manager', 'accounting'] },
  
  showItemsPreview: true,
};
