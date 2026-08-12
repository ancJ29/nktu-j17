import { appConfig } from './index';

export type CompanyInfo = {
  name: string;
  address: string;
  taxCode: string;
  tel: string;
  email: string;
};

const FALLBACK_COMPANY_INFO: CompanyInfo = {
  name: '',
  address: '',
  taxCode: '',
  tel: '',
  email: '',
};

export function getCompanyInfo(): CompanyInfo {
  const cfg = appConfig.companyInfo;
  return {
    name: cfg?.name?.trim() || FALLBACK_COMPANY_INFO.name,
    address: cfg?.address?.trim() || FALLBACK_COMPANY_INFO.address,
    taxCode: cfg?.taxCode?.trim() || FALLBACK_COMPANY_INFO.taxCode,
    tel: cfg?.tel?.trim() || FALLBACK_COMPANY_INFO.tel,
    email: cfg?.email?.trim() || FALLBACK_COMPANY_INFO.email,
  };
}
