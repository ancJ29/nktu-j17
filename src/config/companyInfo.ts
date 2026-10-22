import { appConfig } from './index';

export type CompanyInfo = {
  id: string;
  name: string;
  address: string;
  taxCode: string;
  tel: string;
  email: string;
};

const FALLBACK_COMPANY_INFO: CompanyInfo = {
  id: '',
  name: '',
  address: '',
  taxCode: '',
  tel: '',
  email: '',
};

function overlay(cfg: Partial<CompanyInfo> | undefined, index: number): CompanyInfo {
  return {
    id: cfg?.id?.trim() || String(index),
    name: cfg?.name?.trim() || FALLBACK_COMPANY_INFO.name,
    address: cfg?.address?.trim() || FALLBACK_COMPANY_INFO.address,
    taxCode: cfg?.taxCode?.trim() || FALLBACK_COMPANY_INFO.taxCode,
    tel: cfg?.tel?.trim() || FALLBACK_COMPANY_INFO.tel,
    email: cfg?.email?.trim() || FALLBACK_COMPANY_INFO.email,
  };
}

export function getCompanyInfos(): CompanyInfo[] {
  return (appConfig.companyInfo ?? []).map(overlay);
}

export function getCompanyInfo(id?: string): CompanyInfo {
  const companies = getCompanyInfos();
  const pinned = id ? companies.find((c) => c.id === id) : undefined;
  return pinned ?? companies[0] ?? FALLBACK_COMPANY_INFO;
}

export function hasMultipleCompanies(): boolean {
  return getCompanyInfos().length > 1;
}
