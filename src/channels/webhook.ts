import type { KnockEvent, WebhookConfig } from "../types.js";

export async function sendWebhook(config: WebhookConfig, event: KnockEvent): Promise<void> {
  if (!config.url) return;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.bearerToken) headers.Authorization = `Bearer ${config.bearerToken}`;
  const response = await fetch(config.url, {
    method: "POST", headers, body: JSON.stringify(event), signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
}
