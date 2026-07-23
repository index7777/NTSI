from __future__ import annotations

import argparse
import mimetypes
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

from asset_common import ROOT, write_json


def describe(path: Path, public_root: Path) -> dict:
    relative = path.relative_to(public_root).as_posix()
    item = {
        "path": relative,
        "bytes": path.stat().st_size,
        "mime": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
    }
    if Image is not None and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
        try:
            with Image.open(path) as image:
                item["width"], item["height"] = image.size
                item["mode"] = image.mode
        except OSError:
            item["image_error"] = "unreadable"
    return item


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a deterministic manifest for Phaser runtime assets.")
    parser.add_argument("--public", type=Path, default=ROOT / "game" / "public" / "assets")
    parser.add_argument("--out", type=Path, default=ROOT / "game" / "src" / "generated" / "asset-manifest.json")
    args = parser.parse_args()
    files = sorted(path for path in args.public.rglob("*") if path.is_file())
    manifest = {
        "version": 1,
        "root": "assets",
        "count": len(files),
        "assets": [describe(path, args.public) for path in files],
    }
    write_json(args.out, manifest)
    print(f"Wrote {args.out} ({len(files)} assets)")


if __name__ == "__main__":
    main()

