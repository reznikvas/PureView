# Contributing to PureView

Thank you for considering a contribution. PureView aims to remain small,
privacy-first, and easy to review.

## Before you start

- Search existing issues before opening a new one.
- Use a focused issue to discuss significant behavior, storage-format, privacy,
  permission, or user-interface changes before implementation.
- Security vulnerabilities must follow [SECURITY.md](SECURITY.md), not the
  public issue tracker.

## Development setup

PureView has no runtime dependencies or compilation step.

1. Clone the repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Load the `extension` directory as an unpacked extension.
5. Accept the local privacy disclosure and test in a separate browser profile.

Optional branding tools require:

```bash
python3 -m pip install -r requirements-dev.txt
```

## Required checks

Run these checks before submitting a pull request:

```bash
node --check extension/background.js
node --check extension/content.js
node --check extension/onboarding.js
node --check extension/popup.js
node tests/background.test.js
node tests/content.test.js
node tests/popup.test.js
python3 -m py_compile main.py scripts/build_release.py scripts/prepare_store_assets.py
python3 scripts/build_release.py
```

Also test the affected user flow manually in the latest stable Chrome release.

## Code guidelines

- Keep JavaScript readable and unminified.
- Do not add remote scripts, dynamic code execution, analytics, or telemetry.
- Request only permissions required by an implemented user-facing feature.
- Preserve the consent gate before handling page URLs or DOM content.
- Document storage-format changes and provide migrations.
- Keep UI copy and public documentation in English.
- Add or update tests for filtering and migration behavior.
- Add an SPDX identifier to new source files where the format supports comments.

## Pull requests

- Keep each pull request focused on one change.
- Explain the user-visible behavior and privacy/permission impact.
- Update `TECHNICAL_SPECIFICATION.md` and `CHANGELOG.md` when appropriate.
- Include manual test instructions and screenshots for UI changes.
- Do not commit `.pem`, `.crx`, local profiles, credentials, or build output.

## Licensing contributions

By submitting a contribution, you agree that it may be distributed under the
repository's `GPL-3.0-only` license.
