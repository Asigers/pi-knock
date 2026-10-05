import { httpDeliveryError, retryAfterDelayMs } from "../errors.js";
import type { KnockEvent, NtfyConfig } from "../types.js";

export async function sendNtfy(config: NtfyConfig, event: KnockEvent): Promise<void> {
  if (!config.enabled || !config.server || !config.topic) return;
  const endpoint = config.server.replace(/\/$/, "") + "/" + encodeURIComponent(config.topic);
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    Title: event.title,
    Tags: event.type === "completed" ? "white_check_mark" : event.type === "input" ? "bell" : "warning",
    "X-Pi-Knock-Event-Id": event.id,
  };
  if (config.accessToken) headers.Authorization = "Bearer " + config.accessToken;
  if (event.openUrl) {
    headers.Click = event.openUrl;
    headers.Actions = "view, Open session, " + event.openUrl + ", clear=true";
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: event.message,
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw httpDeliveryError("ntfy", response.status, retryAfterDelayMs(response));
  }
}
