import { isNKTU } from './client';

export type CompanyInfo = {
  name: string;
  address: string;
  taxCode: string;
  tel: string;
  email: string;
};

export const COMPANY_INFO: CompanyInfo = isNKTU
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
