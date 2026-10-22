import type { SeriesItem } from './__internal__/c-storage/types';

export type LivenessValue = {
  lastSeen: string;

  [field: string]: unknown;
};

export type LivenessSink = {
  observe: (identity: string, fields?: Record<string, unknown>) => void;

  reset: () => void;
};

export type LivenessPush = (args: {
  serviceCode: string;
  key: string;
  items: SeriesItem[];
}) => Promise<unknown>;

type SeriesPushConnector = {
  pushToSeries: (args: {
    serviceCode: string;
    key: string;
    items: SeriesItem[];
    isPrivate?: boolean;
    description?: string;
  }) => Promise<unknown>;
};

export function cStorageSeriesPush(connector: SeriesPushConnector): LivenessPush {
  return (args) => connector.pushToSeries({ ...args, isPrivate: true, description: args.key });
}

export type LivenessSinkOptions = {
  serviceCode: string | (() => string);

  seriesKey: string;

  push: LivenessPush;

  onError?: (error: unknown) => void;

  now?: () => Date;
};

const utcDay = (at: Date): string => at.toISOString().slice(0, 10);

export function createLivenessSink(options: LivenessSinkOptions): LivenessSink {
  const { seriesKey, onError, push } = options;
  const resolveServiceCode = () =>
    typeof options.serviceCode === 'function' ? options.serviceCode() : options.serviceCode;
  const now = options.now ?? (() => new Date());

  const seen = new Set<string>();

  return {
    observe(identity, fields) {
      const serviceCode = resolveServiceCode();
      if (!serviceCode || !identity) return;

      const at = now();
      const day = utcDay(at);
      const dedupKey = `${identity}|${day}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      try {
        const value: LivenessValue = { ...fields, lastSeen: at.toISOString() };
        const result = push({
          serviceCode,
          key: seriesKey,
          items: [{ key: identity, value }],
        });

        void Promise.resolve(result).catch((error: unknown) => {
          seen.delete(dedupKey);
          reportError(onError, error);
        });
      } catch (error) {
        seen.delete(dedupKey);
        reportError(onError, error);
      }
    },

    reset() {
      seen.clear();
    },
  };
}

function reportError(onError: LivenessSinkOptions['onError'], error: unknown): void {
  try {
    if (onError) {
      onError(error);
      return;
    }
    console.warn(
      JSON.stringify({
        livenessSinkError: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      }),
    );
  } catch {
    // Even reporting may not take the request down.
  }
}
