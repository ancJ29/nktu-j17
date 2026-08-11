import type { DateTimeInput } from '@credo/kits/types';
import type { CMngtOperationLog } from '@credo/connectors/types';

export type OperationLogPhoto = {
  url: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  fileName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isDeleted?: boolean;
};

export type OperationLogSharedExtra = {
  photos?: OperationLogPhoto[];
};

export type RefuelLogExtra = {
  litres?: number;

  unitPrice?: number;

  totalAmount?: number;

  odometerBefore?: number;

  odometer?: number;

  distanceKm?: number;

  driverName?: string;

  driverId?: string;

  fuelSource?: 'tank' | 'external';

  oilTankId?: string;
  oilTankCode?: string;

  note?: string;
  [key: string]: unknown;
};

export type MaintenanceItem = {
  name: string;

  unitPrice: number;

  quantity?: number;

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

  vatRate?: number;

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

  loadingAt?: string;
  unloadingAt?: string;

  customerName?: string;

  containerSize?: string;

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

export type GreenhouseMaintenanceLogExtra = {
  activity?: string;

  performedBy?: string;

  cost?: number;

  note?: string;
  [key: string]: unknown;
};

export type OilTankRefillLogExtra = {
  litres?: number;

  unitPrice?: number;

  totalAmount?: number;

  supplier?: string;

  note?: string;
  [key: string]: unknown;
};

export type OilTankIssueLogExtra = {
  litres?: number;

  unitPrice?: number;

  totalAmount?: number;

  truckId?: string;
  truckCode?: string;

  driverName?: string;

  sourceRefuelLogId?: string;

  note?: string;
  [key: string]: unknown;
};

export type OperationLogExtra = OperationLogSharedExtra &
  RefuelLogExtra &
  MaintenanceLogExtra &
  TripLogExtra &
  DriverTrainingLogExtra &
  GreenhouseMaintenanceLogExtra &
  OilTankRefillLogExtra &
  OilTankIssueLogExtra;

export type OperationLog = CMngtOperationLog<OperationLogExtra>;
