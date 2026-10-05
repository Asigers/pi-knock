# Security Policy

## Supported versions

Security fixes are applied to the latest released version of pi-knock.

## Reporting a vulnerability

Please do not publish credentials, push tokens, webhook secrets, or a working exploit in a public issue.

Use GitHub's **Report a vulnerability** private reporting flow on the repository's Security page. Do not open a public issue for a vulnerability.

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
