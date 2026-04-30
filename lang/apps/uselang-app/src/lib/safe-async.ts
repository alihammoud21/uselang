// ── Safe async helpers ──────────────────────────────────────────────────────
// Timeout races + structured error logging. No dependencies.

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Race a promise against a timeout. Rejects with TimeoutError if the
 * timeout fires first. The underlying promise is NOT cancelled — callers
 * should handle cleanup if needed.
 */
export function runWithTimeout<T>(
  label: string,
  op: () => Promise<T>,
  ms: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.error(`[safe-async] TIMEOUT: ${label} after ${ms}ms`);
      reject(new TimeoutError(label, ms));
    }, ms);

    op().then(
      (val) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Fire-and-forget wrapper: catches + logs any error so the caller never
 * sees an unhandled rejection. Returns void.
 */
export async function safeRun(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err: any) {
    console.error(`[safe-async] ${label} FAILED:`, err?.message || err);
  }
}
