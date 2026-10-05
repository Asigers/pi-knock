# Provider setup guide

pi-knock sends notifications directly from the machine running Pi. Choose one or more providers in `/knock setup`, or configure them with files and environment variables.

## Pushover

Pushover is the simplest option for iPhone, Android, and Apple Watch notifications.

1. Create a Pushover account at <https://pushover.net/signup>.
2. Install the Pushover client and allow notifications.
3. Copy your **User Key** from <https://pushover.net/>.
4. Create an application at <https://pushover.net/apps/build> and copy its **Application API Token**.
5. In Pi, run:

   ```text
   /knock setup
   ```

6. Choose **Pushover (iPhone / Apple Watch)** and enter the two values.

pi-knock keeps these values in `credentials.json`, separate from ordinary settings. For non-interactive environments, use:

```bash
export PI_KNOCK_PUSHOVER_USER_KEY="..."
export PI_KNOCK_PUSHOVER_APP_TOKEN="..."
```

See the [完整 Pushover guide (简体中文)](./pushover-setup.zh-CN.md) for screenshots and troubleshooting.

## ntfy

ntfy works with the hosted service at <https://ntfy.sh> or a self-hosted ntfy server.

1. Choose a server URL, for example `https://ntfy.sh`.
2. Choose a private, hard-to-guess topic.
3. If the topic is private, create an access token and keep it secret.
4. Run `/knock setup` and choose **ntfy**.

Environment variables:

```bash
export PI_KNOCK_NTFY_SERVER="https://ntfy.sh"
export PI_KNOCK_NTFY_TOPIC="your-private-topic"
export PI_KNOCK_NTFY_ACCESS_TOKEN="tk_..." # optional for public topics
```

The topic is stored in `config.json`; the access token is stored in `credentials.json`.

## Webhook

Webhook delivery sends a JSON `POST` request to your endpoint. It includes:

- `X-Pi-Knock-Event-Id` header for deduplication by your receiver
- `id`, `type`, `title`, `message`, `project`, and `timestamp` fields
- optional `sessionName`, `durationMs`, `openUrl`, and `inputKind` fields

Configure it interactively with `/knock setup`, or use:

```bash
export PI_KNOCK_WEBHOOK_URL="https://example.com/pi-knock"
export PI_KNOCK_WEBHOOK_BEARER="..." # optional
```

The URL is stored in `config.json`; the bearer token is stored in `credentials.json`.

## Multiple providers

You can enable multiple providers at once. pi-knock sends to them in parallel and retries only the channel that fails. A successful provider is not sent again when another provider fails.

## Privacy and failure behavior

- Prompt text is excluded by default (`contentMode: "project-only"`).
- Credentials are never written to `config.json`.
- Transient failures are retried up to three times.
- Delivery failures are silent during normal Pi work.
- Run `/knock doctor` to inspect the most recent delivery result and attempt count.
- A timeout can happen after a provider accepted a request, so retries may occasionally create duplicates.

Pi's credential input prompt is not masked by the host UI. Enter secrets only in a private terminal, or set them through an external secret manager and environment variables.
