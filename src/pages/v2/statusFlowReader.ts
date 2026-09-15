import {
  canTransition,
  resolveStatusFlow,
  statusOf,
  transitionsFrom,
  type StageCatalogue,
  type StatusFlowConfig,
  type StatusFlowStatus,
} from '@credo/connectors/status-flow';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Translate } from '@/pages/v2/master-data/spec';

export const useCurrentDepartment = (): string =>
  useAuthStore((s) => s.user?.myInformation?.department ?? '');

export type StatusFlowReader<Stage extends string> = {
  flow: StatusFlowConfig<Stage>;

  errors: string[];

  stageOf: (status: string) => Stage | undefined;

  display: (t: Translate, value: string) => { label: string; color: string };

  action: (t: Translate, value: string) => { label: string; color: string };

  targetsFrom: (from: string, departmentId: string) => Array<StatusFlowStatus<Stage>>;

  departmentsOwningNext: (from: string, departmentId: string) => string[];

  isTerminalStage: (status: string) => boolean;

  defaultListStatuses: string[];
};

export function createStatusFlowReader<Stage extends string>(spec: {
  catalogue: StageCatalogue<Stage>;
  defaultFlow: StatusFlowConfig<Stage>;

  raw: unknown;

  defaultLabelOf: (t: Translate, value: string) => string | undefined;

  stageColors: Readonly<Record<Stage, string>>;

  storedDefaultListStatuses?: readonly string[] | undefined;
}): StatusFlowReader<Stage> {
  const { flow, errors } = resolveStatusFlow(spec.catalogue, spec.defaultFlow, spec.raw);

  const display = (t: Translate, value: string) => {
    const status = statusOf(flow, value);
    return {
      label: status?.label ?? spec.defaultLabelOf(t, value) ?? value,
      color: status?.color ?? (status ? spec.stageColors[status.stage] : 'gray'),
    };
  };

  return {
    flow,
    errors,
    stageOf: (status) => statusOf(flow, status)?.stage,
    display,

    action: (t, value) => {
      const status = statusOf(flow, value);
      const badge = display(t, value);
      return {
        label: status?.actionLabel ?? badge.label,
        color: status?.actionColor ?? badge.color,
      };
    },

    targetsFrom: (from, departmentId) =>
      errors.length > 0
        ? []
        : transitionsFrom(spec.catalogue, flow, from, departmentId ? { departmentId } : {}),

    departmentsOwningNext: (from, departmentId) => {
      if (errors.length > 0) return [];
      const owners = new Set<string>();
      for (const edge of flow.transitions) {
        if (edge.from !== from) continue;
        const verdict = canTransition(
          spec.catalogue,
          flow,
          from,
          edge.to,
          departmentId ? { departmentId } : {},
        );

        if (verdict.allowed) return [];
        if (verdict.reason !== 'department') continue;
        for (const department of edge.onlyDepartments ?? []) owners.add(department);
      }
      return [...owners];
    },

    isTerminalStage: (status) => {
      const stage = statusOf(flow, status)?.stage;

      return stage === undefined ? false : (spec.catalogue.stageEdges[stage] ?? []).length === 0;
    },

    defaultListStatuses: (spec.storedDefaultListStatuses ?? []).filter((value) =>
      flow.statuses.some((status) => status.value === value),
    ),
  };
}
