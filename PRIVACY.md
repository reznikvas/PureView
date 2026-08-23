# PureView Privacy Policy

Effective date: August 23, 2026

PureView is a browser extension that lets users select page elements to keep
visible and hides unrelated page elements. This policy explains the data
PureView handles to provide that feature.

## Data PureView handles

PureView handles the following information on the user's device:

- the origin and pathname of a page for which the user creates a rule;
- CSS selectors, short element labels, and timestamps for elements explicitly
  selected by the user;
- website DOM content temporarily, to highlight selectable elements and apply
  the user's saved allowlist;
- pointer and click interactions temporarily while the user has explicitly
  enabled the element picker.

Depending on the page, website content can include personal or sensitive
information. PureView does not intentionally extract form values, passwords,
cookies, authentication data, personal communications, or financial data.

## How the data is used

The information is used only to provide PureView's single user-facing purpose:
letting the user choose page elements and automatically hiding unrelated DOM
branches on later page loads.

Saved rules are stored in `chrome.storage.local` inside the user's Chrome
profile. PureView does not use `chrome.storage.sync` in the current release.

## Data transmission, sharing, and sale

PureView does not transmit user data to the developer or to third parties. It
has no developer-operated server, analytics, telemetry, advertising, account,
or remote-code component. PureView does not sell, rent, share, or monetize user
data.

## Retention and deletion

Saved rules remain in the local Chrome profile until the user:

- selects **Reset filters for this site**;
- clears the extension's storage using browser or developer tools; or
- uninstalls PureView.

Temporary DOM and pointer information is not retained after the interaction or
page session, except for the selector, label, URL key, and timestamp saved when
the user confirms a selection.

## Permissions

PureView uses the following access:

- `storage`: saves the allowlist and privacy-consent record locally;
- `activeTab`: temporarily identifies the active page after the user opens the
  PureView toolbar popup;
- `scripting`: installs and runs PureView's packaged content script and styles;
- optional HTTP or HTTPS site access: requested for the current origin only when
  the user selects an element, then used to apply saved rules after reload.

Resetting a site's filters removes its optional host permission. PureView does
not request access to cookies, downloads, history APIs, authentication data, or
network requests.

## User choice and consent

PureView remains inactive until the user accepts its in-product privacy
disclosure. Users who do not agree can close the disclosure page and leave the
extension inactive. If this policy or PureView's data handling materially
changes, the consent version will be updated and users will be asked to review
the new disclosure before the affected processing resumes.

## Limited Use disclosure

PureView's use of information received from Chrome APIs complies with the
Chrome Web Store User Data Policy, including the Limited Use requirements. User
data is used only to provide or improve PureView's disclosed single purpose and
is not used for advertising, creditworthiness, lending, or unrelated purposes.

## Security

PureView minimizes data exposure by keeping rules on the user's device and by
shipping all executable code inside the extension package. Because no user data
is transmitted by PureView, there is no PureView network transmission to
encrypt.

## Children's privacy

PureView is a general-purpose browser customization tool. It does not knowingly
collect personal information from children or from any other users.

## Changes to this policy

Changes will be documented in the public source repository. Material changes to
data handling will also be disclosed inside the extension before the new
handling begins.

## Contact

Privacy questions can be sent to Vasilii Reznik at
<reznik@halam-balam.com>. The public policy URL is
<https://pureviewtool.com/privacy/>, and general support is available at
<https://pureviewtool.com/support/>.
