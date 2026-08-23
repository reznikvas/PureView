"""Validate and build a deterministic Chrome Web Store ZIP package."""

# SPDX-License-Identifier: GPL-3.0-only

from __future__ import annotations

import hashlib
import json
import struct
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXTENSION_DIR = ROOT / "extension"
MANIFEST_PATH = EXTENSION_DIR / "manifest.json"
LICENSE_PATH = ROOT / "LICENSE"
DIST_DIR = ROOT / "dist"
STORE_ASSET_DIR = ROOT / "store-assets"
REQUIRED_ICON_SIZES = (16, 32, 48, 128)
FORBIDDEN_SUFFIXES = {".crx", ".pem", ".pyc", ".pyo"}
EXPECTED_HOMEPAGE = "https://pureviewtool.com/"


def fail(message: str) -> None:
    raise ValueError(message)


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as image:
        signature = image.read(24)
    if len(signature) != 24 or signature[:8] != b"\x89PNG\r\n\x1a\n":
        fail(f"Expected a PNG image: {path}")
    return struct.unpack(">II", signature[16:24])


def validate_manifest() -> dict[str, object]:
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"Invalid extension manifest: {error}")

    if manifest.get("manifest_version") != 3:
        fail("Chrome Web Store submissions must use Manifest V3")
    if not manifest.get("name") or not manifest.get("version"):
        fail("The manifest must contain name and version")
    description = manifest.get("description")
    if not isinstance(description, str) or not description.strip():
        fail("The manifest must contain a non-empty description")
    if len(description) > 132:
        fail("The manifest description must not exceed 132 characters")
    if manifest.get("homepage_url") != EXPECTED_HOMEPAGE:
        fail(f"The manifest homepage_url must be {EXPECTED_HOMEPAGE}")

    permissions = set(manifest.get("permissions", []))
    if permissions != {"activeTab", "scripting", "storage"}:
        fail(f"Unexpected required permissions: {sorted(permissions)}")
    optional_hosts = set(manifest.get("optional_host_permissions", []))
    if optional_hosts != {"http://*/*", "https://*/*"}:
        fail(f"Unexpected optional host permissions: {sorted(optional_hosts)}")
    if manifest.get("content_scripts"):
        fail("Static broad content scripts are not allowed in the release manifest")

    icons = manifest.get("icons", {})
    for size in REQUIRED_ICON_SIZES:
        relative_path = icons.get(str(size))
        if not relative_path:
            fail(f"Missing {size}x{size} manifest icon")
        icon_path = EXTENSION_DIR / relative_path
        if not icon_path.is_file():
            fail(f"Missing icon file: {icon_path}")
        if png_dimensions(icon_path) != (size, size):
            fail(f"Icon has incorrect dimensions: {icon_path}")

    return manifest


def validate_store_assets() -> None:
    promo = STORE_ASSET_DIR / "promo-small-440x280.png"
    if not promo.is_file() or png_dimensions(promo) != (440, 280):
        fail("The Chrome Web Store small promotional tile must be a 440x280 PNG")

    screenshots = sorted(STORE_ASSET_DIR.glob("screenshot-*.png"))
    if not screenshots:
        fail("At least one real Chrome Web Store screenshot is required")
    for screenshot in screenshots:
        if png_dimensions(screenshot) not in {(1280, 800), (640, 400)}:
            fail(f"Store screenshot has unsupported dimensions: {screenshot}")


def package_files() -> list[tuple[Path, str]]:
    files: list[tuple[Path, str]] = []
    for path in sorted(EXTENSION_DIR.rglob("*")):
        if not path.is_file():
            continue
        if path.is_symlink():
            fail(f"Symlinks are not allowed in the release package: {path}")
        if path.suffix.lower() in FORBIDDEN_SUFFIXES or "__pycache__" in path.parts:
            fail(f"Forbidden file in the extension directory: {path}")
        files.append((path, path.relative_to(EXTENSION_DIR).as_posix()))

    if not LICENSE_PATH.is_file():
        fail("LICENSE is required for the GPL release")
    files.append((LICENSE_PATH, "LICENSE"))
    return files


def build() -> Path:
    manifest = validate_manifest()
    validate_store_assets()
    files = package_files()
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    output = DIST_DIR / f"pureview-{manifest['version']}-chrome.zip"

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for source, archive_name in files:
            info = zipfile.ZipInfo(archive_name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, source.read_bytes(), compresslevel=9)

    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    print(f"Built: {output.relative_to(ROOT)}")
    print(f"SHA-256: {digest}")
    return output


def main() -> int:
    try:
        build()
    except ValueError as error:
        print(f"Release validation failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
