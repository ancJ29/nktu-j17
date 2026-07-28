import type { ZodType } from 'zod';

export type Stage = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTIONAL';

export const STAGES: readonly Stage[] = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'EXCEPTIONAL'];

export type Translatable = Record<string, string>;

export type CapabilityId = string;

export type CapabilityDefinition = {
  id: CapabilityId;
  label: Translatable;
  description: Translatable;

  allowedStages: Stage[];

  conflictsWith?: CapabilityId[];

  singleton?: boolean;

  optional?: boolean;

  configSchema?: ZodType;
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
  | { kind: 'transition-stage-backward'; from: string; to: string };
