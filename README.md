# pi-knock

**Stop babysitting your Pi agent.**

pi-knock notifies your phone, Apple Watch, or any webhook when Pi finishes a meaningful task, fails, or pauses for your input.

> Pi works quietly. It knocks when it needs you.

## What it does

- ✅ **Task finished** — sent after `agent_settled`, not the earlier `agent_end`
- ❓ **Needs your attention** — sent when Pi opens a blocking input / confirm / select prompt
- ❌ **Task failed** — sent even for short runs
- ⏹️ **Task stopped** — optional
- ⏱️ **Noise control** — successful tasks shorter than 30 seconds are ignored by default
- 📱 **Cross-device** — ntfy, Pushover, and generic webhooks
- ⌚ **Apple Watch** — use Pushover or ntfy on iPhone and mirror notifications to Apple Watch
- 🔗 **Session link** — optionally attach a Pi-Web/session URL to the notification

pi-knock intentionally does not run its own notification server or require a companion app.

## Why `agent_settled`?

Pi can continue automatically after `agent_end` because of retries, recovery, compaction, or queued work. `agent_settled` is the final notification boundary: Pi will not continue automatically after it fires.

That makes it the right event for “come back now” notifications.

## Install

Until an npm package name is finalized, install directly from GitHub:

```bash
pi install git:github.com/Asigers/pi-knock
```

Then restart Pi or run `/reload`.

Pi packages can also be tried without permanently adding them:

```bash
pi -e git:github.com/Asigers/pi-knock
```

## Quick start: Pushover → Apple Watch

1. Install **Pushover** on your iPhone.
2. Enable Pushover notifications on the Apple Watch via the Watch app.
3. Create a Pushover application and copy its app token and your user key.
4. Export the credentials before starting Pi:

```bash
export PI_KNOCK_PUSHOVER_USER="your-user-key"
export PI_KNOCK_PUSHOVER_TOKEN="your-app-token"
```

Run Pi and give it a task that takes more than 30 seconds. When the run fully settles, your iPhone / Apple Watch should receive a notification.

## Quick start: ntfy

```bash
export PI_KNOCK_NTFY_TOPIC="your-private-topic"
```

The default server is `https://ntfy.sh`. For authenticated or self-hosted ntfy:

```bash
export PI_KNOCK_NTFY_SERVER="https://ntfy.example.com"
export PI_KNOCK_NTFY_TOKEN="your-access-token"
```

## Configuration file

For stable settings, create:

```text
~/.pi/agent/pi-knock.json
```

Start from [`pi-knock.example.json`](./pi-knock.example.json). Environment variables override values from the JSON config file.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PI_KNOCK_MIN_DURATION` | Minimum successful run duration in seconds; default `30` |
| `PI_KNOCK_PROJECT` | Override project name shown in notifications |
| `PI_KNOCK_OPEN_URL` | URL opened from supported notifications, e.g. a Pi-Web session |
| `PI_KNOCK_NOTIFY_COMPLETED` | Enable / disable completion notifications |
| `PI_KNOCK_NOTIFY_ERROR` | Enable / disable failure notifications |
| `PI_KNOCK_NOTIFY_ABORTED` | Enable / disable aborted-run notifications |
| `PI_KNOCK_NOTIFY_INPUT` | Enable / disable attention notifications |
| `PI_KNOCK_NTFY_SERVER` | ntfy server URL |
| `PI_KNOCK_NTFY_TOPIC` | ntfy topic |
| `PI_KNOCK_NTFY_TOKEN` | ntfy bearer token |
| `PI_KNOCK_PUSHOVER_USER` | Pushover user key |
| `PI_KNOCK_PUSHOVER_TOKEN` | Pushover application token |
| `PI_KNOCK_WEBHOOK_URL` | Generic webhook endpoint |
| `PI_KNOCK_WEBHOOK_BEARER` | Optional webhook bearer token |

## Generic webhook payload

```json
{
  "type": "completed",
  "title": "my-project · Task finished",
  "message": "Fix the failing tests · 6m 12s",
  "project": "my-project",
  "prompt": "Fix the failing tests",
  "durationMs": 372000,
  "openUrl": "https://example.com/session/123",
  "timestamp": "2026-10-03T08:00:00.000Z"
}
```

## Notification rules

| Situation | Default behavior |
| --- | --- |
| Successful run < 30 seconds | Silent |
| Successful run ≥ 30 seconds | Notify |
| Blocking input / confirm prompt | Notify immediately |
| Failed run | Notify immediately when settled |
| Aborted run | Silent (configurable) |

## Architecture

```text
Pi
 │
 ├─ before_agent_start ── remembers prompt + start time
 ├─ ui_prompt_start ───── attention notification
 ├─ agent_before_settle ─ remembers final outcome
 └─ agent_settled ─────── completion / failure notification
             │
             ▼
        pi-knock router
          │    │    │
          ▼    ▼    ▼
        ntfy Pushover Webhook
          │       │
          ▼       ▼
        iPhone / Android
              │
              ▼
         Apple Watch
```

## Security

Extensions run inside the Pi process with your user permissions. Keep push credentials private.

Prefer environment variables for tokens on shared machines. pi-knock sends only a short form of the current user prompt plus project name, duration, and event type.

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
- [x] ntfy
- [x] Pushover / Apple Watch path
- [x] generic webhook
- [ ] richer Pi-Web session deep links
- [ ] Bark provider
- [ ] Gotify provider
- [ ] `/knock test` and `/knock status` commands
- [ ] per-project notification policy
- [ ] notification redaction controls
- [ ] remote reply / approval experiments

## License

MIT
