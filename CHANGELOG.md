# Changelog

All notable changes to pi-knock will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Automatic notification delivery retries for transient failures.
- `/knock doctor` diagnostics with last-delivery status and attempt count.
- Notification privacy mode to hide prompt text from lock-screen notifications.
- Session names in notification titles when Pi sessions are named.
- Provider, notifier, and lifecycle test coverage.
- npm package-content verification in CI and release workflows.

### Changed

- Duplicate `agent_settled` events are ignored once a run has already settled.
- Notification setup now includes a dedicated preferences screen.
- Documentation files and the Chinese README are included in the npm package.


## [0.2.1] - 2026-10-03

### Changed

- Completion notifications now fire for every completed Pi conversation after `agent_settled`.
- Removed the minimum-duration filter and deprecated `minDurationSeconds` / `PI_KNOCK_MIN_DURATION`.
- Updated documentation to describe deterministic notification content and settle behavior.

## [0.2.0] - 2026-10-03

### Added

- Interactive `/knock setup`, `/knock status`, and `/knock test` commands.
- Split normal settings and credentials into separate files.
- Pushover `userKey` / `appToken` naming.
- Backward-compatible reads for legacy configuration and environment variable names.
- ntfy and generic webhook providers.
- Owner-only credential-file permissions on POSIX systems.

## [0.1.0] - 2026-10-03

### Added

- Initial Pi extension.
- `agent_settled` completion notifications.
- Blocking UI prompt notifications.
- Pushover support for iPhone / Apple Watch.
- Basic tests and CI.

[Unreleased]: https://github.com/Asigers/pi-knock/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Asigers/pi-knock/releases/tag/v0.2.1
[0.2.0]: https://github.com/Asigers/pi-knock/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Asigers/pi-knock/releases/tag/v0.1.0
