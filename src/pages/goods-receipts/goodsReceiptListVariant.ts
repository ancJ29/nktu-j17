export type GoodsReceiptListVariant = {
  showStatsCards: boolean;

  accountingExport: { allowedDepartments: readonly string[] } | undefined;
};

export const DEFAULT_GOODS_RECEIPT_LIST_VARIANT: GoodsReceiptListVariant = {
  showStatsCards: true,
  accountingExport: undefined,
};

export const NKTU_GOODS_RECEIPT_LIST_VARIANT: GoodsReceiptListVariant = {
  showStatsCards: false,

  accountingExport: { allowedDepartments: ['manager', 'accounting'] },
};
