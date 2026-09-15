import { MasterDataDetailPage, MasterDataFormPage, MasterDataListPage } from '../master-data';
import { CUSTOMER_V2_SPEC } from './spec';

export function CustomersV2Page() {
  return <MasterDataListPage spec={CUSTOMER_V2_SPEC} />;
}

export function CustomerV2DetailPage() {
  return <MasterDataDetailPage spec={CUSTOMER_V2_SPEC} />;
}

export function CustomerV2FormPage() {
  return <MasterDataFormPage spec={CUSTOMER_V2_SPEC} />;
}
