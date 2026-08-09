import { decode, encode } from '@msgpack/msgpack';
import { hashString, scrambleBytes } from '@credo/kits/crypt';
import { compareEnvVar, getEnvVar, isBrowser, isDebugMode, isLocalhost } from '@credo/kits/misc';

import { clearCredoConnectorTrustedKey, getCredoConnectorTrustedKey } from './trusted-key';
import { cleanObj } from '@credo/kits/object';

import { CallApiError } from './errors';
import { replacePathParams } from './path';
import { trace, traceError } from './trace';
import {
  getEncodingMode,
  getStagePrefix,
  getTransportMode,
  getVrxToken,
  setEncodingMode,
  setVrxToken,
} from './transport-state';

const MSGPACK_CONTENT_TYPE = 'application/x-msgpack';
const ENCODING_HEADER = 'x-content-encoding';
const TUNNEL_PATH = '/api/request';
const TRACE_ALL_HASH = '401ca089009b';
const DEFAULT_MODE: 'json' | 'msgpack' = 'msgpack';
const MAX_RETRIES = 3;

let _isBrowser: boolean | undefined;
let _isDebug: boolean | undefined;
let _isLocal: boolean | undefined;
const IS_BROWSER = () => (_isBrowser ??= isBrowser());
const IS_DEBUG = () => (_isDebug ??= isDebugMode());
const IS_LOCAL = () => (_isLocal ??= isLocalhost());

type Mode = 'tunnel' | 'body-encode' | 'plain';

export type CallApiOptions = RequestInit & {
  params?: Record<string, string | undefined> | undefined;
  queryParams?: Record<string, string> | undefined;

  timeoutMs?: number | null | undefined;
};

const DEFAULT_BROWSER_TIMEOUT_MS = 45_000;

let defaultTimeoutMs: number | null | undefined;

export function setDefaultRequestTimeout(ms: number | null): void {
  defaultTimeoutMs = ms;
}

function getDefaultRequestTimeout(): number | null {
  if (defaultTimeoutMs !== undefined) return defaultTimeoutMs;

  return IS_BROWSER() ? DEFAULT_BROWSER_TIMEOUT_MS : null;
}

export async function callApi<T>(url: string, opts: CallApiOptions): Promise<T> {
  const { params, queryParams, timeoutMs, ...init } = opts;

  let resolvedUrl = url;
  if (params) {
    const cleaned = cleanObj(params) as Record<string, string>;
    resolvedUrl = replacePathParams(resolvedUrl, cleaned);
  }
  if (queryParams) {
    const qs = new URLSearchParams(queryParams).toString();
    resolvedUrl = resolvedUrl.includes('?') ? `${resolvedUrl}&${qs}` : `${resolvedUrl}?${qs}`;
  }

  return runWithRetry<T>(resolvedUrl, init, timeoutMs);
}

async function runWithRetry<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number | null | undefined,
): Promise<T> {
  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    const result = await runOnce<T>(url, init, timeoutMs);
    if (result.kind === 'ok') return result.value;
    if (result.kind === 'retry') {
      attempt++;
      continue;
    }
    throw result.error;
  }
  throw new Error('Max retries reached');
}

type OnceResult<T> =
  { kind: 'ok'; value: T } | { kind: 'retry' } | { kind: 'throw'; error: unknown };

async function runOnce<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number | null | undefined,
): Promise<OnceResult<T>> {
  if (init.method !== 'GET' && !init.body) {
    init.body = '{}';
  }

  const parsed = new URL(url);
  const origin = parsed.origin;
  const headers = (init.headers ?? {}) as Record<string, string>;
  init.headers = headers;

  const target = headers['x-target'];

  attachCachedVrxIfAuthed(headers, origin, target);

  let mode = selectMode(origin, headers);
  if (mode === 'tunnel') {
    const trustedKey = getCredoConnectorTrustedKey();
    if (trustedKey) {
      headers['x-trusted-service-key'] = trustedKey;
      trace('[callApi] trustedKey short-circuit, sending plain', { trustedKey });
      mode = 'plain';
    }
  }

  const built = buildRequest(mode, url, init, parsed, headers);
  const traceCtx = configureTrace(mode === 'tunnel', parsed.pathname, built.url);
  built.url = traceCtx.url;

  const budget = timeoutMs !== undefined ? timeoutMs : getDefaultRequestTimeout();
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (budget && budget > 0 && !built.init.signal && typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), budget);
    built.init.signal = controller.signal;
  }

  trace('[callApi] dispatch', {
    mode,
    fetchUrl: built.url,
    fetchOptions: built.init,
  });

  try {
    let response: Response;
    try {
      response = await fetch(built.url, built.init);
    } catch (error) {
      if (traceCtx.enabled) traceError('[callApi] fetch error', error);
      return { kind: 'throw', error };
    }

    recordServerEncoding(response, origin, target);
    recordVrxToken(response, origin, target);

    if (
      response.status === 406 &&
      response.headers.get(ENCODING_HEADER) === 'msgpack' &&
      mode === 'plain'
    ) {
      if (headers['x-trusted-service-key']) {
        clearCredoConnectorTrustedKey();
      }
      delete headers['x-trusted-service-key'];
      return { kind: 'retry' };
    }

    if (!response.ok) {
      const payload = await safeDecodeErrorPayload(response);
      if (traceCtx.enabled) {
        traceError('[callApi] HTTP error', {
          url,
          fetchUrl: built.url,
          status: response.status,
          payload,
        });
      }
      return { kind: 'throw', error: new CallApiError(response.status, payload) };
    }

    const value = await decodeOkResponse<T>(response);
    if (traceCtx.enabled) trace('[callApi] response', { url, response: value });
    return { kind: 'ok', value };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function selectMode(origin: string, headers: Record<string, string>): Mode {
  if (!IS_BROWSER()) return 'plain';
  if (headers['x-trusted-service-key']) return 'plain';

  const target = headers['x-target'];

  const serverMode = getEncodingMode(origin, target) ?? DEFAULT_MODE;
  if (serverMode === 'json') return 'plain';

  const optIn = getTransportMode(origin, target);
  if (optIn) return optIn;

  if (IS_LOCAL() && getEnvVar('__NO_TUNNEL__') === 'true') {
    return 'plain';
  }

  if (compareEnvVar('__NO_TUNNEL__', '3f1a63ebbdf')) {
    return 'plain';
  }

  return 'tunnel';
}

function attachCachedVrxIfAuthed(
  headers: Record<string, string>,
  origin: string,
  target?: string,
): void {
  if (!headers['Authorization']) return;
  const cached = getVrxToken(origin, target);
  if (cached) headers['x-vrx'] = cached;
}

type Built = { url: string; init: RequestInit };

function outerRoutingHeaders(headers: Record<string, string>): Record<string, string> {
  return headers['x-target'] ? { 'x-target': headers['x-target'] } : {};
}

function buildRequest(
  mode: Mode,
  url: string,
  init: RequestInit,
  parsed: URL,
  headers: Record<string, string>,
): Built {
  if (mode === 'tunnel') return buildTunnelRequest(init, parsed, headers);
  if (mode === 'body-encode') return buildBodyEncodedRequest(url, init, headers);
  return buildPlainRequest(url, init, headers);
}

function buildTunnelRequest(
  init: RequestInit,
  parsed: URL,
  headers: Record<string, string>,
): Built {
  const stage = getStagePrefix(parsed.origin, headers['x-target']);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const hasStage = Boolean(stage) && segments[0] === stage;

  let envelopePath: string;
  let tunnelUrl: string;
  if (hasStage) {
    envelopePath = '/' + segments.slice(1).join('/');
    tunnelUrl = `${parsed.origin}/${stage}${TUNNEL_PATH}`;
  } else {
    envelopePath = parsed.pathname;
    tunnelUrl = `${parsed.origin}${TUNNEL_PATH}`;
  }

  const envelope: Record<string, unknown> = {
    method: init.method ?? 'GET',
    path: envelopePath + parsed.search,
    body: init.body ? JSON.parse(init.body as string) : undefined,
    headers: { ...headers },
  };

  return {
    url: tunnelUrl,
    init: {
      method: 'POST',
      body: scrambleBytes(encode(envelope)),
      headers: {
        'Content-Type': MSGPACK_CONTENT_TYPE,
        ...outerRoutingHeaders(headers),
      },
    },
  };
}

function buildBodyEncodedRequest(
  url: string,
  init: RequestInit,
  headers: Record<string, string>,
): Built {
  if (init.method === 'GET' || init.method === 'HEAD') {
    return buildPlainRequest(url, init, headers);
  }

  const bodyJson = init.body ? JSON.parse(init.body as string) : undefined;
  const envelope =
    bodyJson && typeof bodyJson === 'object' && !Array.isArray(bodyJson)
      ? { ...(bodyJson as Record<string, unknown>), headers: { ...headers } }
      : bodyJson;

  return {
    url,
    init: {
      ...init,
      body: scrambleBytes(encode(envelope)),
      headers: {
        'Content-Type': MSGPACK_CONTENT_TYPE,
        ...outerRoutingHeaders(headers),
      },
    },
  };
}

function buildPlainRequest(url: string, init: RequestInit, headers: Record<string, string>): Built {
  if (!init.body) delete headers['Content-Type'];
  return { url, init };
}

async function decodeOkResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes(MSGPACK_CONTENT_TYPE)) {
    return response.json() as Promise<T>;
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return decode(scrambleBytes(bytes)) as T;
}

async function safeDecodeErrorPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type') ?? '';
  try {
    if (contentType.includes(MSGPACK_CONTENT_TYPE)) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.byteLength === 0) return undefined;
      return decode(scrambleBytes(bytes));
    }
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e) {
    trace('[callApi] error body decode failed', e);
    return undefined;
  }
}

function recordServerEncoding(response: Response, origin: string, target?: string): void {
  const serverEncoding = response.headers.get(ENCODING_HEADER);
  if (serverEncoding !== 'msgpack' && serverEncoding !== 'json') return;
  if (getEncodingMode(origin, target) === serverEncoding) return;
  trace('[callApi] serverEncoding', { serverEncoding, origin, target });
  setEncodingMode(origin, target, serverEncoding);
}

function recordVrxToken(response: Response, origin: string, target?: string): void {
  const vrx = response.headers.get('x-vrx');

  if (vrx) setVrxToken(origin, target, vrx);
}

function configureTrace(
  isTunnel: boolean,
  pathname: string,
  fetchUrl: string,
): { enabled: boolean; url: string } {
  if (!isTunnel || !IS_DEBUG()) return { enabled: false, url: fetchUrl };

  const isTraceAll = compareEnvVar('__TRACE_ALL__', TRACE_ALL_HASH);
  if (isTraceAll) {
    return { enabled: true, url: `${fetchUrl}?p=${pathname}` };
  }

  const hashed = (hashString(pathname) ?? '').slice(0, 4);
  const enabled = compareEnvVar('__TRACE_HASH__', hashed);
  return { enabled, url: `${fetchUrl}?p=${pathname}&h=${hashed}` };
}
