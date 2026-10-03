# pi-knock

**Stop babysitting your Pi agent.**

pi-knock notifies your phone, Apple Watch, or webhook when Pi finishes a meaningful task, fails, or pauses for your input.

> Pi works quietly. It knocks when it needs you.

## Features

- ✅ **Task finished** — sent after `agent_settled`
- ❓ **Needs your attention** — sent when Pi opens a blocking input / confirm / select prompt
- ❌ **Task failed** — sent even for short runs
- ⏹️ **Task stopped** — optional
- ⏱️ **Noise control** — successful tasks shorter than 30 seconds are ignored by default
- 📱 **Pushover, ntfy, and generic webhooks**
- ⌚ **Apple Watch** — via iPhone notification mirroring
- 🔗 **Optional session URL** — useful with Pi-Web
- 🔐 **Split settings and credentials storage**
- 🧭 **Interactive setup** — `/knock setup`, `/knock status`, `/knock test`

pi-knock does not run its own push server and does not require a companion app.

## Install

Install directly from GitHub:

```bash
pi install git:github.com/Asigers/pi-knock
```

Then restart Pi or run `/reload`.

You can also try it without permanently installing:

```bash
pi -e git:github.com/Asigers/pi-knock
```

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

`/knock test` bypasses the minimum-duration filter.

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
  "minDurationSeconds": 30,
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

See [`pi-knock.example.json`](./pi-knock.example.json).

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
| `PI_KNOCK_MIN_DURATION` | Minimum successful run duration in seconds |
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

## Notification rules

| Situation | Default behavior |
| --- | --- |
| Successful run < 30 seconds | Silent |
| Successful run ≥ 30 seconds | Notify |
| Blocking input / confirm prompt | Notify immediately |
| Failed run | Notify immediately when settled |
| Aborted run | Silent |
| `/knock test` | Always send |

pi-knock suppresses its own setup dialogs, so `/knock setup` does not generate fake “needs input” alerts.

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
npm install --ignore-scripts
npm run check
pi -e .
```

## Roadmap

- [x] `agent_settled` completion notifications
- [x] blocking input / confirmation notifications
- [x] minimum-duration noise filter
- [x] Pushover / Apple Watch
- [x] ntfy
- [x] generic webhook
- [x] `/knock setup`
- [x] `/knock status`
- [x] `/knock test`
- [x] split config / credentials storage
- [ ] masked secret input
- [ ] richer Pi-Web session deep links
- [ ] Bark provider
- [ ] Gotify provider
- [ ] per-project notification policy
- [ ] notification redaction controls
- [ ] remote reply / approval experiments

## License

MIT
