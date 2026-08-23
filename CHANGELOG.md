# Changelog

All notable changes to PureView will be documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-08-23

### Added

- Explicit privacy disclosure and consent gate required before website data is
  handled.
- Per-origin optional site access, persistent dynamic content-script
  registration, and automatic permission removal during site reset.
- English user interface and public documentation.
- GPL-3.0-only licensing and GitHub community files.
- Production icons, Chrome Web Store metadata, privacy policy, and release
  checklist.
- Canonical website, support, privacy-policy, source, publisher, and contact
  metadata.
- A real 1280x800 Chrome Web Store screenshot.
- Deterministic release validation and ZIP packaging.
- Dependency-free tests for background permission and registration behavior.

### Changed

- Replaced install-time access to every website with `activeTab`, `scripting`,
  and optional access requested only for the current origin after a user action.
- Made the development launcher and acceptance criteria site-agnostic.

## [0.3.0] - 2026-08-23

### Added

- Multiple allowed elements per page.
- Automatic migration of legacy single-element rules.
- Site-wide filter reset.
- Dependency-free content-script tests.

## [0.2.0] - 2026-08-23

### Added

- Initial visual element picker and DOM allowlist filter.
