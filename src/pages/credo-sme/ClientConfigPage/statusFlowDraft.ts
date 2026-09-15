import type { StatusFlowConfig, StatusFlowTransition } from '@credo/connectors/status-flow';

export type StatusFlowDraftRow<Stage extends string> = {
  value: string;
  label: string;
  color: string;

  actionLabel: string;
  actionColor: string;
  stage: Stage;

  capabilities: string[];
};

export type StatusFlowDraftOf<Stage extends string> = {
  statuses: Array<StatusFlowDraftRow<Stage>>;
  initial: string;

  transitions: Record<string, string[]>;

  targetDepartments: Record<string, string[]>;
};

const matrixOfEdges = (edges: readonly StatusFlowTransition[]): Record<string, string[]> => {
  const matrix: Record<string, string[]> = {};
  for (const edge of edges) (matrix[edge.from] ??= []).push(edge.to);
  return matrix;
};

export const defaultStatusFlowDraftOf = <Stage extends string>(
  defaultFlow: StatusFlowConfig<Stage>,
): StatusFlowDraftOf<Stage> => ({
  statuses: defaultFlow.statuses.map((s) => ({
    value: s.value,
    label: '',
    color: '',
    actionLabel: '',
    actionColor: '',
    stage: s.stage,
    capabilities: [],
  })),
  initial: defaultFlow.initial,
  transitions: matrixOfEdges(defaultFlow.transitions),
  targetDepartments: {},
});

export const assembleStatusFlowDraft = <Stage extends string>(
  draft: StatusFlowDraftOf<Stage>,
): StatusFlowConfig<Stage> => ({
  statuses: draft.statuses.map((row) => ({
    value: row.value.trim(),
    stage: row.stage,
    ...(row.label.trim() !== '' ? { label: row.label.trim() } : {}),
    ...(row.color !== '' ? { color: row.color } : {}),
    ...(row.actionLabel.trim() !== '' ? { actionLabel: row.actionLabel.trim() } : {}),
    ...(row.actionColor !== '' ? { actionColor: row.actionColor } : {}),
    ...(row.capabilities.length > 0 ? { capabilities: [...row.capabilities] } : {}),
  })),
  initial: draft.initial,
  transitions: draft.statuses.flatMap((from) =>
    (draft.transitions[from.value] ?? [])
      .filter((to) => draft.statuses.some((s) => s.value === to))
      .map((to) => ({
        from: from.value,
        to,
        ...((draft.targetDepartments[to] ?? []).length > 0
          ? { onlyDepartments: [...draft.targetDepartments[to]!] }
          : {}),
      })),
  ),
});

export const readStatusFlowDraftOf = <Stage extends string>(
  raw: unknown,
): { draft: StatusFlowDraftOf<Stage> | null; unreadable: boolean; flattened: string[] } => {
  if (raw === undefined) return { draft: null, unreadable: false, flattened: [] };

  const shaped =
    raw !== null &&
    typeof raw === 'object' &&
    Array.isArray((raw as { statuses?: unknown }).statuses) &&
    Array.isArray((raw as { transitions?: unknown }).transitions);
  if (!shaped) return { draft: null, unreadable: true, flattened: [] };

  const flow = raw as StatusFlowConfig<Stage>;
  const targetDepartments: Record<string, string[]> = {};
  const flattened: string[] = [];
  for (const edge of flow.transitions) {
    const listed = edge.onlyDepartments ?? [];
    const known = targetDepartments[edge.to];
    if (known === undefined) {
      targetDepartments[edge.to] = [...listed];
    } else if (
      known.length !== listed.length ||
      listed.some((department) => !known.includes(department))
    ) {
      targetDepartments[edge.to] = [...new Set([...known, ...listed])];
      if (!flattened.includes(edge.to)) flattened.push(edge.to);
    }
  }
  for (const [target, list] of Object.entries(targetDepartments)) {
    if (list.length === 0) delete targetDepartments[target];
  }
  return {
    draft: {
      statuses: flow.statuses.map((s) => ({
        value: String(s.value ?? ''),
        label: typeof s.label === 'string' ? s.label : '',
        color: typeof s.color === 'string' ? s.color : '',
        actionLabel: typeof s.actionLabel === 'string' ? s.actionLabel : '',
        actionColor: typeof s.actionColor === 'string' ? s.actionColor : '',
        stage: s.stage,
        capabilities: Array.isArray(s.capabilities)
          ? s.capabilities.filter((id): id is string => typeof id === 'string')
          : [],
      })),
      initial: String(flow.initial ?? ''),
      transitions: matrixOfEdges(flow.transitions),
      targetDepartments,
    },
    unreadable: false,
    flattened,
  };
};
