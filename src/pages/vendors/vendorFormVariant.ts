import { VIETNAM_CHINA_ORIGIN_LABELS, type VendorOriginLabels } from './vendorOriginLabels';

export type VendorFormVariant = {
  originField: { kind: 'select'; labels: VendorOriginLabels } | { kind: 'switch' };
};

export const DEFAULT_VENDOR_FORM_VARIANT: VendorFormVariant = {
  originField: { kind: 'switch' },
};

export const NKTU_VENDOR_FORM_VARIANT: VendorFormVariant = {
  originField: { kind: 'select', labels: VIETNAM_CHINA_ORIGIN_LABELS },
};
