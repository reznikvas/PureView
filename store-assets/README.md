# Chrome Web Store Assets

## Ready

- `promo-small-440x280.png`: required small promotional tile.
- `../extension/icons/icon128.png`: required 128x128 extension/store icon.
- `screenshot-01-popup-1280x800.png`: real 1280x800 Chrome screenshot showing
  the PureView popup.

The branding masters are stored in `../assets/branding/`. Run
`python3 scripts/prepare_store_assets.py` after intentional changes to those
masters.

## Optional additional screenshots

The required real screenshot is ready. Additional screenshots can show more of
the workflow. Capture them at 1280x800 with square corners and no artificial
browser or interface mockups.

Recommended set:

1. `screenshot-02-picker-1280x800.png`: PureView picker highlighting a useful
   page container, with the keyboard instruction visible.
2. `screenshot-03-filtered-1280x800.png`: the same page after reload, showing two
   allowed elements and unrelated content hidden.

Before capture:

- use a clean Chrome profile;
- avoid personal bookmarks, account avatars, notifications, and private data;
- obtain permission for any third-party content prominently shown;
- do not imply that PureView blocks network requests;
- verify that screenshots remain understandable when downscaled to 640x400.

The optional 1400x560 marquee promotional tile is intentionally deferred for
the initial unlisted release.
