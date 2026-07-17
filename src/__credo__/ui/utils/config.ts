
import type { z } from 'zod';
import type { EnvConfig } from '../types/env';
import { logger } from './logger';

export function loadConfigFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    logger.error(`Failed to load config from localStorage key "${key}"`);
    return null;
  }
}

export function saveConfigToStorage<T extends Record<string, unknown>>(
  key: string,
  config: T,
): void {
  try {
    const { env: _env, build: _build, ...storable } = config;
    localStorage.setItem(key, JSON.stringify(storable));
  } catch (error) {
    logger.error('Failed to save config to localStorage:', error);
  }
}

export function mergeConfigs<T extends Record<string, unknown>>(
  defaults: T,
  ...overrides: Array<Partial<T> | null | undefined>
): T {
  const result = { ...defaults };

  for (const override of overrides) {
    if (!override) continue;
    for (const key of Object.keys(override) as Array<keyof T>) {
      const value = override[key];
      if (value === undefined) continue;

      const defaultValue = result[key];
      
      if (
        defaultValue &&
        typeof defaultValue === 'object' &&
        !Array.isArray(defaultValue) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        result[key] = { ...defaultValue, ...value } as T[keyof T];
      } else {
        result[key] = value as T[keyof T];
      }
    }
  }

  return result;
}

export type ConfigValidationResult<T> = {
  config: T;
  warnings: string[];
};

export function validateConfig<T extends Record<string, unknown>>(
  schema: z.ZodObject<z.ZodRawShape>,
  defaults: T,
  raw: unknown,
): ConfigValidationResult<T> {
  const warnings: string[] = [];

  if (raw == null || typeof raw !== 'object') {
    return { config: { ...defaults }, warnings };
  }

  const input = raw as Record<string, unknown>;
  const result = { ...defaults };
  const shape = schema.shape as Record<string, z.ZodType>;

  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (!(key in input)) continue;

    const parsed = fieldSchema.safeParse(input[key]);
    if (parsed.success) {
      (result as Record<string, unknown>)[key] = parsed.data;
    } else {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      warnings.push(`[config] Invalid "${key}", using default. Issues: ${issues}`);
    }
  }

  return { config: result, warnings };
}

export function isNewerVersion(current: string, remote: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);
  const [rMajor = 0, rMinor = 0, rPatch = 0] = parse(remote);

  if (rMajor !== cMajor) return rMajor > cMajor;
  if (rMinor !== cMinor) return rMinor > cMinor;
  return rPatch > cPatch;
}

export function getEnvVar(key: string, defaultValue?: string, ignoreMissing = true): string {
  const meta = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const value = meta?.[key] ?? (globalThis as any).process?.env?.[key] ?? defaultValue;
  if (value === undefined) {
    if (ignoreMissing) {
      return defaultValue ?? '';
    }
    throw new Error(`Missing environment variable: ${key}!`);
  }
  return value;
}

export function baseEnvConfig(): EnvConfig {
  const meta = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  return {
    
    APP_NAME: getEnvVar('VITE_APP_NAME', 'Credo Admin'),
    APP_VERSION: getEnvVar('VITE_APP_VERSION', '0.0.0'),
    APP_BUILD: getEnvVar('VITE_APP_BUILD', 'dev'),

    
    CREDO_SSO_API_SERVICE_CODE: getEnvVar('VITE_CREDO_CLIENT_CODE'),

    
    IS_DEV: meta?.DEV ?? (globalThis as any).process?.env?.NODE_ENV === 'development',
    IS_PROD: meta?.PROD ?? (globalThis as any).process?.env?.NODE_ENV === 'production',
    IS_LOCAL: window.location.hostname === 'localhost',
  };
}
