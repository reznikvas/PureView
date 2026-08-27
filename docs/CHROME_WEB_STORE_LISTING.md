# Chrome Web Store Listing Draft

Use this document as the source for the Chrome Web Store Developer Dashboard.
Review every field against the final package before submission.

## Product details

- **Name:** PureView
- **Primary language:** English
- **Category:** Productivity
- **Visibility:** Unlisted
- **In-app purchases:** No
- **Publisher:** Vasilii Reznik
- **Contact email:** reznik@halam-balam.com

## Summary

Keep only the page elements you choose and hide everything else with a local,
privacy-first allowlist.

The summary matches `manifest.json` and is fewer than 132 characters.

## Detailed description

PureView helps you focus on the useful parts of a web page.

Choose one or more page elements with the visual picker. PureView immediately
keeps those elements visible and hides unrelated page branches. The original
DOM nodes remain in place so interactive controls and dynamically updated
content can continue to work.

HOW IT WORKS

1. Open the PureView toolbar popup.
2. Click elements to add them or click selected elements to remove them.
3. Select Done to save and apply the filter immediately.
4. Manage individual elements or pause the filter from the popup.
5. Reset all of a site's filters from the popup at any time.

PRIVACY FIRST

PureView stores page paths and selected-element rules locally in your Chrome
profile. It does not use analytics, accounts, advertisements, remote servers,
or remotely hosted code. No user data is sent to the developer or third
parties. PureView stays inactive until you review and accept its in-product
privacy disclosure.

IMPORTANT LIMITATION

PureView hides page elements. It does not block the network requests made by
hidden advertisements or other page components. Major changes to a website's
markup may require you to select an element again.

PureView is free and open-source software licensed under GPL-3.0-only.

## Single purpose

PureView lets users visually choose web page elements to keep visible and
automatically hides unrelated DOM branches on later visits.

All features—selection, rule management, pause/resume, automatic filtering, and
reset—are directly required by this single purpose.

## Permission justifications

### storage

PureView uses `chrome.storage.local` to store the user's privacy-consent record,
allowlist rules, and pause/resume state. A rule contains an origin and pathname,
CSS selectors, short element labels, and timestamps. The data remains on the
user's device.

### activeTab

Opening the PureView action temporarily grants access to the active tab. This is
used to identify the page where the user explicitly invoked PureView and to
start selection. It does not provide background access to other tabs.

### scripting

PureView uses `chrome.scripting` to register its packaged content script and CSS
for sites the user explicitly enables. This preserves automatic filtering after
reload without requiring install-time access to every website.

### Optional host access: http://*/* and https://*/*

PureView requests access only to the current origin when the user selects an
element. The content script then needs DOM access to highlight elements, build
selectors, hide unrelated branches, and restore saved filters after navigation
or reload. Resetting the site removes its rules, dynamic content-script
registration, and optional host permission. PureView does not transmit page
content or browsing activity.

### Remote code

Select: **No, I am not using remote code.**

Every executable file ships inside the extension package. There are no external
scripts, `eval`, remote WebAssembly modules, or remotely configured behaviors.

## Data-use disclosures

Use conservative disclosures that match the source and `PRIVACY.md`:

- **Web history:** Yes. PureView uses the current origin and pathname as a local
  rule key only after consent.
- **Website content:** Yes. PureView reads DOM structure and attributes to let
  the user select elements and apply filters.
- **User activity:** Yes. Pointer movement and clicks are processed temporarily
  while the user explicitly activates picker mode.
- **Personally identifiable information:** No.
- **Health information:** No.
- **Financial and payment information:** No.
- **Authentication information:** No.
- **Personal communications:** No.
- **Location:** No.

For every handled category:

- data is used only for PureView's disclosed single purpose;
- data is not sold or transferred to third parties;
- data is not used for advertising, creditworthiness, or lending;
- data is stored locally and is not transmitted to the developer.

Certify compliance with the Chrome Web Store User Data Policy and Limited Use
requirements only after confirming the final package matches these statements.

## Public URLs

- **Homepage:** <https://pureviewtool.com/>
- **Support URL:** <https://pureviewtool.com/support/>
- **Privacy policy URL:** <https://pureviewtool.com/privacy/>
- **Source code:** <https://github.com/reznikvas/PureView>

Verify that every URL is publicly accessible before submission.

## Graphic assets

- Extension/store icon: `extension/icons/icon128.png` (128x128 PNG with
  transparent padding).
- Required small promo tile: `store-assets/promo-small-440x280.png`.
- Required screenshot: `store-assets/screenshot-01-popup-1280x800.png` is a real
  1280x800 Chrome screenshot. Additional optional screenshots are documented in
  `store-assets/README.md`.
- Before submitting version 0.5.0, replace or supplement the existing screenshot
  with a real capture of the updated popup and continuous picker toolbar.
- Optional marquee tile: not prepared for the initial unlisted release.

## Distribution

Choose **Unlisted**. Anyone with the future Chrome Web Store URL can install the
extension, but it will not appear in Store search results. Unlisted items still
undergo the normal policy review.
