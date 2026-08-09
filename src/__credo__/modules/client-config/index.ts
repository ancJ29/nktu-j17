import type { StorageAdapter } from '../core/types.js';
import {
  buildKey,
  loadItems,
  loadEnvelope,
  saveItems,
  checkListVersion,
} from '../core/record-helpers.js';
import { NotFoundError, VersionConflictError } from '../core/errors.js';
import { newVersion } from '@credo/kits/string';
import { validateRegisterInput, checkDuplicateServiceCode, buildClientConfig } from './logic.js';
import type { ClientConfig, RegisterClientInput, UpdateClientInput } from './types.js';

export type { ClientConfig, RegisterClientInput, UpdateClientInput } from './types.js';

export interface ClientConfigModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

function findClientConfigWithVersionCheck(
  items: ClientConfig[],
  clientServiceCode: string,
  expectedVersion: string | undefined,
): { item: ClientConfig; index: number } {
  const index = items.findIndex((c) => c.clientServiceCode === clientServiceCode);
  if (index === -1) {
    throw new NotFoundError('ClientConfig', clientServiceCode);
  }
  const item = items[index]!;
  if (item.version !== expectedVersion) {
    throw new VersionConflictError('ClientConfig', clientServiceCode, item);
  }
  return { item, index };
}

export function createClientConfigModule(config: ClientConfigModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'client-configs' } = config;

  function key(scope: string): string {
    return buildKey(keyPrefix, scope);
  }

  async function load(scope: string): Promise<ClientConfig[]> {
    return loadItems<ClientConfig>(storage, serviceCode, key(scope));
  }

  async function save(scope: string, items: ClientConfig[]): Promise<void> {
    return saveItems(storage, serviceCode, key(scope), items);
  }

  return {
    async getAll(scope: string): Promise<ClientConfig[]> {
      return load(scope);
    },

    async getCurrentHash(scope: string): Promise<string | undefined> {
      const envelope = await loadEnvelope<ClientConfig>(storage, serviceCode, key(scope));
      return envelope.meta.hash;
    },

    async getByServiceCode(scope: string, clientServiceCode: string): Promise<ClientConfig | null> {
      const items = await load(scope);
      return items.find((c) => c.clientServiceCode === clientServiceCode) ?? null;
    },

    async register(scope: string, input: RegisterClientInput): Promise<ClientConfig> {
      validateRegisterInput(input);
      const envelope = await loadEnvelope<ClientConfig>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'ClientConfig');
      checkDuplicateServiceCode(envelope.items, input.clientServiceCode);

      const now = Date.now();
      const clientConfig = buildClientConfig(input, now);
      envelope.items.push(clientConfig);
      await save(scope, envelope.items);
      return clientConfig;
    },

    async enable(
      scope: string,
      clientServiceCode: string,
      expectedVersion: string | undefined,
      expectedListHash: string | undefined,
    ): Promise<ClientConfig> {
      const envelope = await loadEnvelope<ClientConfig>(storage, serviceCode, key(scope));
      checkListVersion(envelope, expectedListHash, 'ClientConfig');

      const { item, index } = findClientConfigWithVersionCheck(
        envelope.items,
        clientServiceCode,
        expectedVersion,
      );

      const now = Date.now();
      const updated: ClientConfig = {
        ...item,
        isActive: true,
        updatedAt: now,
        version: newVersion(),
      };
      envelope.items[index] = updated;
      await save(scope, envelope.items);
      return updated;
    },

    async disable(
      scope: string,
      clientServiceCode: string,
      expectedVersion: string | undefined,
      expectedListHash: string | undefined,
    ): Promise<ClientConfig> {
      const envelope = await loadEnvelope<ClientConfig>(storage, serviceCode, key(scope));
      checkListVersion(envelope, expectedListHash, 'ClientConfig');

      const { item, index } = findClientConfigWithVersionCheck(
        envelope.items,
        clientServiceCode,
        expectedVersion,
      );

      const now = Date.now();
      const updated: ClientConfig = {
        ...item,
        isActive: false,
        updatedAt: now,
        version: newVersion(),
      };
      envelope.items[index] = updated;
      await save(scope, envelope.items);
      return updated;
    },

    async remove(
      scope: string,
      clientServiceCode: string,
      expectedVersion: string | undefined,
      expectedListHash: string | undefined,
    ): Promise<void> {
      const envelope = await loadEnvelope<ClientConfig>(storage, serviceCode, key(scope));
      checkListVersion(envelope, expectedListHash, 'ClientConfig');

      const { index } = findClientConfigWithVersionCheck(
        envelope.items,
        clientServiceCode,
        expectedVersion,
      );
      envelope.items.splice(index, 1);
      await save(scope, envelope.items);
    },

    async update(
      scope: string,
      clientServiceCode: string,
      input: UpdateClientInput,
    ): Promise<ClientConfig> {
      const envelope = await loadEnvelope<ClientConfig>(storage, serviceCode, key(scope));
      checkListVersion(envelope, input.expectedListHash, 'ClientConfig');

      const { item, index } = findClientConfigWithVersionCheck(
        envelope.items,
        clientServiceCode,
        input.version,
      );

      const now = Date.now();
      const updated: ClientConfig = {
        ...item,
        ...(input.clientName !== undefined && { clientName: input.clientName }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        ...(input.domains !== undefined && { domains: input.domains }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.extra !== undefined && { extra: input.extra }),
        updatedAt: now,
        version: newVersion(),
      };
      envelope.items[index] = updated;
      await save(scope, envelope.items);
      return updated;
    },
  };
}
