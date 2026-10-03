export type KnockEventType = "completed" | "error" | "aborted" | "input";

export interface KnockEvent {
  type: KnockEventType;
  title: string;
  message: string;
  project: string;
  prompt?: string;
  durationMs?: number;
  openUrl?: string;
  timestamp: string;
  inputKind?: string;
}

export interface NotifyConfig {
  completed: boolean;
  error: boolean;
  aborted: boolean;
  input: boolean;
}

export interface NtfyConfig { server: string; topic: string; token: string; }
export interface PushoverConfig { user: string; token: string; }
export interface WebhookConfig { url: string; bearerToken: string; }

export interface KnockConfig {
  minDurationSeconds: number;
  projectName: string;
  openUrl: string;
  notify: NotifyConfig;
  ntfy: NtfyConfig;
  pushover: PushoverConfig;
  webhook: WebhookConfig;
}
