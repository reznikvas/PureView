<p align="center">
  <img src="assets/branding/pureview-icon-master.png" width="128" height="128" alt="PureView icon">
</p>

# PureView

PureView is a privacy-first Chrome extension that lets you choose the useful
parts of a web page and hide everything else. Instead of maintaining a list of
advertising domains, PureView uses a visual allowlist: select one or more page
elements, confirm the selection, and only the selected DOM branches remain
visible.

> Current source release: version 0.5.0. The Chrome Web Store continues to serve
> version 0.4.0 until the update is reviewed and published.

- Install from Chrome Web Store:
  <https://chromewebstore.google.com/detail/pureview/mjdchlffjjnpoijpfajekkhhgbnmacmm>
- Website: <https://pureviewtool.com/>
- Support: <https://pureviewtool.com/support/>
- Privacy policy: <https://pureviewtool.com/privacy/>
- Source code: <https://github.com/reznikvas/PureView>

## Features

- Visual point-and-click element picker.
- Continuous selection: click multiple elements without reopening the popup.
- Click a selected element again to remove it from the draft.
- Done and Cancel controls with a live selected-element count.
- Immediate filtering after the selection is confirmed, without a reload.
- A popup list for removing individual saved elements.
- Pause and resume the current page's filter without deleting its rule.
- Parent/child selection with the Up and Down arrow keys.
- Automatic filtering after a reload or later visit.
- Support for dynamically updated pages through `MutationObserver`.
- One-click reset for every saved rule on the current site.
- Local-only settings with no analytics, accounts, or remote servers.
- Automatic migration from the original single-element rule format.

PureView hides DOM elements; it does not currently block network requests made
by advertisements or other hidden page components.

## Install for development

1. Clone or download this repository.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository's `extension` directory.
6. Pin PureView from Chrome's Extensions menu if desired.

The optional launcher opens an isolated Chrome profile on a blank page:

```bash
python3 main.py
```

Pass a URL as the first argument when a specific development page is needed.

## Use PureView

1. Open an HTTP or HTTPS page and select the PureView toolbar icon.
2. Select **Select page elements** or **Edit page selection**.
3. Move the pointer over the content you want to keep.
4. Press the Up arrow to select a larger parent container or the Down arrow to
   return to the previous child.
5. Click highlighted elements to add them. Click a selected element again to
   remove it.
6. Select **Done** to save the draft and apply the filter immediately, or
   **Cancel** (or press Escape) to discard the draft.
7. Use the popup's saved-element list to remove one element later, or select
   **Pause filter** to show the full page without deleting the rule.

Select **Reset filters for this site** to remove every saved rule for the
current origin and immediately restore the full page.

## Privacy and permissions

PureView stores page URLs, CSS selectors, labels, timestamps, and local
pause/resume state in `chrome.storage.local`. These settings remain on the
user's device and are not transmitted anywhere. PureView does not collect
analytics, create accounts, serve advertisements, or execute remotely hosted
code.

The extension requires:

- `storage` to keep the user's allowlist locally;
- `activeTab` and `scripting` to start the picker after an explicit toolbar
  action;
- optional access to the current HTTP or HTTPS site, requested only when the
  user selects an element, so saved rules can run automatically after reload.

See [PRIVACY.md](PRIVACY.md) for the complete privacy policy.

## Test and build

No runtime dependencies or build step are required. Use Node.js and Python for
the development checks:

```bash
node --check extension/background.js
node --check extension/content.js
node --check extension/onboarding.js
node --check extension/popup.js
node tests/background.test.js
node tests/content.test.js
node tests/popup.test.js
python3 scripts/build_release.py
```

The release script validates the Manifest V3 metadata, permissions, required
PNG sizes, and package contents. It creates a deterministic Web Store archive
at `dist/pureview-<version>-chrome.zip` with `manifest.json` at the ZIP root.

To regenerate committed icons and the small promotional image from the branding
masters, install the development dependency and run:

```bash
python3 -m pip install -r requirements-dev.txt
python3 scripts/prepare_store_assets.py
```

## Project layout

```text
extension/                 Chrome extension submitted to the Web Store
assets/branding/           High-resolution branding masters
store-assets/              Chrome Web Store promotional assets
scripts/                   Validation, release, and asset scripts
tests/                     Dependency-free content-script tests
docs/                      Publishing and store-listing documentation
TECHNICAL_SPECIFICATION.md Product and engineering requirements
PRIVACY.md                 User-facing privacy policy
```

## Known limitations

- Major changes to a site's DOM can invalidate saved CSS selectors.
- Closed shadow roots and elements inside cross-origin frames are not supported.
- A selected component can depend on a hidden sibling and may not work perfectly.
- Rules are currently local to one Chrome profile and are not synchronized.
- Subdomains are treated as separate sites.

## Contributing

Bug reports and focused pull requests are welcome. Read
[CONTRIBUTING.md](CONTRIBUTING.md) before contributing and report security
issues according to [SECURITY.md](SECURITY.md).

The current behavior and acceptance criteria are documented in
[TECHNICAL_SPECIFICATION.md](TECHNICAL_SPECIFICATION.md). Release preparation is
documented in [docs/PUBLISHING.md](docs/PUBLISHING.md).

## License

PureView is free software licensed under the
[GNU General Public License v3.0 only](LICENSE). See individual source files for
SPDX identifiers.

## Publisher

PureView is published and maintained by **Vasilii Reznik**. Contact:
<reznik@halam-balam.com>.
