import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { registerKnockCommands } from "../src/commands.ts";
import { getLastDeliveryReport } from "../src/notifier.ts";
import type { ChannelName, KnockConfig } from "../src/types.ts";

const config: KnockConfig = {
  projectName: "demo",
  openUrl: "",
  contentMode: "project-only",
  notify: { completed: true, error: true, aborted: false, input: true },
  ntfy: { enabled: false, server: "https://ntfy.example", topic: "demo-topic", accessToken: "" },
  pushover: { enabled: true, userKey: "user-key", appToken: "app-token" },
  webhook: { enabled: false, url: "https://example.com/hook", bearerToken: "" },
};
const disabledConfig: KnockConfig = {
  ...config,
  pushover: { enabled: false, userKey: "", appToken: "" },
};

type CommandHandler = (args: string, ctx: ExtensionCommandContext) => Promise<void> | void;

function commandHarness(current: KnockConfig, reloadConfig = () => current) {
  const messages: Array<{ message: string; level?: string }> = [];
  const ui = {
    notify(message: string, level?: string) { messages.push({ message, level }); },
    select: async (): Promise<string | undefined> => "Cancel",
    input: async (_title: string): Promise<string | undefined> => undefined,
    confirm: async () => false,
  };
  let handler: CommandHandler | undefined;
  const pi = {
    registerCommand(name: string, command: { handler: CommandHandler }) {
      assert.equal(name, "knock");
      handler = command.handler;
    },
  } as ExtensionAPI;
  const ctx = { cwd: "/tmp/demo", hasUI: true, ui } as unknown as ExtensionCommandContext;
  registerKnockCommands(pi, {
    getConfig: () => current,
    reloadConfig,
    withInternalUi: async (fn) => fn(),
  });
  return {
    messages,
    ui,
    async run(action: string) {
      assert.ok(handler);
      await handler(action, ctx);
    },
  };
}

function fastRetries(t: TestContext) {
  const delays: number[] = [];
  const originalSetTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, "setTimeout", (callback: () => void, ms: number) => {
    delays.push(ms);
    return originalSetTimeout(callback, 0);
  });
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  return delays;
}

function isolateConfig(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "pi-knock-commands-"));
  const overrides = {
    PI_KNOCK_HOME: directory,
    PI_KNOCK_CONFIG: join(directory, "config.json"),
    PI_KNOCK_CREDENTIALS: join(directory, "credentials.json"),
  };
  const previous = Object.fromEntries(Object.keys(overrides).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  });
  return overrides;
}

test("test command stays silent after timeouts while doctor retains diagnostics", async (t) => {
  const delays = fastRetries(t);
  const reason = new DOMException("The operation was aborted due to timeout", "TimeoutError");
  t.mock.method(AbortSignal, "timeout", () => AbortSignal.abort(reason));
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls += 1; throw reason; });
  const harness = commandHarness(config);

  await harness.run("test");

  assert.equal(harness.messages.length, 0);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [5_000, 10_000]);
  assert.deepEqual(getLastDeliveryReport()?.results, [{
    channel: "pushover", ok: false, attempts: 3, error: "Pushover request timed out after 10s",
  }]);

  await harness.run("doctor");

  assert.equal(harness.messages.length, 1);
  assert.equal(harness.messages[0].level, "info");
  assert.match(harness.messages[0].message, /pushover\s+✗ \(3 attempts\)/);
  assert.match(harness.messages[0].message, /Pushover request timed out after 10s/);
});

test("test command is silent when no channel is configured", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    assert.fail("unconfigured channels must not send requests");
  });
  const harness = commandHarness(disabledConfig);

  await harness.run("test");

  assert.deepEqual(harness.messages, []);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.deepEqual(getLastDeliveryReport()?.results, []);
});

test("test command only displays successful channels", async (t) => {
  fastRetries(t);
  t.mock.method(globalThis, "fetch", async (url: unknown) => {
    return new Response("{}", { status: String(url).includes("pushover.net") ? 400 : 200 });
  });
  const harness = commandHarness({ ...config, webhook: { ...config.webhook, enabled: true } });

  await harness.run("test");

  assert.deepEqual(harness.messages, [{ message: "✓ webhook", level: "info" }]);
  assert.deepEqual(getLastDeliveryReport()?.results, [
    { channel: "pushover", ok: false, attempts: 1, error: "Pushover returned 400" },
    { channel: "webhook", ok: true, attempts: 1 },
  ]);
});

test("test command still reports success after retry", async (t) => {
  const delays = fastRetries(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("fetch failed");
    return new Response('{"status":1}', { status: 200 });
  });
  const harness = commandHarness(config);

  await harness.run("test");

  assert.deepEqual(harness.messages, [{ message: "✓ pushover after 2 attempts", level: "info" }]);
  assert.equal(calls, 2);
  assert.deepEqual(delays, [5_000]);
});

test("setup tests only report successful delivery and still save configuration", async (t) => {
  const providers: Array<{ provider: string; label: string; channel: ChannelName; updated: KnockConfig }> = [
    { provider: "Pushover (iPhone / Apple Watch)", label: "Pushover", channel: "pushover", updated: config },
    { provider: "ntfy", label: "ntfy", channel: "ntfy", updated: {
      ...disabledConfig, ntfy: { ...config.ntfy, enabled: true },
    } },
    { provider: "Webhook", label: "Webhook", channel: "webhook", updated: {
      ...disabledConfig, webhook: { ...config.webhook, enabled: true },
    } },
  ];
  const inputs: Record<string, string> = {
    "Pushover User Key": "user-key",
    "Pushover Application API Token": "app-token",
    "ntfy server": "https://ntfy.example",
    "ntfy topic": "demo-topic",
    "Webhook URL": "https://example.com/hook",
  };
  for (const { provider, label, channel, updated } of providers) {
    for (const ok of [false, true]) {
      await t.test(channel + (ok ? " success" : " failure"), async (t) => {
        const paths = isolateConfig(t);
        fastRetries(t);
        const fetchMock = t.mock.method(globalThis, "fetch", async () => {
          return new Response("{}", { status: ok ? 200 : 400 });
        });
        const harness = commandHarness(disabledConfig, () => updated);
        t.mock.method(harness.ui, "select", async () => provider);
        t.mock.method(harness.ui, "input", async (title: string) => inputs[title]);

        await harness.run("setup");

        const privacyMessages = harness.messages.filter((item) => item.message.startsWith("Pi's standard input is not masked."));
        assert.equal(privacyMessages.length, channel === "pushover" ? 1 : 0);
        const deliveryMessages = harness.messages.filter((item) => !privacyMessages.includes(item));
        assert.deepEqual(deliveryMessages, ok ? [{ message: label + " saved.\n✓ " + channel, level: "info" }] : []);
        assert.equal(fetchMock.mock.callCount(), 1);
        assert.equal(JSON.parse(readFileSync(paths.PI_KNOCK_CONFIG, "utf8"))[channel].enabled, true);
        assert.ok(JSON.parse(readFileSync(paths.PI_KNOCK_CREDENTIALS, "utf8"))[channel]);
        assert.deepEqual(getLastDeliveryReport()?.results, [ok
          ? { channel, ok: true, attempts: 1 }
          : { channel, ok: false, attempts: 1, error: label + " returned 400" },
        ]);
      });
    }
  }
});
