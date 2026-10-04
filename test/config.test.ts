import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  loadConfig,
  loadStoredCredentials,
  resolveConfigPaths,
  saveConfig,
  saveCredentials,
} from "../src/config.ts";

function tempEnv(): NodeJS.ProcessEnv {
  const home = mkdtempSync(join(tmpdir(), "pi-knock-test-"));
  return { PI_KNOCK_HOME: home };
}

test("new environment variable names configure channels", () => {
  const env: NodeJS.ProcessEnv = {
    PI_KNOCK_HOME: "/path/that/does/not/exist",
    PI_KNOCK_NTFY_TOPIC: "agent-events",
    PI_KNOCK_NTFY_ACCESS_TOKEN: "secret",
    PI_KNOCK_PUSHOVER_USER_KEY: "user-key",
    PI_KNOCK_PUSHOVER_APP_TOKEN: "app-token",
    PI_KNOCK_NOTIFY_ABORTED: "true",
    PI_KNOCK_CONTENT_MODE: "prompt",
  };
  const config = loadConfig(env);
  assert.equal(config.ntfy.topic, "agent-events");
  assert.equal(config.ntfy.accessToken, "secret");
  assert.equal(config.ntfy.enabled, true);
  assert.equal(config.pushover.userKey, "user-key");
  assert.equal(config.pushover.appToken, "app-token");
  assert.equal(config.pushover.enabled, true);
  assert.equal(config.notify.aborted, true);
  assert.equal(config.contentMode, "prompt");
});

test("legacy environment variable names remain supported", () => {
  const config = loadConfig({
    PI_KNOCK_HOME: "/path/that/does/not/exist",
    PI_KNOCK_PUSHOVER_USER: "legacy-user",
    PI_KNOCK_PUSHOVER_TOKEN: "legacy-token",
    PI_KNOCK_NTFY_TOKEN: "legacy-ntfy",
  });
  assert.equal(config.pushover.userKey, "legacy-user");
  assert.equal(config.pushover.appToken, "legacy-token");
  assert.equal(config.pushover.enabled, true);
  assert.equal(config.ntfy.accessToken, "legacy-ntfy");
});

test("removed minimum-duration setting is ignored", () => {
  const env = tempEnv();
  const { configFile } = resolveConfigPaths(env);
  writeFileSync(configFile, JSON.stringify({
    minDurationSeconds: 999,
    projectName: "demo",
  }));

  const config = loadConfig(env);
  assert.equal(config.projectName, "demo");
  assert.equal("minDurationSeconds" in config, false);
});

test("credentials are stored separately from normal config", () => {
  const env = tempEnv();
  const config = loadConfig(env);
  config.pushover.enabled = true;

  saveConfig(config, env);
  saveCredentials({
    pushover: { userKey: "user-key", appToken: "app-token" },
  }, env);

  const paths = resolveConfigPaths(env);
  const configText = readFileSync(paths.configFile, "utf8");
  const credentialsText = readFileSync(paths.credentialsFile, "utf8");

  assert.doesNotMatch(configText, /user-key|app-token/);
  assert.doesNotMatch(configText, /minDurationSeconds/);
  assert.match(credentialsText, /user-key/);
  assert.match(credentialsText, /app-token/);

  const loaded = loadConfig(env);
  assert.equal(loaded.pushover.enabled, true);
  assert.equal(loaded.pushover.userKey, "user-key");
  assert.equal(loaded.pushover.appToken, "app-token");
});

test("saved credential file uses owner-only permissions on POSIX", { skip: process.platform === "win32" }, () => {
  const env = tempEnv();
  saveCredentials({
    pushover: { userKey: "user-key", appToken: "app-token" },
  }, env);

  const { credentialsFile } = resolveConfigPaths(env);
  assert.equal(statSync(credentialsFile).mode & 0o777, 0o600);
});

test("saving one provider does not shadow legacy credentials for another provider", () => {
  const env = tempEnv();
  const paths = resolveConfigPaths(env);
  writeFileSync(paths.configFile, JSON.stringify({
    ntfy: { enabled: true, server: "https://ntfy.sh", topic: "legacy-topic", token: "legacy-token" },
  }));

  saveCredentials({
    pushover: { userKey: "user-key", appToken: "app-token" },
  }, env);

  const loaded = loadConfig(env);
  assert.equal(loaded.ntfy.accessToken, "legacy-token");
  assert.equal(loaded.pushover.userKey, "user-key");
});

test("loadStoredCredentials never reads environment secrets", () => {
  const env = tempEnv();
  env.PI_KNOCK_PUSHOVER_USER_KEY = "env-user";
  env.PI_KNOCK_PUSHOVER_APP_TOKEN = "env-token";

  const stored = loadStoredCredentials(env);
  assert.equal(stored.pushover, undefined);
});


test("project-only is the safe default and is persisted", () => {
  const env = tempEnv();
  const config = loadConfig(env);
  assert.equal(config.contentMode, "project-only");

  config.contentMode = "prompt";
  saveConfig(config, env);

  const saved = JSON.parse(readFileSync(resolveConfigPaths(env).configFile, "utf8"));
  assert.equal(saved.contentMode, "prompt");
  assert.equal(loadConfig(env).contentMode, "prompt");
});
