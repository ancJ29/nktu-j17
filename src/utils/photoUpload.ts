import { dolgaConnector, r2Connector } from '@credo/connectors/connector';
import { OperationTimeoutError, withTimeout } from '@/utils/withTimeout';

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
 * - **A bounded total**, not just bounded legs. Per-leg caps alone still let
 *   three attempts stack into minutes of spinner, which a driver reads as
 *   frozen — see {@link PhotoUploadBudget}.
 * - **Bounded retry.** Transient failures (network drop, timeout, 5xx, 408,
 *   429) are retried with backoff; a **re-presign happens per attempt**, which
 *   is also what recovers an expired presigned URL (403).
 * - **A named reason on failure**, never a bare boolean — the caller can say
 *   "you're offline" instead of "failed to upload", which is the difference
 *   between a driver retrying in ten metres and a driver giving up.
 *
 * It does not queue: giving up quickly is only humane because
 * [`photoQueue.ts`](./photoQueue.ts) catches what it drops.
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

/**
 * How long the caller is prepared to wait.
 *
 * The distinction is **who is watching**, and it turned out to matter more than
 * the individual timeouts: per-leg budgets alone bounded each request but not
 * the total, so three attempts × (presign + upload) added up to nearly four
 * minutes of spinner. A driver reads that as "frozen" long before it ends —
 * and reasonably, since it is longer than the delivery stop.
 *
 * - `interactive` — someone is staring at a spinner. Fail **fast** and hand the
 *   photo to the offline queue; on a link this bad the queue will do a better
 *   job than the person waiting, and they can get on with the delivery.
 * - `background` — the queue flushing on its own. Nobody is blocked, so give
 *   each attempt room; the alternative to patience here is another retry cycle
 *   later, which is strictly more expensive.
 */
export type PhotoUploadBudget = 'interactive' | 'background';

/**
 * Budget for the **record write** that follows an upload.
 *
 * Shorter than the transport's own stuck-detector on purpose: this one runs
 * with a person watching a spinner, and a photo whose write is slow is not a
 * photo that is lost — the queue reconciles it. Bounding the wait costs
 * nothing and is the difference between "saved, carry on" and a frozen button.
 */
export const RECORD_WRITE_TIMEOUT_MS = 15_000;

const BUDGETS = {
  interactive: {
    presignMs: 8_000,
    uploadMs: 20_000,
    attempts: 2,
    /** Hard cap on the whole call, backoff included — what the user feels. */
    totalMs: 30_000,
    backoffMs: [700],
  },
  background: {
    presignMs: 15_000,
    uploadMs: 60_000,
    attempts: 3,
    totalMs: 180_000,
    backoffMs: [1_000, 3_000],
  },
} as const satisfies Record<PhotoUploadBudget, unknown>;

/**
 * `navigator.onLine === false` is trustworthy in one direction only: false
 * means definitely offline, true means "has an interface", not "has the
 * internet". So it's used to fail *fast*, never to conclude success.
 */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
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
  if (error instanceof OperationTimeoutError) return { reason: 'timeout', retryable: true };
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
  budget = 'interactive',
}: {
  file: File;
  imageDirectory: string;
  /** Stored name (already sanitized / timestamped by the caller). */
  fileName: string;
  budget?: PhotoUploadBudget;
}): Promise<PhotoUploadResult> {
  const limits = BUDGETS[budget];
  const startedAt = Date.now();
  const timeLeft = () => limits.totalMs - (Date.now() - startedAt);
  let lastReason: PhotoUploadFailure = 'network';

  for (let attempt = 0; attempt < limits.attempts; attempt++) {
    if (isOffline()) return { ok: false, reason: 'offline' };
    // Checked before every leg, not just per attempt: the whole point is that
    // the caller's wait is bounded by `totalMs`, whatever the legs are doing.
    if (timeLeft() <= 0) return { ok: false, reason: 'timeout' };

    if (attempt > 0) await sleep(limits.backoffMs[attempt - 1] ?? 3_000);

    // ── Leg 1: presign ──
    let uploadUrl: string | undefined;
    let fileUrl: string | undefined;
    try {
      const presignRes = await withTimeout(
        dolgaConnector.mediaUploadUrl({ imageDirectory, fileName }),
        Math.min(limits.presignMs, timeLeft()),
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

    if (timeLeft() <= 0) return { ok: false, reason: 'timeout' };

    // ── Leg 2: the bytes ──
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(limits.uploadMs, Math.max(timeLeft(), 1_000)),
    );
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
