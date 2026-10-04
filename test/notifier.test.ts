import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { DeliveryError, httpDeliveryError } from "../src/errors.ts";
import { getLastDeliveryReport, notify, runWithRetry } from "../src/notifier.ts";
import type { KnockConfig, KnockEvent } from "../src/types.ts";

const config: KnockConfig = {
  projectName: "demo",
  openUrl: "",
  contentMode: "project-only",
  notify: { completed: true, error: true, aborted: false, input: true },
  ntfy: { enabled: false, server: "https://ntfy.sh", topic: "", accessToken: "" },
  pushover: { enabled: true, userKey: "user-key", appToken: "app-token" },
  webhook: { enabled: false, url: "", bearerToken: "" },
};
const event: KnockEvent = {
  id: "event-123",
  type: "completed",
  title: "demo · Task finished",
  message: "Finished in 1m",
  project: "demo",
  timestamp: "2026-10-04T00:00:00.000Z",
};

function mockDeliveryTimers(t: TestContext) {
  const delays: number[] = [];
  const timeouts: number[] = [];
  const controllers: AbortController[] = [];
  const originalSetTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, "setTimeout", (callback: () => void, ms: number) => {
    delays.push(ms);
    return originalSetTimeout(callback, 0);
  });
  t.mock.method(AbortSignal, "timeout", (ms: number) => {
    timeouts.push(ms);
    const controller = new AbortController();
    controllers.push(controller);
    return controller.signal;
  });
  return { delays, timeouts, controllers };
}

test("runWithRetry succeeds after transient failures", async () => {
  let calls = 0;
  const result = await runWithRetry(
    "webhook",
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("temporary network failure");
    },
    { retryDelaysMs: [1, 1], sleep: async () => {} },
  );

  assert.equal(result.ok, true);
  assert.equal(result.attempts, 3);
  assert.equal(calls, 3);
});

test("runWithRetry does not retry permanent delivery errors", async () => {
  let calls = 0;
  const result = await runWithRetry(
    "pushover",
    async () => {
      calls += 1;
      throw new DeliveryError("Pushover returned 400", false);
    },
    { retryDelaysMs: [1, 1], sleep: async () => {} },
  );

  assert.equal(result.ok, false);
  assert.equal(result.attempts, 1);
  assert.equal(calls, 1);
});

test("runWithRetry caps persistent network failures at three attempts", async () => {
  let calls = 0;
  const delays: number[] = [];
  const result = await runWithRetry(
    "webhook",
    async () => {
      calls += 1;
      throw new TypeError("fetch failed");
    },
    { sleep: async (ms) => { delays.push(ms); } },
  );

  assert.deepEqual(result, { channel: "webhook", ok: false, attempts: 3, error: "fetch failed" });
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1_000, 3_000]);
});

test("runWithRetry retries transient HTTP errors", async (t) => {
  for (const status of [408, 425, 429, 500, 502, 503, 504]) {
    await t.test(String(status), async () => {
      let calls = 0;
      const result = await runWithRetry(
        "pushover",
        async () => {
          calls += 1;
          if (calls === 1) throw httpDeliveryError("Pushover", status);
        },
        { sleep: async () => {} },
      );
      assert.deepEqual(result, { channel: "pushover", ok: true, attempts: 2 });
      assert.equal(calls, 2);
    });
  }
});

test("runWithRetry does not retry permanent HTTP errors", async (t) => {
  for (const status of [400, 401, 403, 404]) {
    await t.test(String(status), async () => {
      let calls = 0;
      const result = await runWithRetry(
        "pushover",
        async () => {
          calls += 1;
          throw httpDeliveryError("Pushover", status);
        },
        { sleep: async () => { assert.fail("permanent errors must not schedule a retry"); } },
      );
      assert.deepEqual(result, {
        channel: "pushover", ok: false, attempts: 1, error: "Pushover returned " + status,
      });
      assert.equal(calls, 1);
    });
  }
});

test("notify retries Pushover timeouts with backoff and fresh request signals", async (t) => {
  const { delays, timeouts, controllers } = mockDeliveryTimers(t);
  const bodies: string[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    bodies.push(String(init?.body));
    const controller = controllers.at(-1)!;
    assert.equal(init?.signal, controller.signal);
    if (bodies.length < 3) {
      controller.abort(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
      throw controller.signal.reason;
    }
    return new Response('{"status":1}', { status: 200 });
  });

  const results = await notify(config, event);

  assert.deepEqual(results, [{ channel: "pushover", ok: true, attempts: 3 }]);
  assert.deepEqual(delays, [5_000, 10_000]);
  assert.deepEqual(timeouts, [10_000, 10_000, 10_000]);
  assert.equal(new Set(controllers.map((controller) => controller.signal)).size, 3);
  assert.deepEqual(controllers.map((controller) => controller.signal.aborted), [true, true, false]);
  assert.deepEqual(bodies, [bodies[0], bodies[0], bodies[0]]);
  assert.deepEqual(getLastDeliveryReport()?.results, results);
});

test("notify reports exhausted Pushover timeouts without a fourth attempt", async (t) => {
  const { delays, timeouts, controllers } = mockDeliveryTimers(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls += 1;
    const controller = controllers.at(-1)!;
    assert.equal(init?.signal, controller.signal);
    controller.abort(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    throw controller.signal.reason;
  });

  const results = await notify(config, event);

  assert.deepEqual(results, [{
    channel: "pushover", ok: false, attempts: 3, error: "Pushover request timed out after 10s",
  }]);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [5_000, 10_000]);
  assert.deepEqual(timeouts, [10_000, 10_000, 10_000]);
  assert.deepEqual(getLastDeliveryReport()?.results, results);
});

test("notify does not retry rejected Pushover credentials", async (t) => {
  const { delays, timeouts } = mockDeliveryTimers(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    return new Response('{"status":0}', { status: 400 });
  });

  const results = await notify(config, event);

  assert.deepEqual(results, [{ channel: "pushover", ok: false, attempts: 1, error: "Pushover returned 400" }]);
  assert.equal(calls, 1);
  assert.deepEqual(delays, []);
  assert.deepEqual(timeouts, [10_000]);
});

test("notify only retries the failing channel", async (t) => {
  const { delays } = mockDeliveryTimers(t);
  let pushoverCalls = 0;
  let webhookCalls = 0;
  t.mock.method(globalThis, "fetch", async (url: unknown) => {
    if (String(url) === "https://api.pushover.net/1/messages.json") {
      pushoverCalls += 1;
      return new Response("{}", { status: pushoverCalls === 1 ? 503 : 200 });
    }
    webhookCalls += 1;
    return new Response(null, { status: 204 });
  });

  const results = await notify({
    ...config,
    webhook: { enabled: true, url: "https://example.com/hook", bearerToken: "" },
  }, event);

  assert.deepEqual(results, [
    { channel: "pushover", ok: true, attempts: 2 },
    { channel: "webhook", ok: true, attempts: 1 },
  ]);
  assert.equal(pushoverCalls, 2);
  assert.equal(webhookCalls, 1);
  assert.deepEqual(delays, [5_000]);
});
