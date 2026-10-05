import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { resolveConfigPaths } from "./config.js";
import type { DeliveryReport } from "./notifier.js";
import type { ChannelName, KnockEventType } from "./types.js";

type JsonRecord = Record<string, unknown>;

const EVENT_TYPES: KnockEventType[] = ["completed", "error", "aborted", "input"];
const CHANNELS: ChannelName[] = ["ntfy", "pushover", "webhook"];

function persistenceEnabled(): boolean {
  // Node's test runner sets --test in argv. Avoid changing a developer's real
  // last-delivery report while unit tests replace process-wide fetch and env state.
  return !process.argv.includes("--test") || process.env.PI_KNOCK_PERSIST_TEST_REPORTS === "1";
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeError(value: string): string {
  return value
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/(?:token|user|password|secret|authorization|bearer)[=:]?\S+/gi, "[redacted]")
    .slice(0, 300);
}

function isDeliveryReport(value: unknown): value is DeliveryReport {
  if (!isRecord(value)) return false;
  if (typeof value.timestamp !== "string") return false;
  if (typeof value.eventType !== "string" || !EVENT_TYPES.includes(value.eventType as KnockEventType)) {
    return false;
  }
  if (!Array.isArray(value.results)) return false;

  return value.results.every((result) => {
    if (!isRecord(result)) return false;
    const channel = result.channel;
    const attempts = result.attempts;
    if (typeof channel !== "string" || !CHANNELS.includes(channel as ChannelName)) return false;
    if (typeof result.ok !== "boolean" || typeof attempts !== "number" || !Number.isInteger(attempts) || attempts < 1) {
      return false;
    }
    return result.error === undefined || typeof result.error === "string";
  });
}

export function loadLastDeliveryReport(): DeliveryReport | undefined {
  if (!persistenceEnabled()) return undefined;
  try {
    const value = JSON.parse(readFileSync(resolveConfigPaths().deliveryReportFile, "utf8")) as unknown;
    return isDeliveryReport(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function saveLastDeliveryReport(report: DeliveryReport): void {
  if (!persistenceEnabled()) return;

  try {
    const { deliveryReportFile } = resolveConfigPaths();
    const directory = dirname(deliveryReportFile);
    mkdirSync(directory, { recursive: true, mode: 0o700 });

    const persisted: DeliveryReport = {
      timestamp: report.timestamp,
      eventType: report.eventType,
      results: report.results.map((result) => ({
        channel: result.channel,
        ok: result.ok,
        attempts: result.attempts,
        ...(result.error ? { error: safeError(result.error) } : {}),
      })),
    };
    const temporary = deliveryReportFile + ".tmp-" + process.pid + "-" + randomUUID();
    writeFileSync(temporary, JSON.stringify(persisted, null, 2) + "\n", {
      encoding: "utf8",
      mode: 0o600,
    });
    try { chmodSync(temporary, 0o600); } catch {}
    renameSync(temporary, deliveryReportFile);
    try { chmodSync(deliveryReportFile, 0o600); } catch {}
  } catch {
    // Diagnostics must never make notification delivery or the Pi run fail.
  }
}
