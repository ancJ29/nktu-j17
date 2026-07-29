export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'thisWeek'
  | 'nextWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'nextMonth'
  | 'custom';

export type DateRangeValue = {
  from: Date | null;
  to: Date | null;
  preset: DateRangePreset | null;
};

export const EMPTY_DATE_RANGE: DateRangeValue = { from: null, to: null, preset: null };

export type MoreFilterDateRange = {
  type: 'dateRange';
  key: string;
  title: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;

  customOnly?: boolean;
};

export type MoreFilterSelect = {
  type: 'select';
  key: string;
  title: string;
  placeholder?: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
};

export type MoreFilterSwitch = {
  type: 'switch';
  key: string;
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  color?: string;
};

export type MoreFilterDef = MoreFilterDateRange | MoreFilterSelect | MoreFilterSwitch;
