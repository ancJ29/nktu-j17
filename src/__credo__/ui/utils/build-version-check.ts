import { reloadPage } from './misc';

type BuildInfo = {
  buildHash: string;
  buildTimestamp: string;
};

export async function checkForNewBuild(current: BuildInfo): Promise<void> {
  try {
    const res = await fetch('/build-info.json');
    if (!res.ok) return;

    const remote: BuildInfo = await res.json();

    const isNewBuild =
      remote.buildHash !== current.buildHash || remote.buildTimestamp !== current.buildTimestamp;

    if (!isNewBuild) return;

    console.info(
      `[build-check] New build detected: ${remote.buildHash}/${remote.buildTimestamp} (current: ${current.buildHash}/${current.buildTimestamp}). Reloading...`,
    );

    
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }

    
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    reloadPage('build version mismatch');
  } catch {
    // Silent fail — network errors or missing file shouldn't block the app
  }
}
