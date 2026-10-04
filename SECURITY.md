# Security Policy

## Supported versions

Security fixes are applied to the latest released version of pi-knock.

## Reporting a vulnerability

Please do not publish credentials, push tokens, webhook secrets, or a working exploit in a public issue.

If GitHub shows **Report a vulnerability** on this repository's Security page, use that private reporting flow. Otherwise, open a minimal issue stating that you need a private security contact, without including sensitive details.

Useful information to include privately:

- affected pi-knock version
- Pi version and operating system
- notification provider involved
- reproduction steps
- expected and observed behavior
- whether credentials or notification content may have been exposed

## Secret handling

pi-knock intentionally keeps credentials separate from normal configuration. Treat `credentials.json`, environment variables, CI secrets, and provider tokens as sensitive data.

If a credential is accidentally committed or posted publicly, rotate it at the provider immediately. Removing it from Git history does not make an exposed credential safe again.
