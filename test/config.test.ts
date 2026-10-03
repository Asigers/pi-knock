import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.ts";

test("environment variables configure channels", () => {
  const config = loadConfig({
    PI_KNOCK_CONFIG: "/path/that/does/not/exist",
    PI_KNOCK_MIN_DURATION: "45",
    PI_KNOCK_NTFY_TOPIC: "agent-events",
    PI_KNOCK_NTFY_TOKEN: "secret",
    PI_KNOCK_PUSHOVER_USER: "user-key",
    PI_KNOCK_PUSHOVER_TOKEN: "app-token",
    PI_KNOCK_NOTIFY_ABORTED: "true",
  });
  assert.equal(config.minDurationSeconds, 45);
  assert.equal(config.ntfy.topic, "agent-events");
  assert.equal(config.ntfy.token, "secret");
  assert.equal(config.pushover.user, "user-key");
  assert.equal(config.pushover.token, "app-token");
  assert.equal(config.notify.aborted, true);
});

test("invalid duration falls back to default", () => {
  const config = loadConfig({
    PI_KNOCK_CONFIG: "/path/that/does/not/exist",
    PI_KNOCK_MIN_DURATION: "oops",
  });
  assert.equal(config.minDurationSeconds, 30);
});
