export type ProductInventoryListVariant = {
  showStockKpiBadges: boolean;

  showSecondaryKpiBadges: boolean;

  showStockFilter: boolean;

  quickChipMode: 'stock' | 'secondary';

  showBeginOfPeriod: boolean;
};

export const DEFAULT_PRODUCT_INVENTORY_LIST_VARIANT: ProductInventoryListVariant = {
  showStockKpiBadges: true,
  showSecondaryKpiBadges: false,
  showStockFilter: true,
  quickChipMode: 'stock',
  showBeginOfPeriod: false,
};

export const NKTU_PRODUCT_INVENTORY_LIST_VARIANT: ProductInventoryListVariant = {
  showStockKpiBadges: false,
  showSecondaryKpiBadges: true,
  showStockFilter: false,
  quickChipMode: 'secondary',
  showBeginOfPeriod: true,
};
