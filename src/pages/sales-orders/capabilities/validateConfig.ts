import type { CMngtSalesOrderFeatures, CMngtSalesOrderStatusOption } from '@credo/kits/types';
import { CAPABILITY_REGISTRY } from './registry';
import type { ConfigInvariantError, Stage } from './types';

const STAGE_ORDER: Record<Exclude<Stage, 'EXCEPTIONAL'>, number> = {
  DRAFT: 0,
  NEW: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
};

export type ValidationResult = { ok: true } | { ok: false; errors: ConfigInvariantError[] };

export function validateSalesOrderConfig(
  features: CMngtSalesOrderFeatures,

  knownDepartments?: ReadonlySet<string>,
): ValidationResult {
  if (!features.enabled) return { ok: true };

  const errors: ConfigInvariantError[] = [];
  const statusOptions = features.statusOptions ?? [];
  const transitions = features.statusTransitions ?? {};
  const statusByValue = new Map<string, CMngtSalesOrderStatusOption>();
  for (const opt of statusOptions) statusByValue.set(opt.value, opt);

  if (knownDepartments) {
    for (const opt of statusOptions) {
      const deps = opt.allowedDepartments ?? [];
      for (const dept of deps) {
        if (!knownDepartments.has(dept)) {
          errors.push({
            kind: 'unknown-department-in-status',
            statusValue: opt.value,
            department: dept,
          });
        }
      }
    }
  }

  for (const opt of statusOptions) {
    const seen = new Set<string>();
    for (const binding of opt.capabilities ?? []) {
      const def = CAPABILITY_REGISTRY[binding.id];
      if (!def) {
        errors.push({
          kind: 'unknown-capability',
          statusValue: opt.value,
          capabilityId: binding.id,
        });
        continue;
      }
      if (!def.allowedStages.includes(opt.stage as Stage)) {
        errors.push({
          kind: 'cap-stage-mismatch',
          statusValue: opt.value,
          capabilityId: binding.id,
          stage: opt.stage as Stage,
        });
      }
      const conflicts = (def.conflictsWith ?? []).filter((id) => seen.has(id));
      if (conflicts.length > 0) {
        errors.push({
          kind: 'cap-conflict',
          statusValue: opt.value,
          capabilityId: binding.id,
          conflicts,
        });
      }
      seen.add(binding.id);
    }
  }

  for (const def of Object.values(CAPABILITY_REGISTRY)) {
    if (!def.singleton) continue;
    const carriers = statusOptions.filter((opt) =>
      (opt.capabilities ?? []).some((b) => b.id === def.id),
    );
    if (carriers.length === 0) {
      if (def.optional) continue;
      errors.push({ kind: 'singleton-missing', capabilityId: def.id });
    } else if (carriers.length > 1) {
      errors.push({
        kind: 'singleton-duplicated',
        capabilityId: def.id,
        statuses: carriers.map((c) => c.value),
      });
    }
  }

  for (const [from, tos] of Object.entries(transitions)) {
    const fromOpt = statusByValue.get(from);
    if (!fromOpt) {
      for (const to of tos) {
        errors.push({ kind: 'transition-unknown-status', from, to });
      }
      continue;
    }
    for (const to of tos) {
      const toOpt = statusByValue.get(to);
      if (!toOpt) {
        errors.push({ kind: 'transition-unknown-status', from, to });
        continue;
      }
      const fromStage = fromOpt.stage as Stage;
      const toStage = toOpt.stage as Stage;
      if (toStage === 'EXCEPTIONAL') continue;
      if (fromStage === 'EXCEPTIONAL') {
        errors.push({ kind: 'transition-stage-backward', from, to });
        continue;
      }

      if (toStage === 'DRAFT' && fromStage !== 'COMPLETED') continue;
      if (STAGE_ORDER[toStage] < STAGE_ORDER[fromStage]) {
        errors.push({ kind: 'transition-stage-backward', from, to });
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function formatInvariantError(err: ConfigInvariantError): string {
  switch (err.kind) {
    case 'unknown-capability':
      return `Status "${err.statusValue}": unknown capability "${err.capabilityId}".`;
    case 'cap-stage-mismatch':
      return `Status "${err.statusValue}": capability "${err.capabilityId}" is not allowed in stage ${err.stage}.`;
    case 'cap-conflict':
      return `Status "${err.statusValue}": capability "${err.capabilityId}" conflicts with ${err.conflicts.join(', ')}.`;
    case 'singleton-missing':
      return `Capability "${err.capabilityId}" must be set on exactly one status.`;
    case 'singleton-duplicated':
      return `Capability "${err.capabilityId}" is set on multiple statuses (${err.statuses.join(', ')}). Only one is allowed.`;
    case 'transition-unknown-status':
      return `Transition ${err.from} → ${err.to}: unknown status.`;
    case 'transition-stage-backward':
      return `Transition ${err.from} → ${err.to}: would move backward through stages.`;
    case 'unknown-department-in-status':
      return `Status "${err.statusValue}": allowed department "${err.department}" doesn't exist (configure it under Employees → Department options or remove it from this status).`;
  }
}
