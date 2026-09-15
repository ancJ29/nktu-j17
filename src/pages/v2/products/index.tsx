import { MasterDataDetailPage, MasterDataFormPage, MasterDataListPage } from '../master-data';
import { PRODUCT_V2_SPEC } from './spec';

export function ProductsV2Page() {
  return <MasterDataListPage spec={PRODUCT_V2_SPEC} />;
}

export function ProductV2DetailPage() {
  return <MasterDataDetailPage spec={PRODUCT_V2_SPEC} />;
}

export function ProductV2FormPage() {
  return <MasterDataFormPage spec={PRODUCT_V2_SPEC} />;
}
