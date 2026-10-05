import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadLastDeliveryReport, saveLastDeliveryReport } from "../src/delivery-report.ts";
import type { DeliveryReport } from "../src/notifier.ts";

function report(): DeliveryReport {
  return {
    timestamp: "2026-10-04T00:00:00.000Z",
    eventType: "error",
    results: [{
      channel: "pushover",
      ok: false,
      attempts: 3,
      error: "Pushover request timed out after 10s",
    }],
  };
}

test("delivery reports persist without notification content or credentials", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "pi-knock-report-"));
  const reportFile = join(directory, "last-delivery.json");
  const oldPath = process.env.PI_KNOCK_DELIVERY_REPORT;
  const oldPersist = process.env.PI_KNOCK_PERSIST_TEST_REPORTS;
  process.env.PI_KNOCK_DELIVERY_REPORT = reportFile;
  process.env.PI_KNOCK_PERSIST_TEST_REPORTS = "1";
  t.after(() => {
    if (oldPath === undefined) delete process.env.PI_KNOCK_DELIVERY_REPORT;
    else process.env.PI_KNOCK_DELIVERY_REPORT = oldPath;
    if (oldPersist === undefined) delete process.env.PI_KNOCK_PERSIST_TEST_REPORTS;
    else process.env.PI_KNOCK_PERSIST_TEST_REPORTS = oldPersist;
    rmSync(directory, { recursive: true, force: true });
  });

  saveLastDeliveryReport(report());

  assert.deepEqual(loadLastDeliveryReport(), report());
  const raw = readFileSync(reportFile, "utf8");
  assert.doesNotMatch(raw, /token|user|message|prompt|secret/i);
  assert.equal(statSync(reportFile).mode & 0o777, 0o600);
});
