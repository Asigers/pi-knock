import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  loadStoredCredentials,
  resolveConfigPaths,
  saveConfig,
  saveCredentials,
} from "./config.js";
import { projectName } from "./format.js";
import { notify } from "./notifier.js";
import type { ChannelName, KnockConfig, KnockCredentials, KnockEvent } from "./types.js";

interface CommandOptions {
  getConfig: () => KnockConfig;
  reloadConfig: () => KnockConfig;
  withInternalUi: <T>(fn: () => Promise<T>) => Promise<T>;
}

function channelState(enabled: boolean, ready: boolean): string {
  if (!enabled) return "○ disabled";
  return ready ? "✓ configured" : "! incomplete";
}

function statusText(config: KnockConfig): string {
  const paths = resolveConfigPaths();
  return [
    "pi-knock",
    "",
    "Pushover  " + channelState(config.pushover.enabled, Boolean(config.pushover.userKey && config.pushover.appToken)),
    "ntfy      " + channelState(config.ntfy.enabled, Boolean(config.ntfy.server && config.ntfy.topic)),
    "Webhook   " + channelState(config.webhook.enabled, Boolean(config.webhook.url)),
    "",
    "Min duration  " + config.minDurationSeconds + "s",
    "Task done     " + (config.notify.completed ? "✓" : "○"),
    "Needs input   " + (config.notify.input ? "✓" : "○"),
    "Errors        " + (config.notify.error ? "✓" : "○"),
    "Aborted       " + (config.notify.aborted ? "✓" : "○"),
    "",
    "Config        " + paths.configFile,
    "Credentials   " + paths.credentialsFile,
  ].join("\n");
}

function testEvent(config: KnockConfig, cwd: string): KnockEvent {
  const project = projectName(cwd, config.projectName);
  return {
    type: "completed",
    title: project + " · pi-knock test",
    message: "Notifications are working.",
    project,
    openUrl: config.openUrl || undefined,
    timestamp: new Date().toISOString(),
  };
}

async function sendTest(
  config: KnockConfig,
  cwd: string,
  onlyChannels?: ChannelName[],
): Promise<string> {
  const results = await notify(config, testEvent(config, cwd), onlyChannels);
  if (results.length === 0) return "No configured notification channel matched this test.";
  return results
    .map((result) => result.ok ? "✓ " + result.channel : "✗ " + result.channel + ": " + result.error)
    .join("\n");
}

function configWithPushover(config: KnockConfig): KnockConfig {
  return {
    ...config,
    pushover: { ...config.pushover, enabled: true },
  };
}

export function registerKnockCommands(pi: ExtensionAPI, options: CommandOptions): void {
  pi.registerCommand("knock", {
    description: "Configure and test pi-knock notifications: /knock setup|status|test",
    handler: async (args, ctx) => {
      await options.withInternalUi(async () => {
        const action = args.trim().toLowerCase();

        if (!action || action === "status") {
          ctx.ui.notify(statusText(options.getConfig()), "info");
          return;
        }

        if (action === "test") {
          const result = await sendTest(options.getConfig(), ctx.cwd);
          ctx.ui.notify(result, result.includes("✗") || result.startsWith("No ") ? "warning" : "info");
          return;
        }

        if (action !== "setup") {
          ctx.ui.notify("Usage: /knock setup | /knock status | /knock test", "info");
          return;
        }

        const provider = await ctx.ui.select(
          "Choose a notification provider",
          ["Pushover (iPhone / Apple Watch)", "ntfy", "Webhook", "Cancel"],
        );
        if (!provider || provider === "Cancel") return;

        const current = options.getConfig();
        const credentials: KnockCredentials = loadStoredCredentials();

        if (provider.startsWith("Pushover")) {
          ctx.ui.notify(
            "Pi's standard input is not masked. Enter credentials only in a private terminal. They will be stored in credentials.json with owner-only file permissions where supported.",
            "warning",
          );

          if (current.pushover.userKey && current.pushover.appToken) {
            const replace = await ctx.ui.confirm(
              "Pushover is already configured",
              "Replace the stored Pushover credentials?",
            );
            if (!replace) return;
          }

          const userKey = await ctx.ui.input("Pushover User Key", "paste your user key");
          if (!userKey?.trim()) return;

          const appToken = await ctx.ui.input("Pushover Application API Token", "paste your app token");
          if (!appToken?.trim()) return;

          credentials.pushover = {
            userKey: userKey.trim(),
            appToken: appToken.trim(),
          };
          saveCredentials(credentials);
          saveConfig(configWithPushover(current));
          const updated = options.reloadConfig();

          const result = await sendTest(updated, ctx.cwd, ["pushover"]);
          ctx.ui.notify(
            "Pushover saved.\n" + result,
            result.includes("✗") ? "warning" : "info",
          );
          return;
        }

        if (provider === "ntfy") {
          const serverInput = await ctx.ui.input(
            "ntfy server",
            current.ntfy.server || "https://ntfy.sh",
          );
          if (serverInput === undefined) return;
          const server = serverInput.trim() || current.ntfy.server || "https://ntfy.sh";

          const topic = await ctx.ui.input("ntfy topic", current.ntfy.topic || "private-topic");
          if (!topic?.trim()) return;

          const useToken = await ctx.ui.confirm(
            "ntfy authentication",
            "Use an access token? Choose No for public topics.",
          );
          let accessToken = "";
          if (useToken) {
            const token = await ctx.ui.input("ntfy access token", "paste token");
            if (!token?.trim()) return;
            accessToken = token.trim();
          }

          credentials.ntfy = { accessToken };
          saveCredentials(credentials);
          saveConfig({
            ...current,
            ntfy: {
              ...current.ntfy,
              enabled: true,
              server,
              topic: topic.trim(),
            },
          });
          const updated = options.reloadConfig();

          const result = await sendTest(updated, ctx.cwd, ["ntfy"]);
          ctx.ui.notify("ntfy saved.\n" + result, result.includes("✗") ? "warning" : "info");
          return;
        }

        if (provider === "Webhook") {
          const url = await ctx.ui.input("Webhook URL", current.webhook.url || "https://example.com/hook");
          if (!url?.trim()) return;

          const useBearer = await ctx.ui.confirm(
            "Webhook authentication",
            "Use a bearer token?",
          );
          let bearerToken = "";
          if (useBearer) {
            const token = await ctx.ui.input("Webhook bearer token", "paste token");
            if (!token?.trim()) return;
            bearerToken = token.trim();
          }

          credentials.webhook = { bearerToken };
          saveCredentials(credentials);
          saveConfig({
            ...current,
            webhook: {
              ...current.webhook,
              enabled: true,
              url: url.trim(),
            },
          });
          const updated = options.reloadConfig();

          const result = await sendTest(updated, ctx.cwd, ["webhook"]);
          ctx.ui.notify("Webhook saved.\n" + result, result.includes("✗") ? "warning" : "info");
        }
      });
    },
  });
}
