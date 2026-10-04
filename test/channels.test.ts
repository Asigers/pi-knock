import assert from "node:assert/strict";
import test from "node:test";
import { sendNtfy } from "../src/channels/ntfy.ts";
import { sendPushover } from "../src/channels/pushover.ts";
import { sendWebhook } from "../src/channels/webhook.ts";
import { DeliveryError } from "../src/errors.ts";
import type { KnockEvent } from "../src/types.ts";

const event: KnockEvent = {
  id: "event-123",
  type: "completed",
  title: "demo · Task finished",
  message: "Finished in 1m",
  project: "demo",
  timestamp: "2026-10-04T00:00:00.000Z",
  openUrl: "https://example.com/session",
};

test("Pushover sends the expected form payload", async (t) => {
  const originalFetch = globalThis.fetch;
  let timeoutMs: number | undefined;
  t.mock.method(AbortSignal, "timeout", (ms: number) => {
    timeoutMs = ms;
    return new AbortController().signal;
  });
  let request: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init };
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  try {
    await sendPushover(
      { enabled: true, userKey: "user-key", appToken: "app-token" },
      event,
    );
    assert.equal(request?.url, "https://api.pushover.net/1/messages.json");
    assert.equal(timeoutMs, 10_000);
    const body = request?.init?.body as URLSearchParams;
    assert.equal(body.get("user"), "user-key");
    assert.equal(body.get("token"), "app-token");
    assert.equal(body.get("url"), event.openUrl);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Pushover turns request timeouts into retryable delivery errors", async (t) => {
  const reason = new DOMException("The operation was aborted due to timeout", "TimeoutError");
  t.mock.method(AbortSignal, "timeout", () => AbortSignal.abort(reason));
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    throw init?.signal?.reason;
  });

  await assert.rejects(
    sendPushover({ enabled: true, userKey: "user-key", appToken: "app-token" }, event),
    (error: unknown) => {
      assert.ok(error instanceof DeliveryError);
      assert.equal(error.retryable, true);
      assert.equal(error.message, "Pushover request timed out after 10s");
      return true;
    },
  );
});

test("Pushover preserves network errors that are not timeouts", async (t) => {
  const failure = new TypeError("fetch failed");
  t.mock.method(AbortSignal, "timeout", () => new AbortController().signal);
  t.mock.method(globalThis, "fetch", async () => { throw failure; });

  await assert.rejects(
    sendPushover({ enabled: true, userKey: "user-key", appToken: "app-token" }, event),
    (error: unknown) => error === failure,
  );
});

test("ntfy encodes topics and includes the event id", async () => {
  const originalFetch = globalThis.fetch;
  let request: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init };
    return new Response("", { status: 200 });
  }) as typeof fetch;

  try {
    await sendNtfy(
      {
        enabled: true,
        server: "https://ntfy.example/",
        topic: "pi alerts",
        accessToken: "secret",
      },
      event,
    );
    assert.equal(request?.url, "https://ntfy.example/pi%20alerts");
    const headers = request?.init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer secret");
    assert.equal(headers["X-Pi-Knock-Event-Id"], event.id);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("webhook sends a JSON event with a stable event id header", async () => {
  const originalFetch = globalThis.fetch;
  let request: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init };
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    await sendWebhook(
      { enabled: true, url: "https://example.com/hook", bearerToken: "token" },
      event,
    );
    assert.equal(request?.url, "https://example.com/hook");
    const headers = request?.init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer token");
    assert.equal(headers["X-Pi-Knock-Event-Id"], event.id);
    assert.deepEqual(JSON.parse(String(request?.init?.body)), event);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
