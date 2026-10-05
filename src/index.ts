import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { hasConfiguredChannel, loadConfig } from "./config.js";
import { registerKnockCommands } from "./commands.js";
import { makeEvent, projectName } from "./format.js";
import { notify } from "./notifier.js";
import type { KnockEventType } from "./types.js";

const SINGLETON_KEY = Symbol.for("pi-knock.runtime");

type PiKnockGlobal = typeof globalThis & { [key: symbol]: unknown };

interface RunState {
  activeRun: boolean;
  startedAt: number | null;
  prompt: string;
  outcome: "completed" | "aborted" | "error";
  lastPromptNotificationKey: string;
  internalUiDepth: number;
}

export default function piKnock(pi: ExtensionAPI): void {
  const runtimeGlobal = globalThis as PiKnockGlobal;
  const instanceToken = Symbol("pi-knock-instance");
  if (runtimeGlobal[SINGLETON_KEY]) return;
  runtimeGlobal[SINGLETON_KEY] = instanceToken;

  const releaseSingleton = () => {
    if (runtimeGlobal[SINGLETON_KEY] === instanceToken) {
      delete runtimeGlobal[SINGLETON_KEY];
    }
  };

  pi.on("session_shutdown", releaseSingleton);

  let config = loadConfig();
  const state: RunState = {
    activeRun: false,
    startedAt: null,
    prompt: "",
    outcome: "completed",
    lastPromptNotificationKey: "",
    internalUiDepth: 0,
  };

  async function withInternalUi<T>(fn: () => Promise<T>): Promise<T> {
    state.internalUiDepth += 1;
    try {
      return await fn();
    } finally {
      state.internalUiDepth = Math.max(0, state.internalUiDepth - 1);
      state.lastPromptNotificationKey = "";
    }
  }

  function reloadConfig() {
    config = loadConfig();
    return config;
  }

  async function deliver(type: KnockEventType, ctx: { cwd: string }, extra: {
    durationMs?: number;
    inputKind?: string;
    inputTitle?: string;
  } = {}): Promise<void> {
    if (!config.notify[type]) return;

    const event = makeEvent({
      type,
      project: projectName(ctx.cwd, config.projectName),
      sessionName: pi.getSessionName() || undefined,
      prompt: state.prompt,
      durationMs: extra.durationMs,
      openUrl: config.openUrl,
      inputKind: extra.inputKind,
      inputTitle: extra.inputTitle,
      contentMode: config.contentMode,
    });
    // Do not hold Pi's settled boundary open while a provider retries. The event is
    // fully materialized above, so the delivery can safely finish in the background.
    void notify(config, event).catch(() => {
      // Delivery failures remain available via /knock doctor without interrupting the user.
    });
  }

  registerKnockCommands(pi, {
    getConfig: () => config,
    reloadConfig,
    withInternalUi,
  });

  pi.on("session_start", async (_event, ctx) => {
    config = loadConfig();
    if (!hasConfiguredChannel(config) && ctx.hasUI) {
      ctx.ui.notify(
        "pi-knock is loaded but not configured. Run /knock setup.",
        "warning",
      );
    }
  });

  pi.on("before_agent_start", async (event) => {
    config = loadConfig();
    state.activeRun = true;
    state.startedAt = Date.now();
    state.prompt = event.prompt;
    state.outcome = "completed";
    state.lastPromptNotificationKey = "";
  });

  pi.on("agent_before_settle", async (event) => {
    state.outcome = event.outcome;
  });

  pi.on("ui_prompt_start", async (event, ctx) => {
    if (!state.activeRun || state.internalUiDepth > 0) return;

    const key = event.kind + ":" + (event.title ?? "");
    if (state.lastPromptNotificationKey === key) return;
    state.lastPromptNotificationKey = key;
    await deliver("input", ctx, { inputKind: event.kind, inputTitle: event.title });
  });

  pi.on("ui_prompt_end", async () => {
    if (state.internalUiDepth > 0) return;
    state.lastPromptNotificationKey = "";
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (!state.activeRun) return;

    const durationMs = state.startedAt === null ? 0 : Date.now() - state.startedAt;
    const type: KnockEventType = state.outcome;

    state.activeRun = false;
    await deliver(type, ctx, { durationMs });

    state.startedAt = null;
    state.prompt = "";
    state.outcome = "completed";
    state.lastPromptNotificationKey = "";
  });
}
