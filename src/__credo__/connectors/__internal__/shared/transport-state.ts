

const encodingModes = new Map<string, 'json' | 'msgpack'>();

const vrxTokens = new Map<string, string>();

const originStages = new Map<string, string>();

const transportModes = new Map<string, 'plain' | 'body-encode'>();

export function getEncodingMode(origin: string): 'json' | 'msgpack' | undefined {
  return encodingModes.get(origin);
}

export function setEncodingMode(origin: string, mode: 'json' | 'msgpack'): void {
  encodingModes.set(origin, mode);
}

export function getVrxToken(origin: string): string | undefined {
  return vrxTokens.get(origin);
}

export function setVrxToken(origin: string, token: string): void {
  vrxTokens.set(origin, token);
}

export function getStagePrefix(origin: string): string | undefined {
  return originStages.get(origin);
}

export function getTransportMode(origin: string): 'plain' | 'body-encode' | undefined {
  return transportModes.get(origin);
}

export function setTransportMode(origin: string, mode: 'plain' | 'body-encode'): void {
  transportModes.set(origin, mode);
}

export function registerStagePrefix(baseUrl: string | undefined): void {
  if (!baseUrl) return;
  const parsed = new URL(baseUrl);
  const firstSegment = parsed.pathname.split('/').filter(Boolean)[0];
  if (firstSegment) {
    originStages.set(parsed.origin, firstSegment);
  } else {
    originStages.delete(parsed.origin);
  }
}
