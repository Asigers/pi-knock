# Contributing

Thanks for helping improve pi-knock.

## Local development

Requirements:

- Node.js 22.19+
- Pi 0.87+ supported baseline

Install the locked development dependencies and run checks:

```bash
npm ci --ignore-scripts
npm run check
```

Load only the checkout while developing:

```bash
pi -ne -e ./src/index.ts
```

The `-ne` flag disables normal extension auto-discovery for that invocation. This prevents an already-installed copy of pi-knock from loading alongside the development checkout and sending duplicate notifications.

After editing the extension, use `/reload` inside Pi or restart the session.

## Package manifest

Pi supplies `@earendil-works/pi-coding-agent` at runtime. Keep host-provided Pi packages in `peerDependencies` with the `"*"` range and do not add them to runtime `dependencies`.

## Tests

Behavior changes should include tests. In particular, lifecycle changes must preserve the contract that one settled conversation produces at most one completion notification.

Notification delivery failures must never break the agent run.

Lifecycle changes should be covered in `test/lifecycle.test.ts`. Provider request changes belong in `test/channels.test.ts`, and retry behavior belongs in `test/notifier.test.ts`.

Before releasing, `npm pack --dry-run` must show the README files and `docs/` content expected by links in the package documentation.

## Pull requests

Keep changes focused. Update CHANGELOG.md for user-visible changes and avoid committing credentials, provider tokens, private webhook URLs, or local pi-knock configuration.


## Releasing

Releases are published from GitHub Actions using npm Trusted Publishing (OIDC). Do not add a long-lived npm publish token.

For a new release:

1. Update `CHANGELOG.md`.
2. Bump the version in both `package.json` and `package-lock.json` (for example with `npm version patch --no-git-tag-version`).
3. Run `npm ci --ignore-scripts && npm run check`.
4. Commit and push the version bump to `main`.

A `package.json` change on `main` triggers `.github/workflows/release.yml`, which checks the package, publishes the new npm version through OIDC, and creates the matching GitHub release.
