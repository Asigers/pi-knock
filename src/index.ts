import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { hasConfiguredChannel, loadConfig } from "./config.js";
import { makeEvent, projectName } from "./format.js";
import { notify } from "./notifier.js";
import type { KnockEventType } from "./types.js";

interface RunState {
  startedAt: number | null;
  prompt: string;
  outcome: "completed" | "aborted" | "error";
  lastPromptNotificationKey: string;
}

export default function piKnock(pi: ExtensionAPI): void {
  const config = loadConfig();
  const state: RunState = {
    startedAt: null, prompt: "", outcome: "completed", lastPromptNotificationKey: "",
  };

  async function deliver(type: KnockEventType, ctx: { cwd: string }, extra: {
    durationMs?: number; inputKind?: string; inputTitle?: string;
  } = {}): Promise<void> {
    if (!config.notify[type]) return;
    const event = makeEvent({
      type,
      project: projectName(ctx.cwd, config.projectName),
      prompt: state.prompt,
      durationMs: extra.durationMs,
      openUrl: config.openUrl,
      inputKind: extra.inputKind,
      inputTitle: extra.inputTitle,
    });
    const results = await notify(config, event);
    const failed = results.filter((result) => !result.ok);
    if (failed.length > 0) {
      console.error(
        `[pi-knock] notification failed: ${failed.map((item) => `${item.channel}: ${item.error}`).join("; ")}`
      );
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    if (!hasConfiguredChannel(config) && ctx.hasUI) {
      ctx.ui.notify(
        "pi-knock is loaded, but no notification channel is configured. See README.md for ntfy, Pushover, or webhook setup.",
        "warning",
      );
    }
  });

  pi.on("before_agent_start", async (event) => {
    state.startedAt = Date.now();
    state.prompt = event.prompt;
    state.outcome = "completed";
    state.lastPromptNotificationKey = "";
  });

  pi.on("agent_before_settle", async (event) => {
    state.outcome = event.outcome;
  });

  pi.on("ui_prompt_start", async (event, ctx) => {
    const key = `${event.kind}:${event.title ?? ""}`;
    if (state.lastPromptNotificationKey === key) return;
    state.lastPromptNotificationKey = key;
    await deliver("input", ctx, { inputKind: event.kind, inputTitle: event.title });
  });

  pi.on("ui_prompt_end", async () => {
    state.lastPromptNotificationKey = "";
  });

  pi.on("agent_settled", async (_event, ctx) => {
    const durationMs = state.startedAt === null ? 0 : Date.now() - state.startedAt;
    const minDurationMs = config.minDurationSeconds * 1000;
    const type: KnockEventType = state.outcome;
    const shouldSend = type !== "completed" || durationMs >= minDurationMs;
    if (shouldSend) await deliver(type, ctx, { durationMs });
    state.startedAt = null;
    state.prompt = "";
    state.outcome = "completed";
    state.lastPromptNotificationKey = "";
  });
}
