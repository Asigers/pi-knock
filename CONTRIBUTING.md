# Contributing

Thanks for helping improve pi-knock.

## Local development

Requirements:

- Node.js 22.19+
- Pi 0.87+ (Pi 1.0+ recommended)

```bash
npm install --ignore-scripts
npm run check
```

To load the checkout directly in Pi:

```bash
pi -e .
```

After editing the extension, use `/reload` inside Pi or restart the session.

## Pull requests

Keep changes focused. Add or update tests for behavior changes. Notification delivery failures must never break the agent run.
