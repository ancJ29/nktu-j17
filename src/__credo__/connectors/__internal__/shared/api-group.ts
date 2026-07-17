import { callApi } from './call-api';
import { buildHeadersWithRoute, type BuildHeadersOptions, type StoragesShape } from './headers';

type Route = { PATH: string; METHOD: string };

type HeaderOptions = Omit<BuildHeadersOptions, 'route' | 'prefix' | 'nonceMethod' | 'noncePath'>;

export type ApiCallOptions = HeaderOptions & {
  params?: Record<string, string | undefined>;
  queryParams?: Record<string, string> | undefined;
  body?: unknown;
  extraHeaders?: Record<string, string>;
};

export type ApiGroupConfig = {
  storages?: StoragesShape | undefined;
  prefix: string;
  getBaseUrl: () => string | undefined;
  defaults?: Omit<HeaderOptions, 'storages'> | undefined;
};

export function createApiGroup(config: ApiGroupConfig) {
  return function api<T>(route: Route, opts?: ApiCallOptions): Promise<T> {
    const {
      params,
      queryParams,
      body,
      extraHeaders,
      storages: callStorages,
      ...headerOpts
    } = opts ?? {};

    const headers = {
      ...buildHeadersWithRoute({
        ...config.defaults,
        ...headerOpts,
        params: params as Record<string, string> | undefined,
        storages: callStorages !== undefined ? callStorages : config.storages,
        route,
        prefix: config.prefix,
      }),
      ...extraHeaders,
    };

    return callApi<T>(`${config.getBaseUrl()}${config.prefix}${route.PATH}`, {
      method: route.METHOD,
      params,
      queryParams,
      headers,
      body: body !== undefined ? JSON.stringify(body) : null,
    });
  };
}
