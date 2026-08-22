export type ProductInventoryListVariant = {
  showStockKpiBadges: boolean;

  showSecondaryKpiBadges: boolean;

  showStockFilter: boolean;

  showSecondaryFilter: boolean;

  quickChipMode: 'stock' | 'secondary' | 'none';

  showBeginOfPeriod: boolean;

  showColumnHeaderFilters: boolean;

  showOutgoingDetailModal: boolean;
};

export const DEFAULT_PRODUCT_INVENTORY_LIST_VARIANT: ProductInventoryListVariant = {
  showStockKpiBadges: true,
  showSecondaryKpiBadges: false,
  showStockFilter: true,
  showSecondaryFilter: true,
  quickChipMode: 'stock',
  showBeginOfPeriod: false,
  showColumnHeaderFilters: false,
  showOutgoingDetailModal: false,
};

export const NKTU_PRODUCT_INVENTORY_LIST_VARIANT: ProductInventoryListVariant = {
  showStockKpiBadges: false,
  showSecondaryKpiBadges: true,
  showStockFilter: false,
  showSecondaryFilter: false,
  quickChipMode: 'none',
  showBeginOfPeriod: true,
  showOutgoingDetailModal: true,
  showColumnHeaderFilters: false,
};
