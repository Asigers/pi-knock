import type { KnockEvent, PushoverConfig } from "../types.js";

export async function sendPushover(config: PushoverConfig, event: KnockEvent): Promise<void> {
  if (!config.user || !config.token) return;
  const body = new URLSearchParams({
    token: config.token, user: config.user, title: event.title, message: event.message,
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
  if (!response.ok) throw new Error(`Pushover returned ${response.status}`);
}
