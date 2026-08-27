# Publishing PureView

This checklist covers GitHub releases and updates to the existing unlisted
Chrome Web Store item.

## 1. Developer account

- Register the Chrome Web Store developer account and pay the one-time fee.
- Enable two-step verification on the Google account.
- Use an email address that will be monitored for policy and review messages.
- Complete the account contact and publisher information accurately.
- Read the current [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies).

## 2. Public GitHub repository

- Repository: <https://github.com/reznikvas/PureView>.
- Push the source without `.idea`, `.venv`, `dist`, `.pem`, `.crx`, ZIP files,
  browser profiles, or credentials.
- Enable branch protection for the default branch.
- Require the CI workflow to pass before merging.
- Enable Dependabot security updates and secret scanning where available.
- Enable private vulnerability reporting under the repository Security settings.
- Confirm the repository, website, and security-contact links remain current.
- Confirm GitHub recognizes the repository license as GPL-3.0.
- Create a signed or annotated `v0.5.0` tag only after the release candidate has
  passed manual testing.

## 3. Publisher and public URLs

- **Publisher:** Vasilii Reznik
- **Contact:** <reznik@halam-balam.com>
- **Homepage:** <https://pureviewtool.com/>
- **Support:** <https://pureviewtool.com/support/>
- **Privacy policy:** <https://pureviewtool.com/privacy/>
- **Source:** <https://github.com/reznikvas/PureView>

Publish the website pages and verify that all URLs are accessible without an
account before submitting the Store item.

## 4. Validate the source

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

The last command writes the upload artifact to `dist/` and prints its SHA-256
checksum. Re-run it from a clean checkout before every upload.

## 5. Manual release test

Test the exact unpacked `extension` directory and then the built ZIP contents in
a clean stable-Chrome profile:

- first install opens the disclosure page;
- the extension remains inactive before consent;
- consent enables the popup and page picker;
- one and multiple elements survive reload;
- repeated clicks add and remove elements within one picker session;
- Done saves the draft and applies it without a reload;
- Cancel and Escape restore the original rule and filter state;
- removing every draft element and selecting Done removes the page rule;
- individual elements can be removed from the popup;
- Pause restores the full page and Resume reapplies the rule immediately;
- canceling the first selection leaves reset available so site access can be
  revoked;
- dynamic page changes do not reveal unrelated branches;
- stale selectors fail open after 8 seconds;
- site reset restores the page and deletes same-origin rules only;
- restricted browser pages fail safely;
- uninstall clears local extension storage;
- no network request is made by extension code;
- site access is requested only after the user starts element selection;
- resetting a site removes its optional host permission;
- all visible product text is English.

Record the Chrome version and operating system used for the release test.

## 6. Review Store screenshots

Follow `store-assets/README.md`. Use 1280x800 PNG or JPEG images with square
corners and no padding. Screenshots must show the actual extension experience,
not a generated or conceptual interface.

Four reviewed 1280x800 screenshots document version 0.5.0. Upload them in the
order defined by `store-assets/README.md` and review every image in the Developer
Dashboard preview before submission.

## 7. Update the Store item

1. Open the Chrome Web Store Developer Dashboard.
2. Open the existing PureView item and its **Package** section.
3. Upload `dist/pureview-0.5.0-chrome.zip` as a new package. Do not create a new
   Store item.
4. Copy any changed fields from `docs/CHROME_WEB_STORE_LISTING.md`.
5. Upload an updated real screenshot that shows the 0.5.0 interface.
6. Confirm the homepage, support, source, and privacy-policy URLs.
7. Recheck Privacy Practices and permission justifications against the package.
8. Confirm that remote code is **No** and visibility remains **Unlisted**.
9. Save the draft and review the preview for misleading or missing information.
10. Submit for review only after every checklist item is closed.

## 8. After approval

- Verify that the existing direct Chrome Web Store URL still works from the
  project website and README.
- Confirm that the matching GitHub release contains the ZIP and its SHA-256.
- Keep the signing key private if verified CRX uploads are enabled later.
- Monitor the developer email for review or policy messages.
- For every update, increase `manifest.json` version, update the changelog,
  rebuild from a clean checkout, retest, and submit the complete new package.

## Important policy notes

- Unlisted items receive the same review as public items.
- The broad optional-host declaration permits per-origin requests. The product
  must continue requesting only the current origin after an explicit user
  action, and its justification must remain accurate.
- Any future material data-handling change requires updated disclosures and a
  new consent version before the changed handling begins.
- Never add a permission only for a possible future feature.
