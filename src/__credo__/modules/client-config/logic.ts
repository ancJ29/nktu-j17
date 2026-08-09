import { ValidationError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import type { ClientConfig, RegisterClientInput } from './types.js';
import type { DateTimeInput } from '@credo/kits/types';

export function validateRegisterInput(input: RegisterClientInput): void {
  const fields: Record<string, string> = {};

  if (!input.clientServiceCode?.trim()) {
    fields['clientServiceCode'] = 'clientServiceCode is required';
  }
  if (!input.clientName?.trim()) {
    fields['clientName'] = 'clientName is required';
  }
  if (!input.domains || input.domains.length === 0) {
    fields['domains'] = 'At least one domain is required';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Invalid client registration input', fields);
  }
}

export function checkDuplicateServiceCode(items: ClientConfig[], clientServiceCode: string): void {
  const exists = items.some((c) => c.clientServiceCode === clientServiceCode);
  if (exists) {
    throw new ValidationError('Duplicate clientServiceCode', {
      clientServiceCode: `clientServiceCode "${clientServiceCode}" already exists`,
    });
  }
}

export function buildClientConfig(input: RegisterClientInput, now: DateTimeInput): ClientConfig {
  return {
    clientServiceCode: input.clientServiceCode.trim(),
    clientName: input.clientName.trim(),
    description: input.description?.trim() ?? '',
    contactEmail: input.contactEmail?.trim() ?? '',
    domains: input.domains,
    isActive: true,
    extra: input.extra ?? {},
    createdAt: now,
    updatedAt: now,
    version: newVersion(),
  };
}
