import type { PartitionedRecordRow } from '@/stores/createPartitionedRecordsStore';
import type { CropDiaryEntry } from './crop-diary';

export type MaterialLine = {
  materialCode: string;
  quantity?: number;
  unit?: string;
};

export type SheetColumnKind =
  | 'ratio'
  /**
   * A daily activity that **consumes material** — the day-matrix sibling of
   * {@link PrepActivityKind}'s `'material'`. Mostly empty in a template (a
   * process cannot plan what condition the crop will be in); during the season
   * the operator writes what was done into the cell and logs the real material
   * lines against that day ({@link SheetDay.materials}).
   */
  | 'activity'
  /**
   * Free text — day notes, and the measurements (`EC`, `pH`): the client's
   * sheets write ranges (`1.8 – 2.0`) into those columns, which is prose
   * whatever a kind would claim.
   */
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

  materials?: Record<string, MaterialLine[]>;
};

export type PrepActivityKind =
  | 'work'
  /**
   * Consumes material — **which and how much is not knowable in advance.**
   * The client's rule: how much disinfectant a house needs depends on the state
   * that house is in on the day, so the process states *that* material is used
   * and the operator logs *what* they used when they do it. This is why the
   * plan carries no `materialCode` here, unlike a {@link SheetColumn}.
   */
  | 'material';

export type PlanPreparation = {
  dayOffset: number;

  label?: string;
  activity: string;

  kind?: PrepActivityKind;
};

export type PlanMemo = {
  key: string;
  value: string;
};

export type CropProcessPlan = {
  columns: SheetColumn[];
  stages: SheetStage[];

  totalDays: number;
  days: SheetDay[];

  referencePlantCount?: number;

  referenceAdjustmentRate?: number;

  preparation?: PlanPreparation[];

  target?: string;

  referenceSeedCount?: number;

  memos?: PlanMemo[];
};

export type CropColumnChoice = {
  materialCode?: string;
  unit?: string;
};

export type CropSheetExtra = {
  plan: CropProcessPlan;

  days: SheetDay[];

  templateCode?: string;

  adjustmentRate?: number;

  plantCount?: number;

  target?: string;
  seedCount?: number;

  memos?: PlanMemo[];

  columnMaterials?: Record<string, CropColumnChoice>;
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
