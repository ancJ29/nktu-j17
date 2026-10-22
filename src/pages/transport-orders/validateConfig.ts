

import type { CMngtTransportOrderFeatures } from '@credo/kits/types';

export type TransportOrderConfigInvariantError =
  | { kind: 'no-statuses' }
  | { kind: 'empty-status-value' }
  | { kind: 'duplicate-status-value'; statusValue: string }
  | { kind: 'initial-missing' }
  | { kind: 'initial-duplicated'; statuses: string[] }
  | { kind: 'transition-unknown-status'; from: string; to: string }
  | { kind: 'terminal-has-transitions'; statusValue: string }
  | { kind: 'status-unreachable'; statusValue: string }
  | { kind: 'status-dead-end'; statusValue: string }
  | { kind: 'unknown-department-in-status'; statusValue: string; department: string };

export type TransportOrderValidationResult =
  { ok: true } | { ok: false; errors: TransportOrderConfigInvariantError[] };

export function validateTransportOrderConfig(
  features: CMngtTransportOrderFeatures,
  
  knownDepartments?: ReadonlySet<string>,
): TransportOrderValidationResult {
  if (!features.enabled) return { ok: true };

  const errors: TransportOrderConfigInvariantError[] = [];
  const statusOptions = features.statusOptions ?? [];
  const transitions = features.statusTransitions ?? {};

  if (statusOptions.length === 0) {
    
    return { ok: false, errors: [{ kind: 'no-statuses' }] };
  }

  const seen = new Set<string>();
  for (const opt of statusOptions) {
    if (!opt.value.trim()) {
      errors.push({ kind: 'empty-status-value' });
      continue;
    }
    if (seen.has(opt.value))
      errors.push({ kind: 'duplicate-status-value', statusValue: opt.value });
    seen.add(opt.value);

    for (const dept of opt.allowedDepartments ?? []) {
      if (knownDepartments && !knownDepartments.has(dept)) {
        errors.push({
          kind: 'unknown-department-in-status',
          statusValue: opt.value,
          department: dept,
        });
      }
    }
  }

  
  const initials = statusOptions.filter((o) => o.isInitial);
  if (initials.length === 0) errors.push({ kind: 'initial-missing' });
  else if (initials.length > 1) {
    errors.push({ kind: 'initial-duplicated', statuses: initials.map((o) => o.value) });
  }

  
  
  for (const [from, tos] of Object.entries(transitions)) {
    const fromKnown = seen.has(from);
    for (const to of tos) {
      if (!fromKnown || !seen.has(to)) errors.push({ kind: 'transition-unknown-status', from, to });
    }
  }

  
  const reachable = new Set<string>();
  for (const tos of Object.values(transitions)) for (const to of tos) reachable.add(to);

  for (const opt of statusOptions) {
    if (!opt.value.trim()) continue;
    const outbound = (transitions[opt.value] ?? []).length > 0;
    const closed = !!opt.terminal || !!opt.locked;

    
    
    if (closed && outbound) {
      errors.push({ kind: 'terminal-has-transitions', statusValue: opt.value });
    }
    
    if (!opt.isInitial && !reachable.has(opt.value)) {
      errors.push({ kind: 'status-unreachable', statusValue: opt.value });
    }
    
    if (!closed && !outbound) {
      errors.push({ kind: 'status-dead-end', statusValue: opt.value });
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function formatTransportOrderInvariantError(
  err: TransportOrderConfigInvariantError,
): string {
  switch (err.kind) {
    case 'no-statuses':
      return 'Transport orders are enabled but have no statuses configured.';
    case 'empty-status-value':
      return 'A status has an empty value. Every status needs a stable key (e.g. "in_transit").';
    case 'duplicate-status-value':
      return `Status "${err.statusValue}" is defined more than once.`;
    case 'initial-missing':
      return 'No status is marked Initial — new orders would have nowhere to start.';
    case 'initial-duplicated':
      return `More than one status is marked Initial (${err.statuses.join(', ')}). Exactly one is allowed.`;
    case 'transition-unknown-status':
      return `Transition ${err.from} → ${err.to}: unknown status (renamed or deleted?).`;
    case 'terminal-has-transitions':
      return `Status "${err.statusValue}" is Terminal/Locked but has outgoing transitions — they can never fire.`;
    case 'status-unreachable':
      return `Status "${err.statusValue}" is unreachable: nothing transitions into it and it isn't the Initial status.`;
    case 'status-dead-end':
      return `Status "${err.statusValue}" is a dead end: no outgoing transitions, and it isn't marked Terminal. Orders would be stuck there.`;
    case 'unknown-department-in-status':
      return `Status "${err.statusValue}": allowed department "${err.department}" doesn't exist (configure it under Employees → Department options, or remove it).`;
  }
}
