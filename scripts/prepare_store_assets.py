"""Generate committed Chrome icon sizes and the small Web Store promo image."""

# SPDX-License-Identifier: GPL-3.0-only

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ICON_MASTER = ROOT / "assets" / "branding" / "pureview-icon-master.png"
PROMO_MASTER = ROOT / "assets" / "branding" / "pureview-promo-master.png"
ICON_DIR = ROOT / "extension" / "icons"
STORE_ASSET_DIR = ROOT / "store-assets"


def normalized_icon(master: Image.Image, size: int) -> Image.Image:
    """Place the artwork at 75% width, matching Chrome's square-icon guidance."""
    rgba = master.convert("RGBA")
    alpha = rgba.getchannel("A")
    thresholded = alpha.point(lambda value: 255 if value > 16 else 0)
    bounding_box = thresholded.getbbox()
    if bounding_box is None:
        raise ValueError("The icon master does not contain visible artwork")

    artwork = rgba.crop(bounding_box)
    square_side = max(artwork.size)
    square = Image.new("RGBA", (square_side, square_side), (0, 0, 0, 0))
    square.alpha_composite(
        artwork,
        ((square_side - artwork.width) // 2, (square_side - artwork.height) // 2),
    )

    artwork_size = max(1, round(size * 0.75))
    resized = square.resize((artwork_size, artwork_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        ((size - artwork_size) // 2, (size - artwork_size) // 2),
    )
    return canvas


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    STORE_ASSET_DIR.mkdir(parents=True, exist_ok=True)

    with Image.open(ICON_MASTER) as icon_master:
        for size in (16, 32, 48, 128):
            output = ICON_DIR / f"icon{size}.png"
            normalized_icon(icon_master, size).save(output, optimize=True)
            print(f"Generated {output.relative_to(ROOT)}")

    with Image.open(PROMO_MASTER) as promo_master:
        promo = ImageOps.fit(
            promo_master.convert("RGB"),
            (440, 280),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        output = STORE_ASSET_DIR / "promo-small-440x280.png"
        promo.save(output, optimize=True)
        print(f"Generated {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
