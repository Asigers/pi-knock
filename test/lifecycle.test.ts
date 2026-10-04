import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import piKnock from "../src/index.ts";

type Handler = (...args: any[]) => Promise<void> | void;

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
    globalThis.fetch = oldFetch;
    if (oldHome === undefined) delete process.env.PI_KNOCK_HOME;
    else process.env.PI_KNOCK_HOME = oldHome;
    if (oldWebhook === undefined) delete process.env.PI_KNOCK_WEBHOOK_URL;
    else process.env.PI_KNOCK_WEBHOOK_URL = oldWebhook;
    if (oldMode === undefined) delete process.env.PI_KNOCK_CONTENT_MODE;
    else process.env.PI_KNOCK_CONTENT_MODE = oldMode;
  }
});
