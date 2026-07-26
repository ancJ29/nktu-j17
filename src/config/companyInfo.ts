import { appConfig } from './index';
import { isNKTU } from './client';

export type CompanyInfo = {
  name: string;
  address: string;
  taxCode: string;
  tel: string;
  email: string;
};

const FALLBACK_COMPANY_INFO: CompanyInfo = isNKTU
  ? {
      
      name: 'CÔNG TY TNHH NGŨ KIM TÂN UYÊN',
      address:
        'Số 49/6 Đường Nguyễn Công Trứ, Khu phố Đông A, Phường Đông Hòa, Thành phố Hồ Chí Minh, Việt Nam.',
      taxCode: '3703133520',
      tel: '0903 720 713 / 086 9922 992',
      email: 'congtytanuyen@gmail.com',
    }
  : {
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
