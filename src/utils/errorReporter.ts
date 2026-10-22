import { notifications } from '@mantine/notifications';
import { buildHash } from '@/config/build-version';

const MAX_REPORTS = 5;

const seen = new Set<string>();
let shown = 0;

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error)?.slice(0, 300) ?? 'unknown error';
  } catch {
    return String(error);
  }
}

function report(error: unknown, origin: string): void {
  const description = describe(error);
  const key = `${origin}|${description}`;
  if (seen.has(key)) return;
  seen.add(key);

  if (shown >= MAX_REPORTS) return;
  shown += 1;

  try {
    notifications.show({
      color: 'red',
      title: `${origin} · ${buildHash}`,
      message: description,

      autoClose: false,
      withCloseButton: true,
    });
  } catch {
    console.error('[uncaught]', origin, description);
  }
}

export function installErrorReporter(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    if (!event.error) return;
    report(event.error, 'error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    report(event.reason, 'promise');
  });
}
