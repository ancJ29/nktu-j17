import type { ComponentType } from 'react';
import type { TablerIcon } from '@tabler/icons-react';

export interface ClientReportEntry {
  key: string;

  title: string;
  desc: string;
  icon: TablerIcon;
  color: string;
  Component: ComponentType<ReportViewProps>;
}

export interface ReportViewProps {
  param?: string;

  onParamChange: (param?: string) => void;
}
