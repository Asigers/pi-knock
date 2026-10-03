import { basename } from "node:path";
import type { KnockEvent, KnockEventType } from "./types.js";

export function projectName(cwd: string, configuredName = ""): string {
  return configuredName.trim() || basename(cwd) || "Pi";
}

export function compactText(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes ? `${hours}h ${remainMinutes}m` : `${hours}h`;
}

function label(type: KnockEventType): string {
  switch (type) {
    case "completed": return "Task finished";
    case "error": return "Task failed";
    case "aborted": return "Task stopped";
    case "input": return "Needs your attention";
  }
}

export function makeEvent(input: {
  type: KnockEventType;
  project: string;
  prompt?: string;
  durationMs?: number;
  openUrl?: string;
  inputKind?: string;
  inputTitle?: string;
}): KnockEvent {
  const prompt = input.prompt ? compactText(input.prompt) : undefined;
  const duration = input.durationMs === undefined ? "" : ` · ${formatDuration(input.durationMs)}`;
  const title = `${input.project} · ${label(input.type)}`;
  let message: string;
  if (input.type === "input") {
    const detail = compactText(input.inputTitle || input.inputKind || "Pi is waiting for input", 100);
    message = prompt ? `${detail}\n${prompt}` : detail;
  } else {
    message = prompt ? `${prompt}${duration}` : `${label(input.type)}${duration}`;
  }
  return {
    type: input.type, title, message, project: input.project, prompt,
    durationMs: input.durationMs, openUrl: input.openUrl || undefined,
    timestamp: new Date().toISOString(), inputKind: input.inputKind,
  };
}
