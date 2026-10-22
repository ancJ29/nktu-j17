import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';
import type { MaterialLine, PrepActivityKind } from './crop-sheet';

export type CropDiaryExtra = {
  notes?: string;

  materials?: MaterialLine[];

  templateCode?: string;

  prepKind?: PrepActivityKind;

  completedDate?: string;
  [key: string]: unknown;
};

export type CropDiaryEntry = PartitionedRecordRow & {
  cropId: string;

  cropCode?: string;

  entryDate: string;

  activity: string;
  createdAt: number;
  updatedAt: number;
  extra?: CropDiaryExtra;
};
