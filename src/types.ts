export type KnockEventType = "completed" | "error" | "aborted" | "input";
export type ChannelName = "ntfy" | "pushover" | "webhook";
export type NotificationContentMode = "prompt" | "project-only";

export interface KnockEvent {
  id: string;
  type: KnockEventType;
  title: string;
  message: string;
  project: string;
  sessionName?: string;
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

export interface NtfyConfig {
  enabled: boolean;
  server: string;
  topic: string;
  accessToken: string;
}

export interface PushoverConfig {
  enabled: boolean;
  userKey: string;
  appToken: string;
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  bearerToken: string;
}

export interface KnockConfig {
  projectName: string;
  openUrl: string;
  contentMode: NotificationContentMode;
  notify: NotifyConfig;
  ntfy: NtfyConfig;
  pushover: PushoverConfig;
  webhook: WebhookConfig;
}

export interface KnockCredentials {
  ntfy?: {
    accessToken?: string;
  };
  pushover?: {
    userKey?: string;
    appToken?: string;
  };
  webhook?: {
    bearerToken?: string;
  };
}

export interface ConfigPaths {
  directory: string;
  configFile: string;
  credentialsFile: string;
  legacyConfigFile: string;
}
