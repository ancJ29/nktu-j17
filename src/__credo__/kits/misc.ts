import { isHashEqual } from './crypt';

const mode = loadEnvMode();

type ENV_MODE = 'domain' | 'localhost' | 'lambda' | 'ec2' | 'local-node' | 'cloudflare' | 'unknown';

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
    if (Boolean(process.env.AWS_LAMBDA_FUNCTION_VERSION)) {
      return 'lambda';
    }

    if (Boolean(process.env.HOME) && process.env.HOME === '/home/ec2-user') {
      return 'ec2';
    }

    return 'local-node';
  }

  return 'unknown';
}

export function isBrowser() {
  return mode === 'localhost' || mode === 'domain';
}

export function isNodeRuntime() {
  return mode === 'lambda' || mode === 'ec2' || mode === 'local-node';
}

export function isEc2() {
  return mode === 'ec2';
}

export function isLambda() {
  return mode === 'lambda';
}

export function isLocalhost() {
  return mode === 'localhost';
}

export function isLocalNode() {
  return mode === 'local-node';
}

export function isLocal() {
  return isLocalhost() || isLocalNode();
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

export function compareEnvVar(key: string, value: string, compareHash: boolean = true) {
  const envValue = getEnvVar(key);
  if (!envValue) return false;
  if (compareHash) {
    return isHashEqual(envValue, value);
  }
  return envValue === value;
}

export function isDebugMode() {
  const debugMode = getEnvVar('__DEBUG_MODE__');

  return isHashEqual(debugMode, 'a1d46d38bb888483af2ee0');
}
