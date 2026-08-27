# Chrome Web Store Update 0.5.0

Use this checklist to update the existing PureView item. Do not create a second
Chrome Web Store item.

## Item and package

- **Item:** PureView
- **Extension ID:** `mjdchlffjjnpoijpfajekkhhgbnmacmm`
- **Visibility:** Unlisted
- **Current published version before this update:** 0.4.0
- **New version:** 0.5.0
- **Package:** `dist/pureview-0.5.0-chrome.zip`
- **SHA-256:** `ccd92733ed0e5af23071d957d82056c4acaa0104c283c5b5b8ea2ab7b5ee7c1e`

The package keeps the existing required and optional permissions. Version 0.5.0
does not add host patterns, remote code, analytics, data transmission, or a new
Chrome API permission.

## Release notes

PureView 0.5.0 makes page selection faster and easier to manage:

- add or remove multiple elements in one continuous selection session;
- confirm or discard a draft with Done and Cancel;
- apply confirmed filters immediately without reloading the page;
- review and remove individual saved elements in the popup;
- pause and resume a page filter without deleting it;
- see the installed PureView version in the popup;
- benefit from expanded automated coverage for the main user flows.

## Listing changes

Copy the updated detailed description and permission justifications from
`docs/CHROME_WEB_STORE_LISTING.md`. In particular:

- replace the old reload-based workflow with the continuous picker workflow;
- mention individual rule management and Pause/Resume;
- update the `storage` justification to include local pause/resume state;
- keep the existing single-purpose, host-access, and remote-code declarations;
- keep visibility set to **Unlisted**.

The Privacy Practices categories remain:

- Web history: **Yes**;
- Website content: **Yes**;
- User activity: **Yes**;
- all other documented categories: **No**.

The public privacy policy must show an effective date of August 27, 2026 and
must disclose that pause/resume state is stored locally.

## Screenshot required before submission

Replace or supplement the 0.4.0 screenshot with at least one real Chrome
screenshot showing the 0.5.0 interface. Use 1280x800 PNG/JPEG or 640x400 with
square corners and no padding. A recommended screenshot shows:

- the PureView popup opened on a non-sensitive page;
- two saved elements and the selected-element count;
- the Pause filter control;
- the `v0.5.0` version badge.

An optional second screenshot can show the continuous picker with selected
outlines, its live count, and Done/Cancel controls. Do not use generated UI or a
mockup; Chrome Web Store screenshots must show the actual extension experience.

## Dashboard submission

1. Open the Chrome Web Store Developer Dashboard.
2. Open the existing PureView item.
3. In **Package**, select **Upload New Package** and upload the 0.5.0 ZIP.
4. In **Store listing**, update the detailed description and screenshots.
5. In **Privacy practices**, verify the declarations and updated `storage`
   justification.
6. In **Distribution**, confirm **Unlisted** visibility.
7. Save every section and review the Store preview.
8. Select **Submit for Review**.
9. Choose automatic publication or deferred publication. A reviewed deferred
   submission must be published within 30 days or it returns to draft.

While 0.5.0 is under review, version 0.4.0 remains available to existing users
and new installs. After publication, Chrome updates users automatically under
the same extension ID and Store URL.
