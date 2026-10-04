import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  ConfigPaths,
  KnockConfig,
  KnockCredentials,
  NotificationContentMode,
} from "./types.js";

type JsonRecord = Record<string, unknown>;

const DEFAULT_CONFIG: KnockConfig = {
  projectName: "",
  openUrl: "",
  contentMode: "project-only",
  notify: { completed: true, error: true, aborted: false, input: true },
  ntfy: { enabled: false, server: "https://ntfy.sh", topic: "", accessToken: "" },
  pushover: { enabled: false, userKey: "", appToken: "" },
  webhook: { enabled: false, url: "", bearerToken: "" },
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path: string): JsonRecord {
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function nested(record: JsonRecord, key: string): JsonRecord {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

function contentModeValue(value: unknown): NotificationContentMode | undefined {
  return value === "prompt" || value === "project-only" ? value : undefined;
}

function envContentMode(value: string | undefined, fallback: NotificationContentMode): NotificationContentMode {
  return contentModeValue(value) ?? fallback;
}

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

export function resolveConfigPaths(env: NodeJS.ProcessEnv = process.env): ConfigPaths {
  const directory = env.PI_KNOCK_HOME || join(homedir(), ".pi", "agent", "pi-knock");
  return {
    directory,
    configFile: env.PI_KNOCK_CONFIG || join(directory, "config.json"),
    credentialsFile: env.PI_KNOCK_CREDENTIALS || join(directory, "credentials.json"),
    legacyConfigFile: join(homedir(), ".pi", "agent", "pi-knock.json"),
  };
}

function mergeFileSources(legacy: JsonRecord, configFile: JsonRecord, credentialsFile: JsonRecord): KnockConfig {
  const legacyNotify = nested(legacy, "notify");
  const fileNotify = nested(configFile, "notify");

  const legacyNtfy = nested(legacy, "ntfy");
  const fileNtfy = nested(configFile, "ntfy");
  const credentialNtfy = nested(credentialsFile, "ntfy");

  const legacyPushover = nested(legacy, "pushover");
  const filePushover = nested(configFile, "pushover");
  const credentialPushover = nested(credentialsFile, "pushover");

  const legacyWebhook = nested(legacy, "webhook");
  const fileWebhook = nested(configFile, "webhook");
  const credentialWebhook = nested(credentialsFile, "webhook");

  const ntfyTopic = firstDefined(
    stringValue(fileNtfy.topic),
    stringValue(legacyNtfy.topic),
    DEFAULT_CONFIG.ntfy.topic,
  )!;
  const ntfyAccessToken = firstDefined(
    stringValue(credentialNtfy.accessToken),
    stringValue(fileNtfy.accessToken),
    stringValue(fileNtfy.token),
    stringValue(legacyNtfy.accessToken),
    stringValue(legacyNtfy.token),
    DEFAULT_CONFIG.ntfy.accessToken,
  )!;

  const pushoverUserKey = firstDefined(
    stringValue(credentialPushover.userKey),
    stringValue(filePushover.userKey),
    stringValue(filePushover.user),
    stringValue(legacyPushover.userKey),
    stringValue(legacyPushover.user),
    DEFAULT_CONFIG.pushover.userKey,
  )!;
  const pushoverAppToken = firstDefined(
    stringValue(credentialPushover.appToken),
    stringValue(filePushover.appToken),
    stringValue(filePushover.token),
    stringValue(legacyPushover.appToken),
    stringValue(legacyPushover.token),
    DEFAULT_CONFIG.pushover.appToken,
  )!;

  const webhookUrl = firstDefined(
    stringValue(fileWebhook.url),
    stringValue(legacyWebhook.url),
    DEFAULT_CONFIG.webhook.url,
  )!;
  const webhookBearerToken = firstDefined(
    stringValue(credentialWebhook.bearerToken),
    stringValue(fileWebhook.bearerToken),
    stringValue(legacyWebhook.bearerToken),
    DEFAULT_CONFIG.webhook.bearerToken,
  )!;

  return {
    projectName: firstDefined(
      stringValue(configFile.projectName),
      stringValue(legacy.projectName),
      DEFAULT_CONFIG.projectName,
    )!,
    openUrl: firstDefined(
      stringValue(configFile.openUrl),
      stringValue(legacy.openUrl),
      DEFAULT_CONFIG.openUrl,
    )!,
    contentMode: firstDefined(
      contentModeValue(configFile.contentMode),
      contentModeValue(legacy.contentMode),
      DEFAULT_CONFIG.contentMode,
    )!,
    notify: {
      completed: firstDefined(
        booleanValue(fileNotify.completed),
        booleanValue(legacyNotify.completed),
        DEFAULT_CONFIG.notify.completed,
      )!,
      error: firstDefined(
        booleanValue(fileNotify.error),
        booleanValue(legacyNotify.error),
        DEFAULT_CONFIG.notify.error,
      )!,
      aborted: firstDefined(
        booleanValue(fileNotify.aborted),
        booleanValue(legacyNotify.aborted),
        DEFAULT_CONFIG.notify.aborted,
      )!,
      input: firstDefined(
        booleanValue(fileNotify.input),
        booleanValue(legacyNotify.input),
        DEFAULT_CONFIG.notify.input,
      )!,
    },
    ntfy: {
      enabled: firstDefined(
        booleanValue(fileNtfy.enabled),
        booleanValue(legacyNtfy.enabled),
        ntfyTopic ? true : undefined,
        DEFAULT_CONFIG.ntfy.enabled,
      )!,
      server: firstDefined(
        stringValue(fileNtfy.server),
        stringValue(legacyNtfy.server),
        DEFAULT_CONFIG.ntfy.server,
      )!,
      topic: ntfyTopic,
      accessToken: ntfyAccessToken,
    },
    pushover: {
      enabled: firstDefined(
        booleanValue(filePushover.enabled),
        booleanValue(legacyPushover.enabled),
        pushoverUserKey && pushoverAppToken ? true : undefined,
        DEFAULT_CONFIG.pushover.enabled,
      )!,
      userKey: pushoverUserKey,
      appToken: pushoverAppToken,
    },
    webhook: {
      enabled: firstDefined(
        booleanValue(fileWebhook.enabled),
        booleanValue(legacyWebhook.enabled),
        webhookUrl ? true : undefined,
        DEFAULT_CONFIG.webhook.enabled,
      )!,
      url: webhookUrl,
      bearerToken: webhookBearerToken,
    },
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): KnockConfig {
  const paths = resolveConfigPaths(env);
  const fromFiles = mergeFileSources(
    readJson(paths.legacyConfigFile),
    readJson(paths.configFile),
    readJson(paths.credentialsFile),
  );

  const ntfyTopic = env.PI_KNOCK_NTFY_TOPIC ?? fromFiles.ntfy.topic;
  const ntfyAccessToken =
    env.PI_KNOCK_NTFY_ACCESS_TOKEN ??
    env.PI_KNOCK_NTFY_TOKEN ??
    fromFiles.ntfy.accessToken;

  const pushoverUserKey =
    env.PI_KNOCK_PUSHOVER_USER_KEY ??
    env.PI_KNOCK_PUSHOVER_USER ??
    fromFiles.pushover.userKey;
  const pushoverAppToken =
    env.PI_KNOCK_PUSHOVER_APP_TOKEN ??
    env.PI_KNOCK_PUSHOVER_TOKEN ??
    fromFiles.pushover.appToken;

  const webhookUrl = env.PI_KNOCK_WEBHOOK_URL ?? fromFiles.webhook.url;

  return {
    ...fromFiles,
    projectName: env.PI_KNOCK_PROJECT ?? fromFiles.projectName,
    openUrl: env.PI_KNOCK_OPEN_URL ?? fromFiles.openUrl,
    contentMode: envContentMode(env.PI_KNOCK_CONTENT_MODE, fromFiles.contentMode),
    notify: {
      completed: toBoolean(env.PI_KNOCK_NOTIFY_COMPLETED, fromFiles.notify.completed),
      error: toBoolean(env.PI_KNOCK_NOTIFY_ERROR, fromFiles.notify.error),
      aborted: toBoolean(env.PI_KNOCK_NOTIFY_ABORTED, fromFiles.notify.aborted),
      input: toBoolean(env.PI_KNOCK_NOTIFY_INPUT, fromFiles.notify.input),
    },
    ntfy: {
      enabled: toBoolean(
        env.PI_KNOCK_NTFY_ENABLED,
        fromFiles.ntfy.enabled || Boolean(ntfyTopic),
      ),
      server: env.PI_KNOCK_NTFY_SERVER ?? fromFiles.ntfy.server,
      topic: ntfyTopic,
      accessToken: ntfyAccessToken,
    },
    pushover: {
      enabled: toBoolean(
        env.PI_KNOCK_PUSHOVER_ENABLED,
        fromFiles.pushover.enabled || Boolean(pushoverUserKey && pushoverAppToken),
      ),
      userKey: pushoverUserKey,
      appToken: pushoverAppToken,
    },
    webhook: {
      enabled: toBoolean(
        env.PI_KNOCK_WEBHOOK_ENABLED,
        fromFiles.webhook.enabled || Boolean(webhookUrl),
      ),
      url: webhookUrl,
      bearerToken: env.PI_KNOCK_WEBHOOK_BEARER ?? fromFiles.webhook.bearerToken,
    },
  };
}

export function loadStoredCredentials(env: NodeJS.ProcessEnv = process.env): KnockCredentials {
  const paths = resolveConfigPaths(env);
  const raw = readJson(paths.credentialsFile);
  const result: KnockCredentials = {};

  if ("ntfy" in raw) {
    const ntfy = nested(raw, "ntfy");
    result.ntfy = { accessToken: stringValue(ntfy.accessToken) ?? "" };
  }
  if ("pushover" in raw) {
    const pushover = nested(raw, "pushover");
    result.pushover = {
      userKey: stringValue(pushover.userKey) ?? "",
      appToken: stringValue(pushover.appToken) ?? "",
    };
  }
  if ("webhook" in raw) {
    const webhook = nested(raw, "webhook");
    result.webhook = { bearerToken: stringValue(webhook.bearerToken) ?? "" };
  }

  return result;
}

function writeJson(path: string, value: unknown, mode: number): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = path + ".tmp-" + process.pid;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode });
  try { chmodSync(temporary, mode); } catch {}
  renameSync(temporary, path);
  try { chmodSync(path, mode); } catch {}
}

export function saveConfig(config: KnockConfig, env: NodeJS.ProcessEnv = process.env): void {
  const { configFile } = resolveConfigPaths(env);
  writeJson(configFile, {
    projectName: config.projectName,
    openUrl: config.openUrl,
    contentMode: config.contentMode,
    notify: config.notify,
    ntfy: {
      enabled: config.ntfy.enabled,
      server: config.ntfy.server,
      topic: config.ntfy.topic,
    },
    pushover: {
      enabled: config.pushover.enabled,
    },
    webhook: {
      enabled: config.webhook.enabled,
      url: config.webhook.url,
    },
  }, 0o600);
}

export function saveCredentials(credentials: KnockCredentials, env: NodeJS.ProcessEnv = process.env): void {
  const { credentialsFile } = resolveConfigPaths(env);
  const output: KnockCredentials = {};

  if (credentials.ntfy) {
    output.ntfy = { accessToken: credentials.ntfy.accessToken ?? "" };
  }
  if (credentials.pushover) {
    output.pushover = {
      userKey: credentials.pushover.userKey ?? "",
      appToken: credentials.pushover.appToken ?? "",
    };
  }
  if (credentials.webhook) {
    output.webhook = { bearerToken: credentials.webhook.bearerToken ?? "" };
  }

  writeJson(credentialsFile, output, 0o600);
}

export function hasConfiguredChannel(config: KnockConfig): boolean {
  return Boolean(
    (config.ntfy.enabled && config.ntfy.topic && config.ntfy.server) ||
    (config.pushover.enabled && config.pushover.userKey && config.pushover.appToken) ||
    (config.webhook.enabled && config.webhook.url)
  );
}
