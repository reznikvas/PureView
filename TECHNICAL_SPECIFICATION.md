# PureView Browser Extension Technical Specification

## 1. Document information

- **Product:** PureView.
- **Product type:** Google Chrome browser extension.
- **Platform:** Chrome Extension Manifest V3.
- **Current development version:** 0.5.0.
- **Document status:** living technical specification.
- **Primary product language:** English.
- **Product website:** <https://pureviewtool.com/>.
- **Source repository:** <https://github.com/reznikvas/PureView>.
- **Publisher:** Vasilii Reznik (`reznik@halam-balam.com`).
- **Source-code license:** GNU General Public License v3.0 only.
- **Distribution:** unlisted Chrome Web Store item and public GitHub repository.

This document is the source of truth for PureView requirements. New behavior,
scope changes, and acceptance criteria should be documented here before or with
their implementation.

## 2. Product purpose

PureView lets a user select one or more useful elements on a web page and hide
everything else. It uses a visual allowlist: while a filter is active, selected
DOM elements remain visible and unrelated DOM branches are hidden.

PureView is site-agnostic. It must preserve the original selected DOM nodes and
their behavior while hiding unrelated navigation, advertising, and other page
branches. Acceptance testing must cover representative static and dynamically
updated HTTP and HTTPS pages without making compatibility claims for a specific
third-party website.

PureView is not a network-level advertisement blocker. The current version hides
page elements after they load but does not prevent HTTP requests made by hidden
components.

## 3. Definitions

- **Site:** the current URL origin: scheme, host, and port.
- **Page:** an origin and pathname without query parameters or a fragment.
- **Allowed element:** a DOM element selected by the user for display.
- **Rule:** a record that associates a page with allowed-element selectors.
- **Filter:** the display mode in which allowed elements remain visible and
  unrelated DOM branches are hidden.
- **Picker:** the interactive element-highlighting and selection mode.

## 4. Current scope

PureView must:

1. Operate on HTTP and HTTPS pages.
2. Allow multiple elements to be selected for one page pathname.
3. Store rules locally in the Chrome profile.
4. Apply saved rules automatically after navigation or reload.
5. Hide every DOM branch outside the combined selected branches.
6. Preserve selected nodes, descendants, and event handlers.
7. Remove every saved rule for the current site on request.
8. Respond to DOM changes after the initial page load.
9. Work without an account, remote service, analytics, or remote code.
10. Remain inactive until the user accepts a prominent in-product privacy
    disclosure.
11. Let the user add and remove multiple elements in one continuous picker
    session before confirming the draft.
12. Apply confirmed picker changes immediately without requiring a reload.
13. List and remove individual page elements from the action popup.
14. Pause and resume a page filter without deleting its rule.

The current version is not required to:

1. Block advertising network requests.
2. Operate on restricted browser pages such as `chrome://extensions`.
3. Synchronize rules between devices.
4. Support Firefox, Safari, or mobile browsers.
5. Automatically identify advertising or useful content.
6. Survive substantial third-party site markup changes without reselection.

## 5. User flows

### 5.1. Edit a page selection

1. The user opens an HTTP or HTTPS page.
2. The user opens the PureView action popup.
3. The popup reports the number of elements selected for the page.
4. The user selects **Select page elements** or **Edit page selection**.
5. The popup closes and the page enters picker mode.
6. The element under the pointer receives a visible outline.
7. The Up arrow selects a parent container; the Down arrow returns to the
   previous child.
8. The user clicks highlighted elements sequentially. A first click adds an
   element to the draft and a second click on the same element removes it.
9. Selected elements retain a distinct outline and the toolbar reports the
   current draft count.
10. The user selects **Done**.
11. PureView stores the complete draft and applies the filter immediately.
12. If the completed draft contains no elements, PureView deletes the page
    rule and shows the full page.

### 5.2. Cancel the picker

1. The user selects **Cancel** or presses `Escape` while the picker is active.
2. The picker closes without changing stored rules.
3. The original filter and pause state are restored immediately.

### 5.3. Manage saved elements

1. The popup lists every allowed element for the current page with its label
   and selector.
2. The user selects **Remove** for one element.
3. PureView removes only that element and immediately reapplies the remaining
   rule.
4. Removing the final element deletes the page rule and restores the full page.

### 5.4. Pause and resume a filter

1. The user selects **Pause filter** for a page with a saved rule.
2. PureView shows the full page immediately and retains the saved rule.
3. The popup reports that the filter is paused.
4. The user selects **Resume filter** and PureView reapplies the rule
   immediately.

### 5.5. Reset a site

1. The user opens the PureView popup.
2. The user selects **Reset filters for this site**.
3. PureView removes every rule whose origin equals the current page origin.
4. The open page is restored immediately without requiring a reload.
5. Saved pause states for the current origin are removed.
6. Rules belonging to other origins remain unchanged.

### 5.6. Handle unavailable selectors

1. PureView attempts to resolve every stored selector.
2. If no element appears before the timeout, PureView restores the full page.
3. If only some elements appear, PureView displays the available elements and
   reports the missing ones.
4. PureView does not automatically modify or delete the stored rule.

## 6. Functional requirements

### FR-001: Supported pages

PureView must support `http://*/*` and `https://*/*` through optional host
permissions. It must request only the current origin after an explicit picker
action. Restricted Chrome pages are outside the extension's access and must fail
safely.

### FR-002: Action popup

The popup must provide:

- the PureView name;
- the current extension version read from the runtime manifest;
- the current page's selected-element count or a site status;
- **Select page elements** when the page rule is empty;
- **Edit page selection** when at least one element exists;
- a list of the current page's saved elements with an individual **Remove**
  control;
- **Pause filter** or **Resume filter** when a page rule exists;
- **Reset filters for this site**;
- a concise picker instruction.

Controls must be disabled with a clear message on unsupported browser pages.
The reset control must remain available when the current origin has optional
site access even if the picker was canceled before a rule was saved.

### FR-003: Visual picker

The picker must:

- highlight the element under the pointer;
- use a distinct persistent marker for elements currently in the draft;
- toggle an element into or out of the draft on sequential clicks;
- report the live draft count;
- provide **Done** and **Cancel** controls in an on-page toolbar;
- defer storage writes until **Done** is selected;
- intercept selection clicks so the site's action is not triggered accidentally;
- exclude PureView's own toolbar and notifications from selection;
- move to a parent with `ArrowUp`;
- return to the prior child with `ArrowDown`;
- cancel with `Escape`;
- restore the original rule and pause state after cancellation.

### FR-004: Selector construction

For each selected element, PureView must create a CSS selector using this
priority:

1. a unique `id`;
2. a unique stable attribute (`data-testid`, `data-test`, or `aria-label`);
3. a unique tag-and-class combination;
4. a structural path using `:nth-of-type()`.

PureView-owned classes and classes that look like long generated numeric IDs
must not be preferred selector inputs.

### FR-005: Rule storage

Rules must be stored under `pureviewRules` in `chrome.storage.local`:

```json
{
  "pureviewRules": {
    "<origin><pathname>": {
      "blocks": [
        {
          "selector": "#first-element",
          "label": "first-element",
          "savedAt": "2026-08-23T00:00:00.000Z"
        },
        {
          "selector": ".second-element",
          "label": "second-element",
          "savedAt": "2026-08-23T00:01:00.000Z"
        }
      ],
      "updatedAt": "2026-08-23T00:01:00.000Z"
    }
  }
}
```

The rule key is the origin plus pathname. Query parameters and fragments are
excluded. A legacy rule containing a top-level `selector` must be migrated to a
`blocks` array without losing the selection.

Paused filters must be stored separately under `pureviewPausedPages` as a map
from the same page key to `true`. A pause entry must never replace or modify the
corresponding rule. Completing picker changes and resetting a site remove the
applicable pause entry.

### FR-006: Filter application

When a page rule exists, PureView must:

1. Resolve every allowed element that is currently available.
2. Determine each resolved element's ancestor chain.
3. Build the union of all allowed DOM branches.
4. Hide children that do not lead to any allowed element.
5. Preserve the complete contents of an allowed ancestor when one selected
   element contains another.
6. Keep original DOM nodes rather than cloning their HTML.
7. Preserve the selected components' scripts and event handlers.
8. Rebuild the filter immediately after a confirmed picker change or individual
   element removal.

Hidden elements use `data-pureview-hidden="true"` and
`display: none !important`.

### FR-007: Flash prevention

While settings load and stored elements are being resolved, the document must be
temporarily hidden. If the page has no rule, it must be revealed immediately
after storage initialization.

### FR-008: Dynamic pages

PureView must observe child-list mutations through `MutationObserver`. Newly
inserted unrelated branches must be hidden. If a selected element is recreated,
PureView must resolve it again and rebuild the union of allowed branches.

### FR-009: Resolution timeout

If no saved element is resolved within 8 seconds, PureView must reveal the full
page and notify the user. If only part of the rule resolves, found elements must
remain visible and the user must be notified about missing elements.

### FR-010: Site reset

The reset action must delete every `pureviewRules` and `pureviewPausedPages`
entry whose URL has the same origin as the active page. The content script must
immediately remove every PureView hiding attribute from the current document.
PureView must also remove the origin's dynamic content-script registration and
optional host permission.

### FR-011: Isolated development launch

`main.py` must locate Chrome or Chromium, create a separate temporary profile,
attempt to load the unpacked `extension` directory, and open a blank page or an
optional URL supplied by the developer without modifying the user's normal
Chrome profile.

### FR-012: Release package

The release process must:

- validate Manifest V3 metadata and required PNG dimensions;
- validate the required 440x280 promotional tile and at least one real Store
  screenshot at 1280x800 or 640x400;
- include `manifest.json` at the ZIP root;
- include the GPLv3 license;
- exclude development files, private keys, profiles, and generated caches;
- produce a deterministic `pureview-<version>-chrome.zip` artifact;
- never include or execute remotely hosted code.

### FR-013: Privacy disclosure and consent

On first install, and after any consent-version increase, PureView must open an
in-product disclosure that describes its handling of browsing activity, website
content, selectors, and local storage. Consent must require an affirmative
checkbox and button action. Before valid consent exists, the content script must
not read the page URL, inspect DOM content, apply filters, or register picker
messages. Accepting the disclosure must enable the popup without requiring an
extension reinstall. DOM access begins only after the user also grants optional
access to the current site through the picker action.

### FR-014: Per-site access

PureView must use `activeTab` for the explicitly invoked tab and request an exact
origin from `optional_host_permissions` when selection starts. After permission
is granted, it must register `content.js` and `content.css` through
`chrome.scripting.registerContentScripts()` with persistence enabled and inject
them into the current tab. The content script must guard against duplicate
injection. No install-time content script may match every HTTP/HTTPS site.

### FR-015: Temporary filter pause

The popup must offer pause and resume controls only when the current page has a
saved rule. Pausing must immediately restore the full page without deleting or
editing the rule. Resuming must immediately reapply the rule. The pause state
must survive navigation and browser restarts until the user resumes the filter,
confirms a new picker draft, removes the final page element, or resets the site.

### FR-016: Individual element removal

The popup must display the label and selector of every current-page block and
allow one block to be removed without affecting other blocks or other pages.
Removing the final block must delete the page rule, clear its pause state, and
restore the full page. Popup-generated text must be inserted with DOM text
properties rather than interpreted as HTML.

## 7. Architecture

### 7.1. Components

- `extension/manifest.json`: permissions, background service worker, icons, and
  action popup metadata.
- `extension/content.js`: picking, selectors, filtering, storage migration, and
  DOM observation.
- `extension/content.css`: filtering, picker, and notification styles.
- `extension/popup.html`, `popup.css`, `popup.js`: action UI and rule controls.
- `extension/background.js`: installation/update disclosure launch and dynamic
  per-origin content-script registration.
- `extension/onboarding.html`, `onboarding.css`, `onboarding.js`: prominent
  privacy disclosure and affirmative consent.
- `extension/icons/`: production PNG icons.
- `tests/background.test.js`: dependency-free site-registration and permission
  tests.
- `tests/content.test.js`: dependency-free filter and migration tests.
- `tests/popup.test.js`: dependency-free popup state and reset tests.
- `scripts/build_release.py`: deterministic release validation and packaging.
- `scripts/prepare_store_assets.py`: reproducible image derivation from branding
  masters.
- `main.py`: optional isolated development launcher.

### 7.2. Runtime messages

- `PUREVIEW_START_PICKER`: enter picker mode.
- `PUREVIEW_REFRESH`: reload the current page rule and pause state from local
  storage and apply the result immediately.
- `PUREVIEW_SET_PAUSED`: immediately pause or resume the current page filter.
- `PUREVIEW_CLEAR_SITE`: restore the page after the site rules are deleted.
- `PUREVIEW_ENABLE_SITE`: register and inject PureView for an approved origin.
- `PUREVIEW_DISABLE_SITE`: unregister PureView and remove origin permission.

### 7.3. Chrome permissions

- `storage`: saves consent, allowlist rules, and pause state locally.
- `activeTab`: temporarily identifies the explicitly invoked tab.
- `scripting`: registers and injects packaged PureView scripts and styles.
- optional HTTP/HTTPS host access: granted for the current origin only when the
  user starts selection, allowing saved rules to run after reload.

PureView must not request permissions for features that are not implemented.
The current release does not require `tabs`, network, cookies, history, or
download permissions.

## 8. Non-functional requirements

### NFR-001: Performance

- Filtering should not introduce a noticeable delay on an ordinary page.
- Mutation callbacks must be coalesced with `requestAnimationFrame`.
- PureView must not continuously poll the DOM.

### NFR-002: Reliability

- A stale selector must not leave a page permanently blank.
- Users must be able to reset filters without editing extension storage.
- A failure on one page must not affect rules for another site.

### NFR-003: Privacy and security

- Rules must remain in `chrome.storage.local`.
- PureView must not collect analytics or transmit browsing data.
- PureView must not execute remote code.
- Required permissions must be the minimum needed for current functionality.
- Source submitted to the Chrome Web Store must remain readable and
  unobfuscated.
- Website data must not be handled before the current consent version is
  accepted.

### NFR-004: Maintainability

- JavaScript must pass `node --check`.
- `manifest.json` must be valid JSON.
- `node tests/background.test.js` must pass.
- `node tests/content.test.js` must pass.
- `node tests/popup.test.js` must pass.
- `python3 scripts/build_release.py` must validate and build the release.
- Storage-format changes must include migration or a documented reset path.

### NFR-005: Open-source governance

- Source code must be published under `GPL-3.0-only` with a complete `LICENSE`.
- Private signing keys, Chrome profiles, and build output must not be committed.
- Public contributions must follow `CONTRIBUTING.md` and the code of conduct.
- Vulnerabilities must be reported using the process in `SECURITY.md`.

## 9. Acceptance criteria

### AC-001: Page selection

After confirming a page component, that component is immediately visible while
unrelated navigation, advertising, and other branches are hidden. The same
filter is restored after reload.

### AC-002: Selected component operation

Interactive controls inside a selected component continue to work after
filtering, and dynamically inserted descendants remain visible.

### AC-003: Persistence

All saved elements are applied automatically after the page is closed and
reopened in the same Chrome profile.

### AC-004: Site reset

Resetting a site restores the full page immediately and prevents filtering after
subsequent reloads on every pathname with the same origin.

### AC-005: Site isolation

Resetting one site does not remove a rule belonging to another origin.

### AC-006: Stale selectors

If no selected element exists, the page is restored within 8 seconds and a
PureView notification is displayed. If only some elements exist, those elements
remain visible and a partial-resolution notification is displayed.

### AC-007: Multiple elements

After two independent elements are selected, the popup reports two elements and
both remain visible immediately and after reload. Unrelated branches are hidden.

### AC-008: Release validation

The release command passes, the package contains a root-level manifest and
license, its icons and Store assets have the required dimensions, and no `.pem`,
`.crx`, cache, test, source-master, or local-profile file is present.

### AC-009: Consent gate

After a clean installation, PureView opens the disclosure and remains inactive.
Before acceptance, an existing saved rule does not inspect or hide page content.
After the user checks the agreement and selects **Agree and enable PureView**,
the popup becomes available. Starting selection then requests access to the
current origin. Closing the disclosure without agreement leaves PureView
inactive.

### AC-010: Least-privilege site access

Installing PureView does not grant access to every website. Starting selection
requests access only to the active origin. After permission is granted, the
filter applies automatically on that origin after reload. Resetting the site
removes both the rule and persistent site access. If the first picker is
canceled before a rule is saved, reset remains available to revoke that access.

### AC-011: Continuous picker editing

One picker session can add two or more elements and remove an element by clicking
it again. The live count and selected markers match the draft. No draft change is
stored until Done is selected. Done applies the final rule without reload;
Cancel and Escape preserve the original stored rule and filter state.

### AC-012: Pause and resume

Pausing a current-page filter restores the full page immediately while retaining
the rule. Resuming restores the filtered view immediately. Resetting the site or
removing the final page element deletes the applicable pause entry.

### AC-013: Popup rule management

The popup lists each current-page element and its count. Removing one entry
immediately reapplies the remaining rule without changing other entries or
origins. Removing the final entry restores the full page.

### AC-014: Version visibility

The popup displays the installed extension version from the runtime manifest so
the user can identify the active build without opening Chrome's extension
management page.

## 10. Known limitations

1. Third-party markup changes can invalidate saved selectors.
2. Closed shadow roots cannot be selected.
3. Cross-origin frame contents are not handled as part of the top-level DOM.
4. A selected component can depend on a hidden sibling.
5. Hidden advertising resources can continue to load over the network.
6. Subdomains are separate sites.
7. Rules are local to one Chrome profile.

## 11. Future work

The following items require separate approval and specification:

- JSON import and export;
- optional Chrome Sync support;
- manual selector editing and fallback selectors;
- open shadow-root and frame support;
- keyboard shortcuts;
- network-level request blocking;
- URL patterns instead of exact pathnames;
- additional interface localizations;
- automated end-to-end Chrome tests.

## 12. Open decisions

1. Should a rule cover an exact pathname or a user-defined URL pattern?
2. Should site reset optionally include subdomains?
3. Should the product ever block network requests?
4. Should PureView provide a global rule-management page?

## 13. Document history

| Document version | Date       | Changes |
|------------------|------------|---------|
| 0.1              | 2026-08-23 | Documented the PureView 0.2.0 prototype. |
| 0.2              | 2026-08-23 | Added multiple allowed elements and rule migration for 0.3.0. |
| 0.3              | 2026-08-23 | Translated the specification to English and added GPL, GitHub, privacy, Chrome Web Store, and explicit consent-gate requirements for PureView 0.4.0. |
| 0.4              | 2026-08-27 | Added continuous draft-based selection, Done/Cancel, immediate application, popup rule management, pause/resume, and automated acceptance coverage for PureView 0.5.0. |
