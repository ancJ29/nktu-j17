import type { IconName } from '@credo/base-ui/components';

export type NavigationItem = {
  id: string;
  path?: string;

  labelKey?: string;
  label: string;
  icon: IconName;
  hidden?: boolean;
  navbar?: boolean;

  rootOnly?: boolean;

  hiddenForDepartments?: string[];
  visibleForEmployeeIds?: string[];
  subs?: NavigationItem[];
};

export type NavigationConfig = {
  pc: NavigationItem[];
  mobile: NavigationItem[];
};
