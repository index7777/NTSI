from __future__ import annotations

import argparse
import math
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit(
        "Missing Pillow. Run: python -m pip install -r tools/requirements.txt"
    ) from exc

from asset_common import write_json


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a bottom-center aligned sprite sheet from already validated frames."
    )
    parser.add_argument("frames", nargs="+", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--meta", type=Path, required=True)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--validated", action="store_true", help="Required acknowledgement that frames passed validation.")
    args = parser.parse_args()
    if not args.validated:
        raise SystemExit("Refusing to build: pass --validated only after asset validation and human approval.")

    images = [Image.open(path).convert("RGBA") for path in args.frames]
    try:
        cell_width = max(image.width for image in images)
        cell_height = max(image.height for image in images)
        columns = max(1, args.columns)
        rows = math.ceil(len(images) / columns)
        sheet = Image.new("RGBA", (cell_width * columns, cell_height * rows), (0, 0, 0, 0))
        frames_meta = []
        for index, (path, image) in enumerate(zip(args.frames, images)):
            column = index % columns
            row = index // columns
            x = column * cell_width + (cell_width - image.width) // 2
            y = row * cell_height + (cell_height - image.height)
            sheet.alpha_composite(image, (x, y))
            frames_meta.append({
                "name": path.stem,
                "frame": {"x": column * cell_width, "y": row * cell_height, "w": cell_width, "h": cell_height},
                "source_size": {"w": image.width, "h": image.height},
                "anchor": {"x": 0.5, "y": 1.0},
            })
        args.out.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(args.out)
        write_json(args.meta, {"image": args.out.name, "frames": frames_meta})
        print(f"Wrote {args.out} and {args.meta}")
    finally:
        for image in images:
            image.close()


if __name__ == "__main__":
    main()

