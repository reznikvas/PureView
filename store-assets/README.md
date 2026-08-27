# Chrome Web Store Assets

## Ready

- `promo-small-440x280.png`: required small promotional tile.
- `../extension/icons/icon128.png`: required 128x128 extension/store icon.
- `screenshot-01-popup-1280x800.png`: initial/reset popup with the version badge.
- `screenshot-02-popup-1280x800.png`: continuous picker with three selected
  elements, live count, and Done/Cancel controls.
- `screenshot-03-popup-1280x800.png`: filtered result immediately after Done.
- `screenshot-04-popup-1280x800.png`: active popup with three saved elements,
  individual Remove controls, Pause filter, and the version badge.

All screenshots are real Chrome captures from PureView 0.5.0 at 1280x800. They
were reviewed to exclude account avatars and other personal information.

The branding masters are stored in `../assets/branding/`. Run
`python3 scripts/prepare_store_assets.py` after intentional changes to those
masters.

## Recommended Store order

Order the screenshots in the Developer Dashboard as follows:

1. `screenshot-04-popup-1280x800.png`: presents the complete popup feature set.
2. `screenshot-02-popup-1280x800.png`: demonstrates continuous selection.
3. `screenshot-03-popup-1280x800.png`: shows the immediate filtered result.
4. `screenshot-01-popup-1280x800.png`: shows the initial/reset state.

## Capture requirements

Future replacements must remain real 1280x800 or 640x400 Chrome captures with
square corners and no artificial browser or interface mockups.

Before capture:

- use a clean Chrome profile;
- avoid personal bookmarks, account avatars, notifications, and private data;
- obtain permission for any third-party content prominently shown;
- do not imply that PureView blocks network requests;
- verify that screenshots remain understandable when downscaled to 640x400.

The optional 1400x560 marquee promotional tile remains deferred for the unlisted
release.
