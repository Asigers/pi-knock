import assert from "node:assert/strict";
import test from "node:test";
import { compactText, formatDuration, makeEvent } from "../src/format.ts";

test("compactText normalizes whitespace and truncates", () => {
  assert.equal(compactText("  hello\n  world  "), "hello world");
  assert.equal(compactText("abcdefgh", 5), "abcd…");
});

test("formatDuration produces readable durations", () => {
  assert.equal(formatDuration(9_600), "10s");
  assert.equal(formatDuration(65_000), "1m 5s");
  assert.equal(formatDuration(3_600_000), "1h");
});

test("makeEvent includes project, prompt and duration", () => {
  const event = makeEvent({
    type: "completed", project: "demo", prompt: "Fix the test suite", durationMs: 65_000,
  });
  assert.equal(event.title, "demo · Task finished");
  assert.match(event.message, /Fix the test suite/);
  assert.match(event.message, /1m 5s/);
});


test("makeEvent can hide prompt text and include a session name", () => {
  const event = makeEvent({
    type: "completed",
    project: "demo",
    sessionName: "Auth refactor",
    prompt: "sensitive production prompt",
    durationMs: 65_000,
    contentMode: "project-only",
  });

  assert.match(event.title, /demo · Auth refactor · Task finished/);
  assert.equal(event.prompt, undefined);
  assert.doesNotMatch(event.message, /sensitive production prompt/);
  assert.ok(event.id);
});
