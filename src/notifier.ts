import { DeliveryError } from "./errors.js";
import { loadLastDeliveryReport, saveLastDeliveryReport } from "./delivery-report.js";
import { sendNtfy } from "./channels/ntfy.js";
import { sendPushover } from "./channels/pushover.js";
import { sendWebhook } from "./channels/webhook.js";
import type { ChannelName, KnockConfig, KnockEvent, KnockEventType } from "./types.js";

export interface DeliveryResult {
  channel: ChannelName;
  ok: boolean;
  attempts: number;
  error?: string;
}

export interface DeliveryReport {
  timestamp: string;
  eventType: KnockEventType;
  results: DeliveryResult[];
}

interface RetryOptions {
  retryDelaysMs?: number[];
  sleep?: (ms: number) => Promise<void>;
  jitter?: (ms: number) => number;
}

const DEFAULT_RETRY_DELAYS_MS = [1_000, 3_000];
const PUSHOVER_RETRY_DELAYS_MS = [5_000, 10_000];

function jitterDelay(ms: number): number {
  if (ms <= 0) return 0;
  return Math.max(0, Math.round(ms * (0.8 + Math.random() * 0.4)));
}

let lastDeliveryReport: DeliveryReport | undefined = loadLastDeliveryReport();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  return error instanceof DeliveryError ? error.retryable : true;
}

export async function runWithRetry(
  channel: ChannelName,
  fn: () => Promise<void>,
  options: RetryOptions = {},
): Promise<DeliveryResult> {
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const wait = options.sleep ?? sleep;
  let attempts = 0;
  let lastError: unknown;

  for (let index = 0; index <= retryDelaysMs.length; index += 1) {
    attempts += 1;
    try {
      await fn();
      return { channel, ok: true, attempts };
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || index === retryDelaysMs.length) break;
      const retryAfterMs = error instanceof DeliveryError ? error.retryAfterMs : undefined;
      const baseDelayMs = retryAfterMs ?? retryDelaysMs[index];
      const delayMs = retryAfterMs === undefined && options.jitter
        ? options.jitter(baseDelayMs)
        : baseDelayMs;
      await wait(delayMs);
    }
  }

  return {
    channel,
    ok: false,
    attempts,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

export function getLastDeliveryReport(): DeliveryReport | undefined {
  return lastDeliveryReport;
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
    jobs.push(runWithRetry(
      "ntfy",
      () => sendNtfy(config.ntfy, event),
      { jitter: jitterDelay },
    ));
  }

  if (
    (!selected || selected.has("pushover")) &&
    config.pushover.enabled &&
    config.pushover.userKey &&
    config.pushover.appToken
  ) {
    jobs.push(runWithRetry(
      "pushover",
      () => sendPushover(config.pushover, event),
      { retryDelaysMs: PUSHOVER_RETRY_DELAYS_MS, jitter: jitterDelay },
    ));
  }

  if (
    (!selected || selected.has("webhook")) &&
    config.webhook.enabled &&
    config.webhook.url
  ) {
    jobs.push(runWithRetry(
      "webhook",
      () => sendWebhook(config.webhook, event),
      { jitter: jitterDelay },
    ));
  }

  const results = await Promise.all(jobs);
  lastDeliveryReport = {
    timestamp: new Date().toISOString(),
    eventType: event.type,
    results,
  };
  saveLastDeliveryReport(lastDeliveryReport);
  return results;
}
