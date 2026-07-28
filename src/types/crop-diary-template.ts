import type { SingleRecordRow } from '@/stores/createSingleRecordsStore';

export type CropDiaryTemplateStep = { activity: string; defaultNotes?: string };

export type TemplateMaterialLine = {
  materialCode: string;
  quantity?: number;
  unit?: string;
};

export type TemplateDay = {
  day: number;
  activity: string;
  materials: TemplateMaterialLine[];
  memo?: string;
};

export type CropDiaryTemplateExtra = {
  description?: string;

  totalDates?: number;

  days?: TemplateDay[];

  isDeleted?: boolean;
  [key: string]: unknown;
};

export type CropDiaryTemplate = SingleRecordRow & {
  code: string;
  name: string;
  steps: CropDiaryTemplateStep[];
  createdAt: number;
  updatedAt: number;
  extra?: CropDiaryTemplateExtra;
};
