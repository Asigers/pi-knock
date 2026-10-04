# pi-knock

English | [简体中文](./README.zh-CN.md)

**Leave the terminal. Pi will knock when it needs you.**

pi-knock sends remote notifications when a Pi task **finishes, fails, or needs your input**. Use Pushover for iPhone / Apple Watch, ntfy for hosted or self-hosted push, or a webhook for your own automation.

```bash
pi install npm:@asigers/pi-knock
```

## Why pi-knock

- **Actually waits for completion** — completion alerts are sent at `agent_settled`, after Pi has finished automatic retries and queued work.
- **Works away from your desk** — notifications can reach your phone or watch instead of only the local terminal.
- **Reliable delivery** — transient failures are retried automatically.
- **Lock-screen safe by default** — prompt text is hidden unless you opt in.
- **Session-aware** — named Pi sessions appear in notification titles.
- **No push server required** — pi-knock sends directly to your configured provider.

## Quick start

After installation, restart Pi or run `/reload`, then:

```text
/knock setup
```

Choose a provider and enter the required settings. pi-knock immediately sends a test notification.

| Command | Description |
| --- | --- |
| `/knock setup` | Configure providers and notification preferences |
| `/knock status` | Show current configuration |
| `/knock test` | Send a live test notification |
| `/knock doctor` | Show provider and last-delivery diagnostics |

Requires **Pi 0.87+**.

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

Environment variables are supported for Pi-Web, containers, CI, and external secret managers.

> Pi's standard input is not masked. Run `/knock setup` only in a private terminal or session when entering credentials.

## Install from GitHub

Latest `main`:

```bash
pi install git:github.com/Asigers/pi-knock
```

Update installed extensions:

```bash
pi update --extensions
```

Remove:

```bash
pi remove npm:@asigers/pi-knock
```

## Development

```bash
npm ci --ignore-scripts
npm run check
npm pack --dry-run
pi -ne -e ./src/index.ts
```

Using `-ne` prevents another installed copy of pi-knock from loading during local testing.

## More

- [Changelog](./CHANGELOG.md)
- [Security](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)

## License

MIT
