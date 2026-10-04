# pi-knock

English | [简体中文](./README.zh-CN.md)

**Notifications for Pi when a task finishes, fails, or needs your input.**

pi-knock is a lightweight Pi extension that sends notifications to **Pushover**, **ntfy**, or a **webhook**, so you do not need to keep watching the terminal while Pi works.

## Features

- ✅ Notify when a conversation finishes
- ❓ Notify when Pi is waiting for input or confirmation
- ❌ Notify when a task fails
- ⏹️ Optional notification for aborted runs
- 📱 Pushover, ntfy, and generic webhooks
- ⌚ Apple Watch via iPhone notification mirroring
- 🔗 Optional session URL for Pi-Web
- 🔐 Separate config and credential storage

## Install

Recommended:

```bash
pi install npm:@asigers/pi-knock
```

Or install directly from GitHub:

```bash
pi install git:github.com/Asigers/pi-knock
```

Then restart Pi or run:

```text
/reload
```

Requires **Pi 0.87+**.

## Quick start

Run:

```text
/knock setup
```

Choose a provider and enter the required settings. pi-knock sends a test notification after setup.

Useful commands:

| Command | Description |
| --- | --- |
| `/knock setup` | Configure a notification provider |
| `/knock status` | Show current configuration |
| `/knock test` | Send a test notification |

## Providers

| Provider | Best for |
| --- | --- |
| **Pushover** | iPhone / Apple Watch |
| **ntfy** | Simple self-hosted or hosted push |
| **Webhook** | Custom integrations |

For Apple Watch, install Pushover on your iPhone and enable notification mirroring in the Watch app.

New to Pushover? See the [Pushover setup guide (简体中文)](./docs/pushover-setup.zh-CN.md) for account registration, app installation, User Key, and Application API Token setup.

## Notification behavior

By default:

| Event | Notify |
| --- | --- |
| Conversation completed | Yes |
| Input / confirmation required | Yes |
| Conversation failed | Yes |
| Conversation aborted | No |
| `/knock test` | Immediately |

Completion notifications are sent after Pi reaches `agent_settled`, so retries, queued work, or other automatic continuation do not cause premature “finished” alerts.

A completion notification contains the project name, the original prompt in compact form, and elapsed time.

## Configuration

Default files:

```text
~/.pi/agent/pi-knock/
├── config.json
└── credentials.json
```

Example:

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

See [`pi-knock.example.json`](./pi-knock.example.json) and [`config.schema.json`](./config.schema.json) for the full configuration.

Environment variables are also supported, which is useful for Pi-Web, containers, CI, and secret managers.

> Credentials entered through Pi's standard input are visible while typing. Run `/knock setup` only in a private terminal or session.

## Update / remove

```bash
pi update --extensions
```

Remove the npm package:

```bash
pi remove npm:@asigers/pi-knock
```

Remove the Git package:

```bash
pi remove git:github.com/Asigers/pi-knock
```

## Development

```bash
npm ci --ignore-scripts
npm run check
pi -ne -e ./src/index.ts
```

Using `-ne` prevents another installed copy of pi-knock from being loaded during local testing.

## More

- [Changelog](./CHANGELOG.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)

## License

MIT
