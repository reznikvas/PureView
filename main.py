"""Launch an isolated Chrome window with the PureView extension loaded."""

# SPDX-License-Identifier: GPL-3.0-only

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


DEFAULT_START_URL = "about:blank"
PROJECT_DIR = Path(__file__).resolve().parent
EXTENSION_DIR = PROJECT_DIR / "extension"
PROFILE_DIR = Path(tempfile.gettempdir()) / "pureview-chrome-profile"


def find_chrome() -> str:
    """Return the first Chrome/Chromium executable available on PATH."""
    for executable in (
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
    ):
        if path := shutil.which(executable):
            return path
    raise FileNotFoundError("Google Chrome or Chromium was not found on PATH")


def main() -> int:
    manifest = EXTENSION_DIR / "manifest.json"
    if not manifest.is_file():
        print(f"Extension manifest was not found: {manifest}", file=sys.stderr)
        return 1

    try:
        chrome = find_chrome()
    except FileNotFoundError as error:
        print(error, file=sys.stderr)
        return 1

    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    start_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_START_URL
    command = [
        chrome,
        f"--user-data-dir={PROFILE_DIR}",
        f"--disable-extensions-except={EXTENSION_DIR}",
        f"--load-extension={EXTENSION_DIR}",
        "--no-first-run",
        "--no-default-browser-check",
        start_url,
    ]

    print(f"Launching PureView in an isolated profile: {PROFILE_DIR}")
    print("If the icon is hidden, open Chrome's Extensions menu (the puzzle icon).")
    subprocess.Popen(command, start_new_session=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
