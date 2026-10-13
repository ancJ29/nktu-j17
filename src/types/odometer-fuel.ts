import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';
import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type OdometerFuelPaymentExtra = {
  employeeId: string;

  employeeName: string;

  amount: number;
  note?: string;

  recordedByName?: string;

  isDeleted?: boolean;
  [key: string]: unknown;
};

export type OdometerFuelPayment = PartitionedRecordRow & {
  recordDate: string;
  createdAt: number;
  updatedAt: number;
  extra: OdometerFuelPaymentExtra;
};

export type OdometerFuelResetExtra = {
  fromDate: string;

  employeeId?: string;
  employeeName?: string;
  recordedByName?: string;
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type OdometerFuelReset = SingleRecordRow & {
  createdAt: number;
  updatedAt: number;
  extra: OdometerFuelResetExtra;
};
