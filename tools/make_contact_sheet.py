from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit(
        "Missing Pillow. Run: python -m pip install -r tools/requirements.txt"
    ) from exc


def load_allowed(report_path: Path | None) -> set[str] | None:
    if report_path is None:
        return None
    data = json.loads(report_path.read_text(encoding="utf-8"))
    reports = data if isinstance(data, list) else [data]
    return {str(Path(item["file"]).resolve()) for item in reports if item.get("passed")}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a labeled contact sheet from NTSI candidates.")
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--columns", type=int, default=2)
    parser.add_argument("--cell-width", type=int, default=520)
    parser.add_argument("--cell-height", type=int, default=380)
    parser.add_argument("--validation-report", type=Path)
    args = parser.parse_args()

    files: list[Path] = []
    for item in args.inputs:
        if item.is_dir():
            files.extend(sorted(path for path in item.iterdir() if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}))
        elif item.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
            files.append(item)
    allowed = load_allowed(args.validation_report)
    if allowed is not None:
        files = [path for path in files if str(path.resolve()) in allowed]
    if not files:
        raise SystemExit("No eligible images found.")

    columns = max(1, args.columns)
    rows = math.ceil(len(files) / columns)
    label_height = 42
    sheet = Image.new("RGB", (columns * args.cell_width, rows * (args.cell_height + label_height)), "#d9d7d0")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, path in enumerate(files):
        column = index % columns
        row = index // columns
        x = column * args.cell_width
        y = row * (args.cell_height + label_height)
        with Image.open(path) as source:
            image = source.convert("RGBA")
            image.thumbnail((args.cell_width - 24, args.cell_height - 24), Image.Resampling.LANCZOS)
            checker = Image.new("RGBA", (args.cell_width, args.cell_height), "#f1eee5")
            px = x + (args.cell_width - image.width) // 2
            py = y + (args.cell_height - image.height) // 2
            checker.alpha_composite(image, (px - x, py - y))
            sheet.paste(checker.convert("RGB"), (x, y))
        draw.rectangle((x, y + args.cell_height, x + args.cell_width, y + args.cell_height + label_height), fill="#202c2a")
        draw.text((x + 12, y + args.cell_height + 13), f"{index + 1:02d}  {path.name}", fill="#f4eddd", font=font)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"Wrote {args.out} ({len(files)} candidates)")


if __name__ == "__main__":
    main()

