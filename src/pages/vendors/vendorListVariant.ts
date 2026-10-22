import { VIETNAM_CHINA_ORIGIN_LABELS, type VendorOriginLabels } from './vendorOriginLabels';

export type VendorListVariant = {
  origin?: VendorOriginLabels;
};

export const DEFAULT_VENDOR_LIST_VARIANT: VendorListVariant = {};

export const NKTU_VENDOR_LIST_VARIANT: VendorListVariant = {
  origin: VIETNAM_CHINA_ORIGIN_LABELS,
};
