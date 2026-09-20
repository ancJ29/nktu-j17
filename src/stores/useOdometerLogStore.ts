import type { OdometerLog } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createPartitionedRecordsStore } from './createPartitionedRecordsStore';

export const odometerLogBundle = createPartitionedRecordsStore<OdometerLog>({
  entity: 'odometer-logs',
  partitionLocate: 'explicit',
  uniqueField: 'extra.employeeId',

  cacheKey: 'odo1.7c3f92',
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE,

  defaultRangeDays: 31,
});
