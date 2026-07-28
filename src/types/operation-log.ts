import type { CMngtOperationLog } from '@credo/connectors/types';

export type OperationLogType = 'refuel' | 'maintenance' | 'trip' | 'driver-training';

export type RefuelLogExtra = {
  litres?: number;

  unitPrice?: number;

  totalAmount?: number;

  odometerBefore?: number;

  odometer?: number;

  distanceKm?: number;

  driverName?: string;

  driverId?: string;

  note?: string;
  [key: string]: unknown;
};

export type MaintenanceItem = {
  name: string;

  unitPrice: number;

  warrantyMonths?: number;
};

export type MaintenanceLogExtra = {
  maintenanceType?: string;
  maintenanceTypeLabel?: string;

  supplier?: string;

  items?: MaintenanceItem[];

  item?: string;

  condition?: string;

  odometer?: number;

  unitPrice?: number;

  quantity?: number;

  totalAmount?: number;

  laborCost?: number;

  grandTotal?: number;

  accountsReceived?: number;

  cost?: number;

  note?: string;
  [key: string]: unknown;
};

export type TripLogExtra = {
  transportOrderId?: string;
  transportOrderNumber?: string;

  tripIndex?: number;

  destination?: string;

  odometer?: number;

  driverName?: string;

  driverId?: string;

  note?: string;
  [key: string]: unknown;
};

export type DriverTrainingLogExtra = {
  course?: string;

  trainer?: string;

  result?: string;

  note?: string;
  [key: string]: unknown;
};

export type OperationLogExtra = RefuelLogExtra &
  MaintenanceLogExtra &
  TripLogExtra &
  DriverTrainingLogExtra;

export type OperationLog = CMngtOperationLog<OperationLogExtra>;
