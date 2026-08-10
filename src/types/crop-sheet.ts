import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';
import type { CropDiaryEntry } from './crop-diary';

export type SheetColumnKind =
  | 'material'
  /** A rate **per plant** (water): the day's real total is rate × the crop's
   *  plant count, which is why it can't just be a `number`. */
  | 'perPlant'
  /** A plain measurement with no rollup — EC today, pH next. Summing it would
   *  be meaningless, which is the whole reason it isn't `material`. */
  | 'number'
  /** Free text — the spray and root-drench recipes, and the day note. Their
   *  embedded dose/mix basis is deliberately left unparsed (a non-goal). */
  | 'text';

export type SheetColumn = {
  key: string;
  kind: SheetColumnKind;

  label: string;

  materialCode?: string;
  unit?: string;

  group?: string;
};

export type SheetStage = {
  fromDay: number;

  toDay: number;
  name: string;
};

export type SheetDayValues = Record<string, number | string | undefined>;

export type SheetDay = {
  day: number;
  values: SheetDayValues;
};

export type PlanPreparation = {
  dayOffset: number;

  label?: string;
  activity: string;
};

export type CropProcessPlan = {
  columns: SheetColumn[];
  stages: SheetStage[];

  totalDays: number;
  days: SheetDay[];

  referencePlantCount?: number;

  referenceAdjustmentRate?: number;

  preparation?: PlanPreparation[];
};

export type CropSheetExtra = {
  plan: CropProcessPlan;

  days: SheetDay[];

  templateCode?: string;

  adjustmentRate?: number;

  plantCount?: number;
  [key: string]: unknown;
};

export type CropSheet = PartitionedRecordRow & {
  kind: 'sheet';

  cropId: string;
  cropCode?: string;
  createdAt: number;
  updatedAt: number;
  extra?: CropSheetExtra;
};

export type CropDiaryEvent = CropDiaryEntry & { kind?: 'event' };

export type CropDiaryRecord = CropSheet | CropDiaryEvent;
