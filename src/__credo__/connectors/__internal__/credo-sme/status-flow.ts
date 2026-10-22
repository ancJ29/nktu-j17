export type StatusFlowStatus<Stage extends string = string> = {
  value: string;

  stage: Stage;

  label?: string;

  color?: string;

  actionLabel?: string;

  actionColor?: string;

  capabilities?: string[];
};

export type StatusCapability<Stage extends string = string> = {
  id: string;

  stages: readonly Stage[];
};

export type StatusFlowTransition = {
  from: string;
  to: string;

  onlyDepartments?: string[];
};

export type StatusFlowConfig<Stage extends string = string> = {
  statuses: StatusFlowStatus<Stage>[];

  initial: string;
  transitions: StatusFlowTransition[];
};

export type StageCatalogue<Stage extends string = string> = {
  stages: readonly Stage[];

  initialStage: Stage;

  stageEdges: Readonly<Record<Stage, readonly Stage[]>>;

  capabilities?: readonly StatusCapability<Stage>[];
};

export type StatusFlowValidation = {
  errors: string[];

  warnings: string[];
};

export type TransitionDenial =
  'unknown-from' | 'unknown-to' | 'no-edge' | 'stage-edge' | 'department';

export type TransitionVerdict = { allowed: true } | { allowed: false; reason: TransitionDenial };

export type TransitionContext = {
  departmentId?: string;
};

export function statusOf<Stage extends string>(
  flow: StatusFlowConfig<Stage>,
  value: string,
): StatusFlowStatus<Stage> | undefined {
  return flow.statuses.find((s) => s.value === value);
}

export function statusHasCapability<Stage extends string>(
  flow: StatusFlowConfig<Stage>,
  value: string,
  capabilityId: string,
): boolean {
  return statusOf(flow, value)?.capabilities?.includes(capabilityId) === true;
}

export function canTransition<Stage extends string>(
  catalogue: StageCatalogue<Stage>,
  flow: StatusFlowConfig<Stage>,
  from: string,
  to: string,
  ctx: TransitionContext = {},
): TransitionVerdict {
  const fromStatus = statusOf(flow, from);
  if (!fromStatus) return { allowed: false, reason: 'unknown-from' };
  const toStatus = statusOf(flow, to);
  if (!toStatus) return { allowed: false, reason: 'unknown-to' };

  const edge = flow.transitions.find((t) => t.from === from && t.to === to);
  if (!edge) return { allowed: false, reason: 'no-edge' };

  if (!(catalogue.stageEdges[fromStatus.stage] ?? []).includes(toStatus.stage)) {
    return { allowed: false, reason: 'stage-edge' };
  }

  if (edge.onlyDepartments) {
    if (!ctx.departmentId || !edge.onlyDepartments.includes(ctx.departmentId)) {
      return { allowed: false, reason: 'department' };
    }
  }

  return { allowed: true };
}

export function transitionsFrom<Stage extends string>(
  catalogue: StageCatalogue<Stage>,
  flow: StatusFlowConfig<Stage>,
  from: string,
  ctx: TransitionContext = {},
): StatusFlowStatus<Stage>[] {
  const targets: StatusFlowStatus<Stage>[] = [];
  for (const t of flow.transitions) {
    if (t.from !== from) continue;
    if (!canTransition(catalogue, flow, from, t.to, ctx).allowed) continue;
    const target = statusOf(flow, t.to);
    if (target) targets.push(target);
  }
  return targets;
}

export function validateStatusFlow<Stage extends string>(
  catalogue: StageCatalogue<Stage>,
  flow: StatusFlowConfig<Stage>,
  knownDepartmentIds?: readonly string[],
): StatusFlowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (flow.statuses.length === 0) {
    errors.push('statuses: at least one status is required');
    return { errors, warnings };
  }

  const seen = new Set<string>();
  for (const s of flow.statuses) {
    if (!s.value) errors.push('statuses: a status has an empty value');
    if (seen.has(s.value)) errors.push(`statuses: duplicate value "${s.value}"`);
    seen.add(s.value);
    if (!catalogue.stages.includes(s.stage)) {
      errors.push(`statuses: "${s.value}" names unknown stage "${String(s.stage)}"`);
    }
    const carried = new Set<string>();
    for (const id of s.capabilities ?? []) {
      const capability = (catalogue.capabilities ?? []).find((c) => c.id === id);
      if (!capability) {
        errors.push(`statuses: "${s.value}" names unknown capability "${id}"`);
      } else if (!capability.stages.includes(s.stage)) {
        errors.push(
          `statuses: "${s.value}" cannot carry "${id}" in ${String(s.stage)}-stage (allowed: ${capability.stages.join(', ')})`,
        );
      }
      if (carried.has(id)) errors.push(`statuses: "${s.value}" carries "${id}" twice`);
      carried.add(id);
    }
  }

  const initial = statusOf(flow, flow.initial);
  if (!initial) {
    errors.push(`initial: "${flow.initial}" is not a defined status`);
  } else if (initial.stage !== catalogue.initialStage) {
    errors.push(
      `initial: "${flow.initial}" must be a ${catalogue.initialStage}-stage status, not ${String(initial.stage)}`,
    );
  } else if ((initial.capabilities ?? []).length > 0) {
    errors.push(`initial: "${flow.initial}" cannot carry a capability — nothing ever enters it`);
  }

  const seenEdges = new Set<string>();
  for (const t of flow.transitions) {
    const label = `transitions: ${t.from} -> ${t.to}`;
    const from = statusOf(flow, t.from);
    const to = statusOf(flow, t.to);
    if (!from) errors.push(`${label}: "${t.from}" is not a defined status`);
    if (!to) errors.push(`${label}: "${t.to}" is not a defined status`);
    if (!from || !to) continue;
    if (t.from === t.to) {
      errors.push(`${label}: a status cannot transition to itself`);
      continue;
    }

    const key = `${t.from}\u001f${t.to}`;
    if (seenEdges.has(key)) errors.push(`${label}: duplicate edge`);
    seenEdges.add(key);
    if (!(catalogue.stageEdges[from.stage] ?? []).includes(to.stage)) {
      errors.push(
        `${label}: a ${String(from.stage)}-stage status cannot transition to ${String(to.stage)}-stage`,
      );
    }
    if (t.onlyDepartments) {
      if (t.onlyDepartments.length === 0) {
        warnings.push(`${label}: empty onlyDepartments denies everyone`);
      } else if (knownDepartmentIds) {
        for (const d of t.onlyDepartments) {
          if (!knownDepartmentIds.includes(d)) {
            warnings.push(`${label}: unknown department "${d}"`);
          }
        }
      }
    }
  }

  if (errors.length === 0) {
    const reachable = new Set([flow.initial]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of flow.transitions) {
        if (reachable.has(t.from) && !reachable.has(t.to)) {
          reachable.add(t.to);
          grew = true;
        }
      }
    }
    for (const stage of catalogue.stages) {
      if (stage === catalogue.initialStage) continue;
      const hasReachable = flow.statuses.some((s) => s.stage === stage && reachable.has(s.value));
      if (!hasReachable)
        warnings.push(`no ${String(stage)}-stage status is reachable from initial`);
    }
  }

  return { errors, warnings };
}

export function resolveStatusFlow<Stage extends string>(
  catalogue: StageCatalogue<Stage>,
  defaultFlow: StatusFlowConfig<Stage>,
  raw: unknown,
): { flow: StatusFlowConfig<Stage>; errors: string[] } {
  if (raw === undefined) return { flow: defaultFlow, errors: [] };
  if (!isFlowShaped<Stage>(raw)) {
    return {
      flow: defaultFlow,
      errors: ['statusFlow must be an object with statuses, initial and transitions'],
    };
  }
  const { errors } = validateStatusFlow(catalogue, raw);
  return { flow: errors.length > 0 ? defaultFlow : raw, errors };
}

const isFlowShaped = <Stage extends string>(raw: unknown): raw is StatusFlowConfig<Stage> => {
  if (raw === null || typeof raw !== 'object') return false;
  const flow = raw as Record<string, unknown>;
  const rowsOf = (value: unknown): boolean =>
    Array.isArray(value) && value.every((row) => row !== null && typeof row === 'object');
  return (
    rowsOf(flow['statuses']) && typeof flow['initial'] === 'string' && rowsOf(flow['transitions'])
  );
};

export type GoodsReceiptStage = 'draft' | 'received' | 'cancelled';

export const GOODS_RECEIPT_STAGE_CATALOGUE: StageCatalogue<GoodsReceiptStage> = {
  stages: ['draft', 'received', 'cancelled'],
  initialStage: 'draft',
  stageEdges: {
    draft: ['draft', 'received', 'cancelled'],
    received: ['cancelled'],
    cancelled: [],
  },
};

export const GOODS_RECEIPT_STAGE_COLORS: Readonly<Record<GoodsReceiptStage, string>> = {
  draft: 'gray',
  received: 'green',
  cancelled: 'red',
};

export const GOODS_RECEIPT_DEFAULT_STATUS_FLOW: StatusFlowConfig<GoodsReceiptStage> = {
  statuses: [
    { value: 'draft', stage: 'draft' },
    { value: 'received', stage: 'received' },
    { value: 'cancelled', stage: 'cancelled' },
  ],
  initial: 'draft',
  transitions: [
    { from: 'draft', to: 'received' },
    { from: 'draft', to: 'cancelled' },
    { from: 'received', to: 'cancelled' },
  ],
};

export type SalesOrderStage = 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';

export const SALES_ORDER_LOCKS_STOCK = 'locksStock';

export const SALES_ORDER_STAGE_CATALOGUE: StageCatalogue<SalesOrderStage> = {
  stages: ['draft', 'confirmed', 'fulfilled', 'cancelled'],
  initialStage: 'draft',
  stageEdges: {
    draft: ['draft', 'confirmed', 'cancelled'],
    confirmed: ['confirmed', 'draft', 'fulfilled', 'cancelled'],
    fulfilled: [],
    cancelled: [],
  },

  capabilities: [{ id: SALES_ORDER_LOCKS_STOCK, stages: ['draft'] }],
};

export const SALES_ORDER_STAGE_COLORS: Readonly<Record<SalesOrderStage, string>> = {
  draft: 'gray',
  confirmed: 'blue',
  fulfilled: 'green',
  cancelled: 'red',
};

export const SALES_ORDER_DEFAULT_STATUS_FLOW: StatusFlowConfig<SalesOrderStage> = {
  statuses: [
    { value: 'draft', stage: 'draft' },
    { value: 'confirmed', stage: 'confirmed' },
    { value: 'fulfilled', stage: 'fulfilled' },
    { value: 'cancelled', stage: 'cancelled' },
  ],
  initial: 'draft',
  transitions: [
    { from: 'draft', to: 'confirmed' },
    { from: 'draft', to: 'cancelled' },
    { from: 'confirmed', to: 'draft' },
    { from: 'confirmed', to: 'fulfilled' },
    { from: 'confirmed', to: 'cancelled' },
  ],
};

export type DeliveryNoteStage = 'draft' | 'delivered' | 'cancelled';

export const DELIVERY_NOTE_DEDUCTS_STOCK = 'deductsStock';

export const DELIVERY_NOTE_STAGE_CATALOGUE: StageCatalogue<DeliveryNoteStage> = {
  stages: ['draft', 'delivered', 'cancelled'],
  initialStage: 'draft',
  stageEdges: {
    draft: ['draft', 'delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  },

  capabilities: [{ id: DELIVERY_NOTE_DEDUCTS_STOCK, stages: ['draft'] }],
};

export const DELIVERY_NOTE_STAGE_COLORS: Readonly<Record<DeliveryNoteStage, string>> = {
  draft: 'gray',
  delivered: 'green',
  cancelled: 'red',
};

export const DELIVERY_NOTE_DEFAULT_STATUS_FLOW: StatusFlowConfig<DeliveryNoteStage> = {
  statuses: [
    { value: 'draft', stage: 'draft' },
    { value: 'delivered', stage: 'delivered' },
    { value: 'cancelled', stage: 'cancelled' },
  ],
  initial: 'draft',
  transitions: [
    { from: 'draft', to: 'delivered' },
    { from: 'draft', to: 'cancelled' },
  ],
};
