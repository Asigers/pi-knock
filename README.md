# pi-knock

**Stop babysitting your Pi agent.**

pi-knock notifies your phone, Apple Watch, or webhook whenever a Pi conversation settles, fails, or pauses for your input.

> Pi works quietly. It knocks when it needs you.

## Features

- ✅ **Every completed conversation** — one notification after `agent_settled`
- ❓ **Needs your attention** — sent when Pi opens a blocking input / confirm / select prompt
- ❌ **Task failed** — sent when the settled outcome is an error
- ⏹️ **Task stopped** — optional for aborted runs
- 📱 **Pushover, ntfy, and generic webhooks**
- ⌚ **Apple Watch** — via iPhone notification mirroring
- 🔗 **Optional session URL** — useful with Pi-Web
- 🔐 **Split settings and credentials storage**
- 🧭 **Interactive setup** — `/knock setup`, `/knock status`, `/knock test`

pi-knock does not run its own push server and does not require a companion app.

## Install

### Stable Git release

```bash
pi install git:github.com/Asigers/pi-knock@v0.2.1
```

### Latest from main

```bash
pi install git:github.com/Asigers/pi-knock
```

### npm

After the npm package is published:

```bash
pi install npm:@asigers/pi-knock
```

Restart Pi or run `/reload` after installing.

### Try without installing

```bash
pi -ne -e git:github.com/Asigers/pi-knock
```

## Update and remove

Update installed Pi packages:

```bash
pi update --extensions
```

A Git install pinned to a tag such as `@v0.2.1` stays on that tag. Install a newer tag when you intentionally want to upgrade.

Remove the Git package:

```bash
pi remove git:github.com/Asigers/pi-knock
```

For the npm package:

```bash
pi remove npm:@asigers/pi-knock
```

## Compatibility

The supported baseline is Pi 0.87+. The Pi host packages are declared as peer dependencies using the Pi package convention; they are supplied by Pi rather than bundled by pi-knock.

## Quick start

Run:

```text
/knock setup
```

Choose a provider:

```text
Pushover (iPhone / Apple Watch)
ntfy
Webhook
```

After saving, pi-knock immediately sends a test notification for that provider.

Check the current configuration with:

```text
/knock status
```

Send another test at any time with:

```text
/knock test
```

## When notifications are sent

For a normal conversation, the lifecycle is:

```text
user prompt
   ↓
Pi works
   ↓
retries / tools / compaction / queued work if needed
   ↓
agent_settled
   ↓
one completion notification
```

There is **no minimum-duration filter**. A completed conversation that takes 2 seconds and one that takes 20 minutes both notify once.

Default outcome behavior:

| Situation | Default behavior |
| --- | --- |
| Completed conversation | Notify |
| Blocking input / confirm prompt | Notify immediately |
| Failed conversation | Notify when settled |
| Aborted conversation | Silent, configurable |
| `/knock test` | Send immediately |

pi-knock suppresses its own setup dialogs, so `/knock setup` does not generate fake “needs input” alerts.

## Notification content

Completion notifications use deterministic local data; pi-knock does not make another LLM call to summarize the result.

By default:

```text
Title:
<project> · Task finished

Body:
<original user prompt> · <elapsed time>
```

Example:

```text
pi-knock · Task finished

Fix why completion notifications sometimes do not arrive · 1m 42s
```

The project name comes from the current working directory unless `projectName` overrides it.

The prompt is compacted to a short single-line form before sending.

## Pushover → Apple Watch

For the simplest Apple Watch path:

1. Install **Pushover** on the iPhone.
2. Enable Pushover notification mirroring in the Watch app.
3. Create a Pushover application.
4. Copy your **User Key** and **Application API Token**.
5. Run `/knock setup` and choose **Pushover (iPhone / Apple Watch)**.

pi-knock stores the values using explicit names:

```text
userKey
appToken
```

instead of ambiguous `user` / `token` fields.

> Pi's standard `ctx.ui.input()` is plain text, not a masked password field. pi-knock warns before asking for credentials. Use setup only in a private terminal/session.

## Configuration storage

The recommended layout is:

```text
~/.pi/agent/pi-knock/
├── config.json
└── credentials.json
```

### `config.json`

Contains ordinary behavior and endpoint settings only:

```json
{
  "projectName": "",
  "openUrl": "",
  "notify": {
    "completed": true,
    "error": true,
    "aborted": false,
    "input": true
  },
  "ntfy": {
    "enabled": false,
    "server": "https://ntfy.sh",
    "topic": ""
  },
  "pushover": {
    "enabled": true
  },
  "webhook": {
    "enabled": false,
    "url": ""
  }
}
```

See [`pi-knock.example.json`](./pi-knock.example.json) and [`config.schema.json`](./config.schema.json).

### `credentials.json`

Contains credentials only:

```json
{
  "pushover": {
    "userKey": "...",
    "appToken": "..."
  }
}
```

On POSIX systems pi-knock writes this file with `0600` permissions.

Do not commit this file.

## Configuration precedence

Highest priority wins:

```text
environment variables
        ↓
credentials.json
        ↓
config.json
        ↓
legacy ~/.pi/agent/pi-knock.json
        ↓
defaults
```

Environment variables are useful for Pi-Web daemons, containers, CI, or external secret managers.

## Environment variables

### General

| Variable | Purpose |
| --- | --- |
| `PI_KNOCK_HOME` | Override the pi-knock config directory |
| `PI_KNOCK_CONFIG` | Override the normal config file path |
| `PI_KNOCK_CREDENTIALS` | Override the credentials file path |
| `PI_KNOCK_PROJECT` | Override project name |
| `PI_KNOCK_OPEN_URL` | URL opened from supported notifications |
| `PI_KNOCK_NOTIFY_COMPLETED` | Enable / disable completion notifications |
| `PI_KNOCK_NOTIFY_ERROR` | Enable / disable failure notifications |
| `PI_KNOCK_NOTIFY_ABORTED` | Enable / disable aborted notifications |
| `PI_KNOCK_NOTIFY_INPUT` | Enable / disable attention notifications |

### Pushover

| Variable | Purpose |
| --- | --- |
| `PI_KNOCK_PUSHOVER_ENABLED` | Enable / disable Pushover |
| `PI_KNOCK_PUSHOVER_USER_KEY` | Pushover User Key |
| `PI_KNOCK_PUSHOVER_APP_TOKEN` | Pushover Application API Token |

Legacy `PI_KNOCK_PUSHOVER_USER` and `PI_KNOCK_PUSHOVER_TOKEN` are still accepted.

### ntfy

| Variable | Purpose |
| --- | --- |
| `PI_KNOCK_NTFY_ENABLED` | Enable / disable ntfy |
| `PI_KNOCK_NTFY_SERVER` | ntfy server URL |
| `PI_KNOCK_NTFY_TOPIC` | ntfy topic |
| `PI_KNOCK_NTFY_ACCESS_TOKEN` | ntfy access token |

Legacy `PI_KNOCK_NTFY_TOKEN` is still accepted.

### Webhook

| Variable | Purpose |
| --- | --- |
| `PI_KNOCK_WEBHOOK_ENABLED` | Enable / disable webhook |
| `PI_KNOCK_WEBHOOK_URL` | Generic webhook endpoint |
| `PI_KNOCK_WEBHOOK_BEARER` | Optional bearer token |

## Why `agent_settled`?

Pi can continue automatically after `agent_end` because of retries, recovery, compaction, or queued work.

`agent_settled` is the final notification boundary: Pi will not continue automatically after it fires. That makes it the correct event for a “come back now” notification.

## Backward compatibility

The old single-file configuration is still read:

```text
~/.pi/agent/pi-knock.json
```

Old Pushover fields are also accepted:

```json
{
  "pushover": {
    "user": "...",
    "token": "..."
  }
}
```

Old `minDurationSeconds` / `PI_KNOCK_MIN_DURATION` settings are ignored. Completion notifications are now always sent when enabled.

New interactive setup writes the split config/credentials format.

## Security

Extensions run inside the Pi process with your user permissions.

- Secrets are kept out of `config.json`.
- `credentials.json` uses owner-only permissions where supported.
- Environment variables can override disk credentials.
- `/knock status` never displays secret values.
- Notification failures do not interrupt the Pi agent run.

By default, notifications include a short form of the current user prompt. Redaction controls are planned.

## Development

```bash
npm ci --ignore-scripts
npm run check
pi -ne -e ./src/index.ts
```

Using `-ne` avoids loading another installed copy of pi-knock while testing the checkout, which prevents duplicate notifications.

## Roadmap

- [x] every `agent_settled` completion notification
- [x] blocking input / confirmation notifications
- [x] Pushover / Apple Watch
- [x] ntfy
- [x] generic webhook
- [x] `/knock setup`
- [x] `/knock status`
- [x] `/knock test`
- [x] split config / credentials storage
- [ ] delivery retry / last-delivery diagnostics
- [ ] masked secret input
- [ ] richer Pi-Web session deep links
- [ ] Bark provider
- [ ] Gotify provider
- [ ] per-project notification policy
- [ ] notification redaction controls
- [ ] remote reply / approval experiments

## Releases

Changes are tracked in [CHANGELOG.md](./CHANGELOG.md). Security reporting guidance is in [SECURITY.md](./SECURITY.md).

## License

MIT
