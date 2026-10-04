import assert from "node:assert/strict";
import test from "node:test";
import { DeliveryError } from "../src/errors.ts";
import { runWithRetry } from "../src/notifier.ts";

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
