export type ProductFormVariant = {
  showNoInventoryToggle: boolean;

  seedInventoryRowOnCreate: boolean;
};

export const DEFAULT_PRODUCT_FORM_VARIANT: ProductFormVariant = {
  showNoInventoryToggle: true,
  seedInventoryRowOnCreate: false,
};

export const NKTU_PRODUCT_FORM_VARIANT: ProductFormVariant = {
  showNoInventoryToggle: false,
  seedInventoryRowOnCreate: true,
};
