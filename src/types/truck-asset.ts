import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type TruckInsurance = {
  company?: string;
  type?: string;
  
  expiry?: string;
};

export type RegistrationType = 'original' | 'copy';

export type TruckAssetExtra = {
  
  isDeleted?: boolean;

  
  notes?: string;

  
  copyFromId?: string;

  
  truckType?: string;

  
  plateNumber?: string; 
  makeModel?: string;
  model?: string;
  year?: number; 
  capacityTons?: number; 
  
  boxType?: string; 
  engineNumber?: string; 
  chassisNumber?: string; 
  
  boxLengthMm?: number;
  boxWidthMm?: number;
  boxHeightMm?: number;
  boxVolumeM3?: number; 
  tireSize?: string; 
  
  inspectionExpiry?: string; 
  badgeExpiry?: string; 
  
  
  registrationType?: RegistrationType;
  
  registrationCopyExpiry?: string; 
  
  registrationOriginalExpiry?: string;
  
  insurances?: TruckInsurance[];
  
  civilInsuranceExpiry?: string;
  
  civilInsuranceCompany?: string;
  
  otherInsuranceExpiry?: string;
  
  otherInsuranceCompany?: string;
  
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  licenseNumber?: string;
  licenseClass?: string;
  
  baseLocation?: string;
  region?: string;

  [key: string]: unknown;
};

export type TruckAssetRow = SingleRecordRow & {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  extra?: TruckAssetExtra;
};

export type TruckAssetCopyFrom = Pick<TruckAssetRow, 'name' | 'description'> &
  Pick<
    TruckAssetExtra,
    | 'truckType'
    | 'makeModel'
    | 'model'
    | 'year'
    | 'capacityTons'
    | 'boxType'
    | 'boxLengthMm'
    | 'boxWidthMm'
    | 'boxHeightMm'
    | 'boxVolumeM3'
    | 'tireSize'
    | 'baseLocation'
    | 'region'
    | 'notes'
  > & {
    
    copyFromId: string;
  };
