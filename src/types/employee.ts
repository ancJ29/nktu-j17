import type { PartialPermissions as CMngtPartialPermissions } from '@credo/kits/types';
import type { CMngtEmployee } from '@credo/connectors/types';

export type EmployeeExtra = {
  firstName?: string;
  lastName?: string;
  gender?: 'M' | 'F';
  isDeleted?: boolean;
  allowLogin?: boolean;
  phoneNumber?: string;
  personalPhoneNumber?: string;
  
  loginEmail?: string;
  loginPassword?: string;
  permissions?: CMngtPartialPermissions;
  permissionsVersion?: string;
  profileImage?: string;
  note?: string;

  
  
  startDate?: string;
  
  address?: string;
  
  dateOfBirth?: string;

  
  
  idCardNumber?: string;
  idCardIssueDate?: string; 
  idCardIssuePlace?: string;
  
  licenseNumber?: string;
  licenseClass?: string; 
  licenseIssueDate?: string; 
  licenseExpiry?: string; 
  licenseIssuePlace?: string;
  
  
  truckAssetId?: string;
  truckAssetCode?: string;

  [key: string]: unknown;
};

export type Employee = CMngtEmployee<EmployeeExtra>;
