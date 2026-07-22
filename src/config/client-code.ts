

import { logger } from '@credo/base-ui/utils';
import { cacheReset } from '@/utils/appCache';
import { reloadPage } from '@credo/base-ui/utils';
import { credoClientCode } from './env';
import { isLocalhost } from '@credo/kits/misc';

export const CLIENT_CODE_STORAGE_KEY = '__CREDO_SERVICE_CODE__';

function fromStorage(): string {
  return localStorage.getItem(CLIENT_CODE_STORAGE_KEY) ?? '';
}

function saveToStorage(clientCode: string): void {
  localStorage.setItem(CLIENT_CODE_STORAGE_KEY, clientCode);
}

function fromDomain(): string {
  const host = window.location.hostname.toLowerCase();

  
  
  
  

  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return ''; // Fall through to .env
  }

  if (host.includes('internal.cr3do.dev')) {
    return host.split('.')[0] ?? '';
  }

  if (host.includes('cr3do.dev')) {
    return host.split('.')[0] ?? '';
  }

  return '';
}

function fromEnv(): string {
  return credoClientCode;
}

const localhost = isLocalhost();

export function resolveClientCode(): string {
  let clientCode = '';
  if (localhost) {
    clientCode = fromStorage() || fromEnv();
  } else {
    clientCode = fromStorage() || fromDomain() || fromEnv();
  }

  if (!clientCode) {
    logger.warn('No clientCode resolved — SSO login will not work');
    return '';
  }

  
  if (clientCode) {
    saveToStorage(clientCode);
  }

  return clientCode;
}

export function resolveServiceCode(): string {
  const clientCode = resolveClientCode();
  return `c-mngt-` + clientCode;
}

export function setClientCode(clientCode: string): void {
  saveToStorage(clientCode);
  cacheReset();
  reloadPage('client-code change');
}

export async function refreshClientCode(): Promise<string | null> {
  
  
  
  
  
  return null;
}
