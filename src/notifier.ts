import { sendNtfy } from "./channels/ntfy.js";
import { sendPushover } from "./channels/pushover.js";
import { sendWebhook } from "./channels/webhook.js";
import type { KnockConfig, KnockEvent } from "./types.js";

export interface DeliveryResult {
  channel: "ntfy" | "pushover" | "webhook";
  ok: boolean;
  error?: string;
}

export async function notify(config: KnockConfig, event: KnockEvent): Promise<DeliveryResult[]> {
  const jobs: Array<Promise<DeliveryResult>> = [];
  if (config.ntfy.topic && config.ntfy.server) jobs.push(run("ntfy", () => sendNtfy(config.ntfy, event)));
  if (config.pushover.user && config.pushover.token) jobs.push(run("pushover", () => sendPushover(config.pushover, event)));
  if (config.webhook.url) jobs.push(run("webhook", () => sendWebhook(config.webhook, event)));
  return Promise.all(jobs);
}

async function run(channel: DeliveryResult["channel"], fn: () => Promise<void>): Promise<DeliveryResult> {
  try { await fn(); return { channel, ok: true }; }
  catch (error) {
    return { channel, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
