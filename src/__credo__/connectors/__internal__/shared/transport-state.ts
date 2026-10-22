function stateKey(origin: string, target?: string | undefined): string {
  return target ? `${origin}|${target}` : origin;
}

const encodingModes = new Map<string, 'json' | 'msgpack'>();

const originStages = new Map<string, string>();

const transportModes = new Map<string, 'plain' | 'body-encode'>();

export function getEncodingMode(
  origin: string,
  target?: string | undefined,
): 'json' | 'msgpack' | undefined {
  return encodingModes.get(stateKey(origin, target));
}

export function setEncodingMode(
  origin: string,
  target: string | undefined,
  mode: 'json' | 'msgpack',
): void {
  encodingModes.set(stateKey(origin, target), mode);
}

export function getStagePrefix(origin: string, target?: string | undefined): string | undefined {
  return originStages.get(stateKey(origin, target));
}

export function getTransportMode(
  origin: string,
  target?: string | undefined,
): 'plain' | 'body-encode' | undefined {
  return transportModes.get(stateKey(origin, target));
}

export function setTransportMode(
  origin: string,
  target: string | undefined,
  mode: 'plain' | 'body-encode',
): void {
  transportModes.set(stateKey(origin, target), mode);
}

export function registerStagePrefix(
  baseUrl: string | undefined,
  target?: string | undefined,
): void {
  if (!baseUrl) return;
  const parsed = new URL(baseUrl);
  const key = stateKey(parsed.origin, target);
  const firstSegment = parsed.pathname.split('/').filter(Boolean)[0];
  if (firstSegment) {
    originStages.set(key, firstSegment);
  } else {
    originStages.delete(key);
  }
}
