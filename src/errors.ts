export class DeliveryError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "DeliveryError";
  }
}

export function httpDeliveryError(provider: string, status: number): DeliveryError {
  const retryable = status === 408 || status === 425 || status === 429 || status >= 500;
  return new DeliveryError(provider + " returned " + status, retryable);
}
