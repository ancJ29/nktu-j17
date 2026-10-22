export type { CMngtModeRecordItem as ModeRecordItem } from '@credo/connectors/types';

export type PartitionLocate = 'creation:day' | 'creation:month' | 'creation:year' | 'explicit';

interface ModeRecordDescriptorBase {
  entity: string;

  keyPrefix: string;

  uniqueField?: string | readonly string[];
}

export interface SingleModeRecordDescriptor extends ModeRecordDescriptorBase {
  storageMode: 'single';

  masterDataMember?: boolean;
}

export interface PartitionedModeRecordDescriptor extends ModeRecordDescriptorBase {
  storageMode: 'partitioned';
  partitionLocate: PartitionLocate;
}

export type ModeRecordDescriptor = SingleModeRecordDescriptor | PartitionedModeRecordDescriptor;

export interface CreateModeRecordInput {
  item: Record<string, unknown>;

  expectedListHash?: string;
}

export interface UpdateModeRecordInput {
  version: string | undefined;

  patch: Record<string, unknown>;
  expectedListHash?: string;
}
