const MAX_RETRY_AFTER_MS = 60_000;

export class DeliveryError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;

  constructor(message: string, retryable: boolean, retryAfterMs?: number) {
    super(message);
    this.name = "DeliveryError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

export function retryAfterDelayMs(response: Response): number | undefined {
  const value = response.headers.get("retry-after")?.trim();
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(MAX_RETRY_AFTER_MS, Math.round(seconds * 1_000));
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, timestamp - Date.now()));
}

export function httpDeliveryError(
  provider: string,
  status: number,
  retryAfterMs?: number,
): DeliveryError {
  const retryable = status === 408 || status === 425 || status === 429 || status >= 500;
  return new DeliveryError(provider + " returned " + status, retryable, retryAfterMs);
}
