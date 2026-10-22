import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';
import type { CropProcessPlan } from './crop-sheet';

export type CropDiaryTemplateExtra = {
  description?: string;

  plan?: CropProcessPlan;

  isDeleted?: boolean;

  copyFromId?: string;
  [key: string]: unknown;
};

export type CropDiaryTemplate = SingleRecordRow & {
  code: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  extra?: CropDiaryTemplateExtra;
};

export type CropDiaryTemplateCopyFrom = Pick<CropDiaryTemplate, 'name'> & {
  description?: string;
  plan: CropProcessPlan;

  sourceId: string;

  sourceCode: string;
};
