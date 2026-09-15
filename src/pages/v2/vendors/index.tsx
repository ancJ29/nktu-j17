import { MasterDataDetailPage, MasterDataFormPage, MasterDataListPage } from '../master-data';
import { VENDOR_V2_SPEC } from './spec';

export function VendorsV2Page() {
  return <MasterDataListPage spec={VENDOR_V2_SPEC} />;
}

export function VendorV2DetailPage() {
  return <MasterDataDetailPage spec={VENDOR_V2_SPEC} />;
}

export function VendorV2FormPage() {
  return <MasterDataFormPage spec={VENDOR_V2_SPEC} />;
}
