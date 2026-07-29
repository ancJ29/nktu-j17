import type { MobileFilterDef, MobileMultiFilterDef } from './MobileFilterBar';

const ALL = 'all';

type Option = { value: string; label: string };

type AllOptionFilterArgs<T extends string | null> = {
  title: string;
  value: T;
  options: readonly Option[];
  onChange: (value: T) => void;

  allLabel: string;

  emptyValue: T;
  visible?: boolean;
};

export function allOptionFilter<T extends string | null>({
  title,
  value,
  options,
  onChange,
  allLabel,
  emptyValue,
  visible,
}: AllOptionFilterArgs<T>): MobileFilterDef {
  return {
    title,
    value: value === emptyValue || value === null ? ALL : value,
    options: [{ value: ALL, label: allLabel }, ...options],
    onChange: (v) => onChange(v === ALL ? emptyValue : (v as T)),
    visible,
  };
}

type MultiOptionFilterArgs = {
  title: string;
  value: string[];
  options: readonly Option[];
  onChange: (value: string[]) => void;
  allLabel: string;

  displayValue: string;
  visible?: boolean;
};

export function multiOptionFilter({
  title,
  value,
  options,
  onChange,
  allLabel,
  displayValue,
  visible,
}: MultiOptionFilterArgs): MobileMultiFilterDef {
  return {
    title,
    displayValue,
    value,
    options: [{ value: ALL, label: allLabel }, ...options],
    onChange,
    visible,
    multi: true,
  };
}
