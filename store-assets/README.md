# Chrome Web Store Assets

## Ready

- `promo-small-440x280.png`: required small promotional tile.
- `../extension/icons/icon128.png`: required 128x128 extension/store icon.
- `screenshot-01-popup-1280x800.png`: real 1280x800 Chrome screenshot from
  version 0.4.0. Replace it after manual testing with a capture of the 0.5.0
  popup, or supplement it with a current picker screenshot before Store upload.

The branding masters are stored in `../assets/branding/`. Run
`python3 scripts/prepare_store_assets.py` after intentional changes to those
masters.

## Optional additional screenshots

Capture updated screenshots at 1280x800 with square corners and no artificial
browser or interface mockups.

Recommended set:

1. `screenshot-01-popup-1280x800.png`: the updated popup showing its element
   count, saved-element list, and Pause filter control.
2. `screenshot-02-picker-1280x800.png`: the continuous picker showing selected
   markers, the live count, and Done/Cancel controls.
3. `screenshot-03-filtered-1280x800.png`: the same page immediately after Done,
   showing two allowed elements and unrelated content hidden.

Before capture:

- use a clean Chrome profile;
- avoid personal bookmarks, account avatars, notifications, and private data;
- obtain permission for any third-party content prominently shown;
- do not imply that PureView blocks network requests;
- verify that screenshots remain understandable when downscaled to 640x400.

The optional 1400x560 marquee promotional tile is intentionally deferred for
the initial unlisted release.
