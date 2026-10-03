import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { KnockConfig } from "./types.js";

const DEFAULT_CONFIG: KnockConfig = {
  minDurationSeconds: 30,
  projectName: "",
  openUrl: "",
  notify: { completed: true, error: true, aborted: false, input: true },
  ntfy: { server: "https://ntfy.sh", topic: "", token: "" },
  pushover: { user: "", token: "" },
  webhook: { url: "", bearerToken: "" },
};

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readJson(path: string): Partial<KnockConfig> {
  try { return JSON.parse(readFileSync(path, "utf8")) as Partial<KnockConfig>; }
  catch { return {}; }
}

function mergeConfig(base: KnockConfig, file: Partial<KnockConfig>): KnockConfig {
  return {
    ...base, ...file,
    notify: { ...base.notify, ...(file.notify ?? {}) },
    ntfy: { ...base.ntfy, ...(file.ntfy ?? {}) },
    pushover: { ...base.pushover, ...(file.pushover ?? {}) },
    webhook: { ...base.webhook, ...(file.webhook ?? {}) },
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): KnockConfig {
  const configPath = env.PI_KNOCK_CONFIG || join(homedir(), ".pi", "agent", "pi-knock.json");
  const fromFile = mergeConfig(DEFAULT_CONFIG, readJson(configPath));
  return {
    ...fromFile,
    minDurationSeconds: toNumber(env.PI_KNOCK_MIN_DURATION, fromFile.minDurationSeconds),
    projectName: env.PI_KNOCK_PROJECT ?? fromFile.projectName,
    openUrl: env.PI_KNOCK_OPEN_URL ?? fromFile.openUrl,
    notify: {
      completed: toBoolean(env.PI_KNOCK_NOTIFY_COMPLETED, fromFile.notify.completed),
      error: toBoolean(env.PI_KNOCK_NOTIFY_ERROR, fromFile.notify.error),
      aborted: toBoolean(env.PI_KNOCK_NOTIFY_ABORTED, fromFile.notify.aborted),
      input: toBoolean(env.PI_KNOCK_NOTIFY_INPUT, fromFile.notify.input),
    },
    ntfy: {
      server: env.PI_KNOCK_NTFY_SERVER ?? fromFile.ntfy.server,
      topic: env.PI_KNOCK_NTFY_TOPIC ?? fromFile.ntfy.topic,
      token: env.PI_KNOCK_NTFY_TOKEN ?? fromFile.ntfy.token,
    },
    pushover: {
      user: env.PI_KNOCK_PUSHOVER_USER ?? fromFile.pushover.user,
      token: env.PI_KNOCK_PUSHOVER_TOKEN ?? fromFile.pushover.token,
    },
    webhook: {
      url: env.PI_KNOCK_WEBHOOK_URL ?? fromFile.webhook.url,
      bearerToken: env.PI_KNOCK_WEBHOOK_BEARER ?? fromFile.webhook.bearerToken,
    },
  };
}

export function hasConfiguredChannel(config: KnockConfig): boolean {
  return Boolean(
    (config.ntfy.topic && config.ntfy.server) ||
    (config.pushover.user && config.pushover.token) ||
    config.webhook.url
  );
}
