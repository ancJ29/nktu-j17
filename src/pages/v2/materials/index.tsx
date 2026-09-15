import { MasterDataDetailPage, MasterDataFormPage, MasterDataListPage } from '../master-data';
import { MATERIAL_V2_SPEC } from './spec';

export function MaterialsV2Page() {
  return <MasterDataListPage spec={MATERIAL_V2_SPEC} />;
}

export function MaterialV2DetailPage() {
  return <MasterDataDetailPage spec={MATERIAL_V2_SPEC} />;
}

export function MaterialV2FormPage() {
  return <MasterDataFormPage spec={MATERIAL_V2_SPEC} />;
}
