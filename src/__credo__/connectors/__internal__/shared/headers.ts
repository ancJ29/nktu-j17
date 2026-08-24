import { isBrowser } from '@credo/kits/misc';
import { CONNECTOR_VERSION } from '../../version';
import { generateNonce } from './nonce';
import { replacePathParams } from './path';

let _browserAtImport: boolean | undefined;
const browserAtImport = (): boolean => (_browserAtImport ??= isBrowser());

export type StoragesShape = {
  callerService?: string | undefined;
  target?: string | undefined;
  internalAccessKey?: string | undefined;
  accessKey?: string | undefined;
  authToken?: string | undefined;

  deviceId?: string | undefined;
  adminKey?: string | undefined;
  superAdminAccessKey?: string | undefined;
  trustedServiceKey?: string | undefined;

  beforeRequest?: (() => Promise<unknown>) | undefined;
};

export type BuildHeadersOptions = {
  params?: Record<string, string> | undefined;
  withNonce?: boolean | undefined;
  nonceMethod?: string | undefined;
  noncePath?: string | undefined;
  accessKey?: string | undefined;
  accessKeyRequired?: boolean | undefined;
  adminKey?: string | undefined;
  adminKeyRequired?: boolean | undefined;
  trustedServiceKeyRequired?: boolean | undefined;
  internalAccessKeyRequired?: boolean | undefined;
  superAdminAccessKeyRequired?: boolean | undefined;
  noContentType?: boolean | undefined;
  storages?: StoragesShape | undefined;
};

export function buildHeaders({
  params,
  accessKey,
  accessKeyRequired = false,
  adminKey,
  adminKeyRequired = false,
  trustedServiceKeyRequired = false,
  internalAccessKeyRequired = false,
  superAdminAccessKeyRequired = false,
  noContentType = false,
  storages,
  withNonce = browserAtImport(),
  nonceMethod = '',
  noncePath = '',
}: BuildHeadersOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'x-connector-version': CONNECTOR_VERSION,
  };

  if (withNonce) {
    const timestamp = Date.now().toString();
    const resolvedNoncePath = params ? replacePathParams(noncePath, params) : noncePath;
    const nonce = generateNonce(
      timestamp,
      storages?.authToken ?? '',
      nonceMethod,
      resolvedNoncePath,
    );
    if (!nonce) {
      throw new Error('Failed to generate nonce');
    }
    headers['x-nonce'] = nonce;
    headers['x-timestamp'] = timestamp;
  }

  if (storages?.deviceId) {
    headers['x-device-id'] = storages.deviceId;
  }

  if (storages?.authToken) {
    headers['Authorization'] = `Bearer ${storages.authToken}`;
  }

  if (storages?.internalAccessKey) {
    headers['x-internal-access-key'] = storages.internalAccessKey;
    if (storages?.callerService) {
      headers['x-service'] = storages.callerService;
    }
  }

  if (storages?.target) {
    headers['x-target'] = storages.target;
  }

  if (storages?.superAdminAccessKey) {
    headers['x-super-admin-key'] = storages.superAdminAccessKey;
  }

  if (storages?.trustedServiceKey) {
    headers['x-trusted-service-key'] = storages.trustedServiceKey;
  }

  if (accessKey || storages?.accessKey) {
    headers['x-access-key'] = accessKey ?? storages?.accessKey ?? '';
  }

  if (adminKey || storages?.adminKey) {
    headers['x-admin-key'] = adminKey ?? storages?.adminKey ?? '';
  }

  if (accessKeyRequired && !headers['x-access-key']) {
    throw new Error('Access key is required');
  }
  if (adminKeyRequired && !headers['x-admin-key']) {
    throw new Error('Admin key is required');
  }
  if (trustedServiceKeyRequired && !headers['x-trusted-service-key']) {
    throw new Error('Trusted service key is required');
  }
  if (internalAccessKeyRequired && !headers['x-internal-access-key']) {
    throw new Error('Internal access key is required');
  }
  if (superAdminAccessKeyRequired && !headers['x-super-admin-key']) {
    throw new Error('Super admin access key is required');
  }

  if (!noContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export function buildHeadersWithRoute(
  options: BuildHeadersOptions & {
    route: { METHOD: string; PATH: string };
    prefix: string;
  },
): Record<string, string> {
  const { route, prefix, ...rest } = options;
  return buildHeaders({
    ...rest,
    nonceMethod: route.METHOD,
    noncePath: `${prefix}${route.PATH}`,
  });
}
