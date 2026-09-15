import type { CredoAppConfig } from '../schema';

type Features = NonNullable<CredoAppConfig['features']>;

export const mergeFeature = <K extends keyof Features>(
  features: CredoAppConfig['features'],
  key: K,
  patch: Partial<NonNullable<Features[K]>>,
): CredoAppConfig['features'] =>
  ({
    ...(features ?? {}),
    [key]: { ...(features?.[key] ?? {}), ...patch },
  }) as CredoAppConfig['features'];
