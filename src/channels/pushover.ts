import { httpDeliveryError } from "../errors.js";
import type { KnockEvent, PushoverConfig } from "../types.js";

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
  const response = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw httpDeliveryError("Pushover", response.status);
}
