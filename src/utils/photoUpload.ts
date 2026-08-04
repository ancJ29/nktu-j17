import { dolgaConnector, r2Connector } from '@credo/connectors/connector';

/**
 * ## One upload leg, three ways to fail — and the field is where they happen
 *
 * Attaching a photo is **two network calls, not one**: presign against the
 * dolga worker, then PUT the bytes straight to R2. Neither leg is covered by
 * `callApi`'s retry (that only re-sends on a 406 encoding upgrade), and the R2
 * PUT is a bare `fetch` with no timeout at all. So on the link this feature is
 * actually used over — a driver on one bar, at a delivery address — the
 * default behaviour was: hang forever, or fail once and give up.
 *
 * This helper is the single place that owns the policy, because the three call
 * sites (`ImageUploadPanel`'s picker and its camera, plus the SO / DR detail
 * hooks' external-camera copies) had already drifted into three different
 * answers — one toasted, one returned silently, one threw into an unhandled
 * rejection.
 *
 * What it guarantees:
 *
 * - **Bounded wait.** Every leg is capped (`PRESIGN_TIMEOUT_MS` /
 *   `UPLOAD_TIMEOUT_MS`), so a spinner always ends.
 * - **Bounded retry.** Transient failures (network drop, timeout, 5xx, 408,
 *   429) are retried with backoff; a **re-presign happens per attempt**, which
 *   is also what recovers an expired presigned URL (403).
 * - **A named reason on failure**, never a bare boolean — the caller can say
 *   "you're offline" instead of "failed to upload", which is the difference
 *   between a driver retrying in ten metres and a driver giving up.
 *
 * What it deliberately does NOT do: queue for later. An offline capture is
 * still lost when the camera closes. That needs durable storage for the bytes
 * (IndexedDB) and a flush on reconnect — a bigger change than making failure
 * visible, which is what this is.
 */

/** Why an upload failed, in the terms a user can act on. */
export type PhotoUploadFailure =
  /** The device reports no connectivity — retrying now is pointless. */
  | 'offline'
  /** A leg exceeded its budget. The link is up but unusable. */
  | 'timeout'
  /** Transport-level failure that survived every retry. */
  | 'network'
  /** The server answered and said no. Retrying the same bytes won't help. */
  | 'rejected';

export type PhotoUploadResult =
  { ok: true; url: string } | { ok: false; reason: PhotoUploadFailure };

/** Presign is a small JSON round-trip — generous, but not unbounded. */
const PRESIGN_TIMEOUT_MS = 15_000;
/**
 * The bytes leg. Images are compressed to ~500KB before they get here, which
 * still takes tens of seconds on a bad mobile uplink — hence the wide budget.
 */
const UPLOAD_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
/** Backoff before attempt 2 and 3. Short — a driver is standing there. */
const BACKOFF_MS = [800, 2_400];

class TimeoutError extends Error {
  constructor() {
    super('timeout');
    this.name = 'TimeoutError';
  }
}

/**
 * `navigator.onLine === false` is trustworthy in one direction only: false
 * means definitely offline, true means "has an interface", not "has the
 * internet". So it's used to fail *fast*, never to conclude success.
 */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Cap a promise that has no abort path of its own. The underlying request
 * keeps running — this bounds the *wait*, not the work. That's acceptable for
 * presign (a few hundred bytes); the byte upload gets a real `AbortSignal`.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify a thrown error into a reason + whether another attempt is worth it.
 *
 * An HTTP status carried on the error (dolga answered, unhappily) is terminal
 * in the 4xx range — the request is malformed or unauthorized, and the same
 * request will be just as malformed next time. 408 / 429 and every 5xx are the
 * exceptions: those are the server saying "not now".
 */
function classifyThrown(error: unknown): { reason: PhotoUploadFailure; retryable: boolean } {
  if (error instanceof TimeoutError) return { reason: 'timeout', retryable: true };
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { reason: 'timeout', retryable: true };
  }
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return status === 408 || status === 429
      ? { reason: 'network', retryable: true }
      : { reason: 'rejected', retryable: false };
  }
  return { reason: 'network', retryable: true };
}

/** Same question for a non-throwing R2 response. */
function isRetryableUploadStatus(status: number | undefined): boolean {
  if (status == null) return true;
  if (status >= 500) return true;
  // 403 on a presigned PUT is usually an expired URL — the next attempt
  // presigns again, so it is worth one.
  return status === 403 || status === 408 || status === 429;
}

/**
 * Presign + upload one file, with timeouts and bounded retry.
 *
 * Never throws — every failure comes back as a reason, because two of the
 * three original call sites had no catch and turned a dropped connection into
 * an unhandled rejection with a closed camera and no message.
 */
export async function uploadPhotoFile({
  file,
  imageDirectory,
  fileName,
}: {
  file: File;
  imageDirectory: string;
  /** Stored name (already sanitized / timestamped by the caller). */
  fileName: string;
}): Promise<PhotoUploadResult> {
  let lastReason: PhotoUploadFailure = 'network';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (isOffline()) return { ok: false, reason: 'offline' };

    if (attempt > 0) await sleep(BACKOFF_MS[attempt - 1] ?? 2_400);

    // ── Leg 1: presign ──
    let uploadUrl: string | undefined;
    let fileUrl: string | undefined;
    try {
      const presignRes = await withTimeout(
        dolgaConnector.mediaUploadUrl({ imageDirectory, fileName }),
        PRESIGN_TIMEOUT_MS,
      );
      uploadUrl = presignRes.uploadUrl;
      fileUrl = presignRes.fileUrl;
    } catch (error) {
      const { reason, retryable } = classifyThrown(error);
      lastReason = reason;
      if (!retryable) return { ok: false, reason };
      continue;
    }

    // A 200 without a URL is the worker declining, not a blip — the next
    // attempt would be declined identically.
    if (!uploadUrl || !fileUrl) return { ok: false, reason: 'rejected' };

    // ── Leg 2: the bytes ──
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const uploadRes = await r2Connector.uploadImage({
        uploadUrl,
        fileContent: file,
        contentType: file.type,
        signal: controller.signal,
      });

      if (uploadRes.success) return { ok: true, url: fileUrl };

      if (!isRetryableUploadStatus(uploadRes.status)) {
        return { ok: false, reason: 'rejected' };
      }
      lastReason = 'network';
    } catch (error) {
      const { reason, retryable } = classifyThrown(error);
      lastReason = reason;
      if (!retryable) return { ok: false, reason };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, reason: lastReason };
}

/**
 * i18n key for a failure reason. Exported so all three call sites report the
 * same failure the same way — the drift this module exists to end. The return
 * is a literal union, not `string`, so it stays assignable to the typed `t()`.
 * Every key interpolates `{{name}}`.
 */
export function photoUploadErrorKey(
  reason: PhotoUploadFailure,
):
  | 'photos.uploadOffline'
  | 'photos.uploadTimeout'
  | 'photos.uploadNetworkError'
  | 'photos.uploadError' {
  switch (reason) {
    case 'offline':
      return 'photos.uploadOffline';
    case 'timeout':
      return 'photos.uploadTimeout';
    case 'network':
      return 'photos.uploadNetworkError';
    default:
      return 'photos.uploadError';
  }
}

/**
 * Turn a `CaptureResult.base64` data URL into a `File`.
 *
 * `fetch()` on a `data:` URL never touches the network, so this needs no
 * timeout — it's local decode work, despite looking like a request.
 */
export async function captureResultToFile(base64: string, fileName: string): Promise<File> {
  const res = await fetch(base64);
  const blob = await res.blob();
  return new File([blob], fileName, { type: 'image/jpeg' });
}
