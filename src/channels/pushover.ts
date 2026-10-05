import { DeliveryError, httpDeliveryError, retryAfterDelayMs } from "../errors.js";
import type { KnockEvent, PushoverConfig } from "../types.js";

const REQUEST_TIMEOUT_MS = 10_000;

export async function sendPushover(config: PushoverConfig, event: KnockEvent): Promise<void> {
  if (!config.enabled || !config.userKey || !config.appToken) return;
  const body = new URLSearchParams({
    token: config.appToken,
    user: config.userKey,
    title: event.title,
    message: event.message,
  });
  if (event.openUrl) {
    body.set("url", event.openUrl);
    body.set("url_title", "Open session");
  }
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal,
    });
  } catch (error) {
    if (signal.aborted) {
      throw new DeliveryError("Pushover request timed out after " + REQUEST_TIMEOUT_MS / 1_000 + "s", true);
    }
    throw error;
  }
  if (!response.ok) {
    throw httpDeliveryError("Pushover", response.status, retryAfterDelayMs(response));
  }
}
