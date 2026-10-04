# pi-knock

[![npm version](https://img.shields.io/npm/v/%40asigers%2Fpi-knock)](https://www.npmjs.com/package/@asigers/pi-knock)
[![Pi 0.87+](https://img.shields.io/badge/Pi-0.87%2B-blue)](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

**Leave the terminal. Pi will knock when it needs you.**

pi-knock sends remote notifications when a Pi task **finishes, fails, or needs your input**. Use Pushover for iPhone / Apple Watch, ntfy for hosted or self-hosted push, or a webhook for your own automation.

<p align="center">
  <img src="https://raw.githubusercontent.com/Asigers/pi-knock/main/docs/assets/pi-knock-demo.gif" alt="pi-knock demo: let Pi work and receive remote notifications when it needs your attention" width="960">
</p>

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Providers](#providers)
- [Notification behavior](#notification-behavior)
- [Configuration](#configuration)
- [Update and uninstall](#update-and-uninstall)
- [Development](#development)
- [Documentation](#documentation)
- [License](#license)

## Features

- **Actually waits for completion** — completion alerts are sent at `agent_settled`, after Pi has finished automatic retries and queued work.
- **Works away from your desk** — notifications can reach your phone or watch instead of only the local terminal.
- **Reliable delivery** — transient failures are retried automatically.
- **Lock-screen safe by default** — prompt text is hidden unless you opt in.
- **Session-aware** — named Pi sessions appear in notification titles.
- **No push server required** — pi-knock sends directly to your configured provider.

## Quick start

**Requirements:** Pi 0.87+ and Node.js 22.19+.

### 1. Install

Install from npm:

```bash
pi install npm:@asigers/pi-knock
```

Or install the latest `main` branch from GitHub:

```bash
pi install git:github.com/Asigers/pi-knock
```

### 2. Configure

Restart Pi or run `/reload`, then launch the setup wizard:

```text
/knock setup
```

Choose a provider and enter the required settings. Saving a provider configuration immediately sends a test notification.

> **Credential privacy:** Pi's standard input is not masked. Enter credentials only in a private terminal or session.

### 3. Verify

Send another test notification whenever you need to check delivery:

```text
/knock test
```

If it does not arrive, run `/knock doctor` to inspect the provider configuration and last delivery result.

## Commands

Run these commands inside Pi:

| Command | Description |
| --- | --- |
| `/knock setup` | Configure providers and notification preferences |
| `/knock status` | Show current configuration |
| `/knock test` | Send a live test notification |
| `/knock doctor` | Show provider and last-delivery diagnostics |

## Providers

| Provider | Best for |
| --- | --- |
| **Pushover** | iPhone / Apple Watch |
| **ntfy** | Hosted or self-hosted push |
| **Webhook** | Custom integrations and automation |

New to Pushover? See the [Pushover setup guide (简体中文)](./docs/pushover-setup.zh-CN.md).

## Notification behavior

Default behavior:

| Event | Notify |
| --- | --- |
| Conversation completed | Yes |
| Input / confirmation required | Yes |
| Conversation failed | Yes |
| Conversation aborted | No |

Notifications use the project name and, when available, the Pi session name. By default prompt text is **not** included on the lock screen.

To change this, run `/knock setup` and choose **Notification preferences**.

Delivery uses up to three attempts for transient network errors and retryable provider responses such as HTTP 429 / 5xx. Permanent 4xx errors fail immediately. Use `/knock doctor` to inspect the most recent delivery result.

## Configuration

### Files

The setup wizard writes two files by default:

```text
~/.pi/agent/pi-knock/
├── config.json
└── credentials.json
```

- `config.json` stores notification preferences and non-secret provider settings.
- `credentials.json` stores provider keys and tokens separately. Do not commit it or share its contents.

Set `PI_KNOCK_HOME` to change the default directory, or use `PI_KNOCK_CONFIG` and `PI_KNOCK_CREDENTIALS` to override individual file paths.

### Example

A minimal `config.json` with Pushover enabled (credentials are configured separately):

```json
{
  "projectName": "",
  "openUrl": "",
  "contentMode": "project-only",
  "notify": {
    "completed": true,
    "error": true,
    "aborted": false,
    "input": true
  },
  "pushover": {
    "enabled": true
  }
}
```

See [`pi-knock.example.json`](./pi-knock.example.json) and [`config.schema.json`](./config.schema.json) for the complete configuration.

### Environment variables

Environment variables override file settings and are useful for Pi-Web, containers, CI, and external secret managers. Common variables include:

| Purpose | Variables |
| --- | --- |
| Pushover credentials | `PI_KNOCK_PUSHOVER_USER_KEY`, `PI_KNOCK_PUSHOVER_APP_TOKEN` |
| ntfy connection | `PI_KNOCK_NTFY_SERVER`, `PI_KNOCK_NTFY_TOPIC`, `PI_KNOCK_NTFY_ACCESS_TOKEN` |
| Webhook connection | `PI_KNOCK_WEBHOOK_URL`, `PI_KNOCK_WEBHOOK_BEARER` |
| Notification content | `PI_KNOCK_CONTENT_MODE` (`project-only` or `prompt`) |

## Update and uninstall

Update installed extensions:

```bash
pi update --extensions
```

Remove the npm installation:

```bash
pi remove npm:@asigers/pi-knock
```

For a GitHub installation, use `pi remove git:github.com/Asigers/pi-knock` instead.

## Development

```bash
npm ci --ignore-scripts
npm run check
npm pack --dry-run
pi -ne -e ./src/index.ts
```

Using `-ne` prevents another installed copy of pi-knock from loading during local testing.

## Documentation

- [Pushover setup guide (简体中文)](./docs/pushover-setup.zh-CN.md)
- [Configuration example](./pi-knock.example.json) and [JSON Schema](./config.schema.json)
- [Changelog](./CHANGELOG.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
- [Report an issue](https://github.com/Asigers/pi-knock/issues)

## License

[MIT](./LICENSE)
