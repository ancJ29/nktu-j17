import { isHashEqual } from './crypt';

type ENV_MODE = 'domain' | 'localhost' | 'lambda' | 'ec2' | 'local-node' | 'cloudflare' | 'unknown';

const __memo__: Record<string, boolean> = {};

const __mode__ = loadEnvMode();

function loadEnvMode(): ENV_MODE {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      return 'localhost';
    }

    if (window.location.hostname === '127.0.0.1') {
      return 'localhost';
    }
    return 'domain';
  }

  if (typeof process !== 'undefined') {
    if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
      return 'lambda';
    }

    if (process.env.HOME && process.env.HOME === '/home/ec2-user') {
      return 'ec2';
    }

    return 'local-node';
  }

  return 'unknown';
}

export function isBrowser() {
  if (__memo__['isBrowser'] !== undefined) {
    return __memo__['isBrowser'];
  }

  __memo__['isBrowser'] = __mode__ === 'localhost' || __mode__ === 'domain';

  return __memo__['isBrowser'];
}

export function isNodeRuntime() {
  if (__memo__['isNodeRuntime'] !== undefined) {
    return __memo__['isNodeRuntime'];
  }

  __memo__['isNodeRuntime'] =
    __mode__ === 'lambda' || __mode__ === 'ec2' || __mode__ === 'local-node';

  return __memo__['isNodeRuntime'];
}

export function isEc2() {
  if (__memo__['isEc2'] !== undefined) {
    return __memo__['isEc2'];
  }

  __memo__['isEc2'] = __mode__ === 'ec2';

  return __memo__['isEc2'];
}

export function isLambda() {
  if (__memo__['isLambda'] !== undefined) {
    return __memo__['isLambda'];
  }

  __memo__['isLambda'] = __mode__ === 'lambda';

  return __memo__['isLambda'];
}

export function isLocalhost() {
  if (__memo__['isLocalhost'] !== undefined) {
    return __memo__['isLocalhost'];
  }

  __memo__['isLocalhost'] = __mode__ === 'localhost';

  return __memo__['isLocalhost'];
}

export function isLocalNode() {
  if (__memo__['isLocalNode'] !== undefined) {
    return __memo__['isLocalNode'];
  }

  __memo__['isLocalNode'] = __mode__ === 'local-node';

  return __memo__['isLocalNode'];
}

export function isLocal() {
  if (__memo__['isLocal'] !== undefined) {
    return __memo__['isLocal'];
  }

  __memo__['isLocal'] = isLocalhost() || isLocalNode();

  return __memo__['isLocal'];
}

export function setEnvVar(name: string, value: string) {
  if (isBrowser()) {
    localStorage.setItem(name, value);
  }
  if (isNodeRuntime()) {
    process.env[name] = value;
  }
}

export function getEnvVar(name: string) {
  if (isBrowser()) {
    return localStorage[name];
  }
  if (isNodeRuntime()) {
    return process.env[name];
  }
  return undefined;
}

export function compareEnvVar(key: string, value: string) {
  const envValue = getEnvVar(key);
  if (!envValue) return false;
  const __key__ = `${key}-${value}`;
  if (__memo__[__key__] !== undefined) {
    return __memo__[__key__];
  }

  __memo__[__key__] = isHashEqual(envValue, value);

  return __memo__[__key__];
}

export function isDebugMode() {
  if (__memo__['isDebugMode'] !== undefined) {
    return __memo__['isDebugMode'];
  }

  __memo__['isDebugMode'] = compareEnvVar('__DEBUG_MODE__', 'a1d46d38bb888483af2ee0');

  return __memo__['isDebugMode'];
}
