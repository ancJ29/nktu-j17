

import type { ZodType } from 'zod';
import type { Product, ProductInventoryRow, SalesOrder } from '@/types';
import type { PlannedOp, PlanFailure } from '@/utils/inventoryReservation';

export type Stage = 'DRAFT' | 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTIONAL';

export const STAGES: readonly Stage[] = ['DRAFT', 'NEW', 'IN_PROGRESS', 'COMPLETED', 'EXCEPTIONAL'];

export type Translatable = Record<string, string>;

export type CapabilityId = string;

export type HandlerId = string;

export type CapabilityDefinition = {
  id: CapabilityId;
  label: Translatable;
  description: Translatable;
  
  allowedStages: Stage[];
  
  requires?: CapabilityId[];
  
  conflictsWith?: CapabilityId[];
  
  supersedes?: CapabilityId[];
  
  priority?: number;
  
  singleton?: boolean;
  
  optional?: boolean;
  
  configSchema?: ZodType;
  
  onEnter?: HandlerId;
};

export type StatusCapabilityBinding = {
  id: CapabilityId;
  config?: unknown;
};

export type ConfigInvariantError =
  | { kind: 'unknown-capability'; statusValue: string; capabilityId: string }
  | { kind: 'cap-stage-mismatch'; statusValue: string; capabilityId: string; stage: Stage }
  | { kind: 'cap-conflict'; statusValue: string; capabilityId: string; conflicts: string[] }
  | { kind: 'singleton-missing'; capabilityId: string }
  | { kind: 'singleton-duplicated'; capabilityId: string; statuses: string[] }
  | { kind: 'transition-unknown-status'; from: string; to: string }
  | { kind: 'transition-stage-backward'; from: string; to: string }
  | { kind: 'unknown-department-in-status'; statusValue: string; department: string };

export type HandlerContext = {
  order: SalesOrder;
  binding: StatusCapabilityBinding;
  actor: { id: string; name: string } | undefined;
  productsByCode: Map<string, Product>;
  inventoryByProduct: Map<string, ProductInventoryRow[]>;
};

export type HandlerPlanResult =
  | {
      ok: true;
      inventoryOps: PlannedOp[];
    }
  | { ok: false; failures: PlanFailure[] };

export type Handler = {
  
  id: HandlerId;
  plan(ctx: HandlerContext): HandlerPlanResult;
};
