import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import test from "node:test";
import piKnock from "../src/index.ts";
import { getLastDeliveryReport } from "../src/notifier.ts";

type Handler = (...args: any[]) => Promise<void> | void;

async function flushBackgroundDelivery(): Promise<void> {
  await wait(25);
}

test("lifecycle sends one settled notification, includes session name, and suppresses duplicates", async () => {
  const oldHome = process.env.PI_KNOCK_HOME;
  const oldWebhook = process.env.PI_KNOCK_WEBHOOK_URL;
  const oldMode = process.env.PI_KNOCK_CONTENT_MODE;
  const oldFetch = globalThis.fetch;

  process.env.PI_KNOCK_HOME = mkdtempSync(join(tmpdir(), "pi-knock-lifecycle-"));
  process.env.PI_KNOCK_WEBHOOK_URL = "https://example.com/hook";
  process.env.PI_KNOCK_CONTENT_MODE = "project-only";

  const requests: Array<{ body: any; headers: Record<string, string> }> = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      body: JSON.parse(String(init?.body)),
      headers: init?.headers as Record<string, string>,
    });
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  const handlers = new Map<string, Handler>();
  const commands = new Map<string, any>();
  const pi = {
    on(name: string, handler: Handler) {
      handlers.set(name, handler);
    },
    registerCommand(name: string, command: any) {
      commands.set(name, command);
    },
    getSessionName() {
      return "Auth refactor";
    },
  } as any;

  const ctx = {
    cwd: "/tmp/demo-project",
    hasUI: true,
    ui: {
      notify() {},
      select: async () => "Cancel",
      confirm: async () => false,
      input: async () => undefined,
    },
  };

  try {
    piKnock(pi);

    await handlers.get("before_agent_start")?.({ prompt: "secret prompt text" });
    await handlers.get("ui_prompt_start")?.({ kind: "confirm", title: "Continue?" }, ctx);
    await handlers.get("ui_prompt_start")?.({ kind: "confirm", title: "Continue?" }, ctx);
    assert.equal(requests.length, 1, "duplicate blocking prompts should notify once");

    await handlers.get("agent_before_settle")?.({ outcome: "completed" });
    await handlers.get("agent_settled")?.({}, ctx);
    await handlers.get("agent_settled")?.({}, ctx);

    assert.equal(requests.length, 2, "a settled run should produce one completion notification");
    assert.match(requests[1].body.title, /demo-project · Auth refactor · Task finished/);
    assert.equal(requests[1].body.prompt, undefined);
    assert.doesNotMatch(requests[1].body.message, /secret prompt text/);
    assert.equal(requests[1].headers["X-Pi-Knock-Event-Id"], requests[1].body.id);

    await handlers.get("before_agent_start")?.({ prompt: "next task" });
    await handlers.get("agent_before_settle")?.({ outcome: "aborted" });
    await handlers.get("agent_settled")?.({}, ctx);
    assert.equal(requests.length, 2, "aborted runs are silent by default");

    await handlers.get("before_agent_start")?.({ prompt: "broken task" });
    await handlers.get("agent_before_settle")?.({ outcome: "error" });
    await handlers.get("agent_settled")?.({}, ctx);
    assert.equal(requests.length, 3);
    assert.match(requests[2].body.title, /Task failed/);

    assert.ok(commands.has("knock"));
  } finally {
    await handlers.get("session_shutdown")?.({}, ctx);
    globalThis.fetch = oldFetch;
    if (oldHome === undefined) delete process.env.PI_KNOCK_HOME;
    else process.env.PI_KNOCK_HOME = oldHome;
    if (oldWebhook === undefined) delete process.env.PI_KNOCK_WEBHOOK_URL;
    else process.env.PI_KNOCK_WEBHOOK_URL = oldWebhook;
    if (oldMode === undefined) delete process.env.PI_KNOCK_CONTENT_MODE;
    else process.env.PI_KNOCK_CONTENT_MODE = oldMode;
  }
});

test("failed lifecycle notifications retry silently and preserve diagnostics", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "pi-knock-silent-"));
  const overrides: Record<string, string> = {
    PI_KNOCK_HOME: directory,
    PI_KNOCK_CONFIG: join(directory, "config.json"),
    PI_KNOCK_CREDENTIALS: join(directory, "credentials.json"),
    PI_KNOCK_WEBHOOK_URL: "https://example.com/hook",
    PI_KNOCK_WEBHOOK_ENABLED: "true",
    PI_KNOCK_NTFY_ENABLED: "false",
    PI_KNOCK_PUSHOVER_ENABLED: "false",
    PI_KNOCK_NOTIFY_INPUT: "true",
    PI_KNOCK_NOTIFY_COMPLETED: "true",
    PI_KNOCK_NOTIFY_ERROR: "true",
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

  const errors = t.mock.method(console, "error", () => {});
  const warnings = t.mock.method(console, "warn", () => {});
  const logs = t.mock.method(console, "log", () => {});
  const originalSetTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, "setTimeout", (callback: () => void) => originalSetTimeout(callback, 0));
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    throw new TypeError("fetch failed");
  });

  const handlers = new Map<string, Handler>();
  const pi = {
    on(name: string, handler: Handler) { handlers.set(name, handler); },
    registerCommand() {},
    getSessionName() { return "Silent failures"; },
  } as any;
  const notification = t.mock.fn();
  const ctx = { cwd: "/tmp/demo-project", hasUI: true, ui: { notify: notification } };
  piKnock(pi);

  await handlers.get("session_start")?.({}, ctx);
  await handlers.get("before_agent_start")?.({ prompt: "a task" });
  await handlers.get("ui_prompt_start")?.({ kind: "confirm", title: "Continue?" }, ctx);
  await flushBackgroundDelivery();
  assert.equal(calls, 3);
  assert.equal(getLastDeliveryReport()?.eventType, "input");

  await handlers.get("agent_before_settle")?.({ outcome: "error" });
  await handlers.get("agent_settled")?.({}, ctx);
  await handlers.get("agent_settled")?.({}, ctx);
  await flushBackgroundDelivery();

  assert.equal(calls, 6, "each failed notification retries twice, without duplicate settled delivery");
  assert.equal(notification.mock.callCount(), 0);
  assert.equal(errors.mock.callCount(), 0);
  assert.equal(warnings.mock.callCount(), 0);
  assert.equal(logs.mock.callCount(), 0);
  assert.equal(getLastDeliveryReport()?.eventType, "error");
  assert.deepEqual(getLastDeliveryReport()?.results, [{
    channel: "webhook", ok: false, attempts: 3, error: "fetch failed",
  }]);
  await handlers.get("session_shutdown")?.({}, ctx);
});

test("duplicate pi-knock runtimes are ignored within one process", async () => {
  const firstHandlers = new Map<string, Handler>();
  const secondHandlers = new Map<string, Handler>();
  const firstCommands = new Map<string, unknown>();
  const secondCommands = new Map<string, unknown>();

  function makePi(handlers: Map<string, Handler>, commands: Map<string, unknown>) {
    return {
      on(name: string, handler: Handler) { handlers.set(name, handler); },
      registerCommand(name: string, command: unknown) { commands.set(name, command); },
      getSessionName() { return "Duplicate check"; },
    } as any;
  }

  piKnock(makePi(firstHandlers, firstCommands));
  piKnock(makePi(secondHandlers, secondCommands));

  assert.ok(firstCommands.has("knock"));
  assert.equal(secondCommands.size, 0);
  assert.ok(firstHandlers.has("agent_settled"));
  assert.equal(secondHandlers.size, 0);
  await firstHandlers.get("session_shutdown")?.({}, { hasUI: false });
});
