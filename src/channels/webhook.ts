import { httpDeliveryError, retryAfterDelayMs } from "../errors.js";
import type { KnockEvent, WebhookConfig } from "../types.js";

export async function sendWebhook(config: WebhookConfig, event: KnockEvent): Promise<void> {
  if (!config.enabled || !config.url) return;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Pi-Knock-Event-Id": event.id,
  };
  if (config.bearerToken) headers.Authorization = "Bearer " + config.bearerToken;
  const response = await fetch(config.url, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw httpDeliveryError("Webhook", response.status, retryAfterDelayMs(response));
  }
}
