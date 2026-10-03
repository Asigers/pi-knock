import { sendNtfy } from "./channels/ntfy.js";
import { sendPushover } from "./channels/pushover.js";
import { sendWebhook } from "./channels/webhook.js";
import type { ChannelName, KnockConfig, KnockEvent } from "./types.js";

export interface DeliveryResult {
  channel: ChannelName;
  ok: boolean;
  error?: string;
}

export async function notify(
  config: KnockConfig,
  event: KnockEvent,
  onlyChannels?: ChannelName[],
): Promise<DeliveryResult[]> {
  const selected = onlyChannels ? new Set(onlyChannels) : null;
  const jobs: Array<Promise<DeliveryResult>> = [];

  if (
    (!selected || selected.has("ntfy")) &&
    config.ntfy.enabled &&
    config.ntfy.topic &&
    config.ntfy.server
  ) {
    jobs.push(run("ntfy", () => sendNtfy(config.ntfy, event)));
  }

  if (
    (!selected || selected.has("pushover")) &&
    config.pushover.enabled &&
    config.pushover.userKey &&
    config.pushover.appToken
  ) {
    jobs.push(run("pushover", () => sendPushover(config.pushover, event)));
  }

  if (
    (!selected || selected.has("webhook")) &&
    config.webhook.enabled &&
    config.webhook.url
  ) {
    jobs.push(run("webhook", () => sendWebhook(config.webhook, event)));
  }

  return Promise.all(jobs);
}

async function run(channel: DeliveryResult["channel"], fn: () => Promise<void>): Promise<DeliveryResult> {
  try {
    await fn();
    return { channel, ok: true };
  } catch (error) {
    return {
      channel,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
