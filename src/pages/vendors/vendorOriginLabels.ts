

import { byClient } from '@/config/client';

type VendorOriginLabelKey =
  | 'vendors.origin.domestic'
  | 'vendors.origin.overseas'
  | 'vendors.origin.vietnam'
  | 'vendors.origin.china';

export type VendorOriginLabels = {
  
  readonly domestic: VendorOriginLabelKey;
  
  readonly overseas: VendorOriginLabelKey;
};

export const DOMESTIC_OVERSEAS_ORIGIN_LABELS: VendorOriginLabels = {
  domestic: 'vendors.origin.domestic',
  overseas: 'vendors.origin.overseas',
};

export const VIETNAM_CHINA_ORIGIN_LABELS: VendorOriginLabels = {
  domestic: 'vendors.origin.vietnam',
  overseas: 'vendors.origin.china',
};

export const VENDOR_ORIGIN_LABELS: VendorOriginLabels = byClient(
  { nktu: VIETNAM_CHINA_ORIGIN_LABELS },
  DOMESTIC_OVERSEAS_ORIGIN_LABELS,
);
