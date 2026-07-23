from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit(
        "Missing Pillow. Run: python -m pip install -r tools/requirements.txt"
    ) from exc

from asset_common import find_asset, write_json


def add(checks: list[dict[str, Any]], name: str, passed: bool, detail: str, level: str = "error") -> None:
    checks.append({"name": name, "passed": passed, "level": level, "detail": detail})


def validate_image(path: Path, asset: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    if not path.exists():
        add(checks, "file_exists", False, str(path))
        return {"asset_id": asset["id"], "file": str(path), "passed": False, "checks": checks}

    with Image.open(path) as source:
        image = source.convert("RGBA")
        expected = asset.get("canvas", {})
        expected_size = (expected.get("width"), expected.get("height"))
        exact_size = image.size == expected_size
        add(checks, "canvas_size", exact_size, f"actual={image.size}, expected={expected_size}")

        requires_alpha = bool(expected.get("transparent"))
        alpha = image.getchannel("A")
        extrema = alpha.getextrema()
        add(
            checks,
            "alpha_channel",
            not requires_alpha or extrema[0] < 255,
            f"transparent_required={requires_alpha}, alpha_range={extrema}",
        )

        corners = [alpha.getpixel((0, 0)), alpha.getpixel((image.width - 1, 0)),
                   alpha.getpixel((0, image.height - 1)), alpha.getpixel((image.width - 1, image.height - 1))]
        add(
            checks,
            "transparent_corners",
            not requires_alpha or max(corners) <= 8,
            f"corner_alpha={corners}",
        )

        bbox = alpha.getbbox()
        if requires_alpha and bbox:
            left, top, right, bottom = bbox
            margin = min(left, top, image.width - right, image.height - bottom)
            add(checks, "not_cropped", margin >= 1, f"alpha_bbox={bbox}, minimum_margin={margin}")
        else:
            add(checks, "not_cropped", True, "opaque scene or empty alpha")

        visible = 0
        magenta = 0
        green = 0
        for red, green_value, blue, opacity in image.get_flattened_data():
            if opacity <= 8:
                continue
            visible += 1
            if red > 210 and blue > 210 and green_value < 80:
                magenta += 1
            if green_value > 210 and red < 80 and blue < 80:
                green += 1
        residue = (magenta + green) / max(1, visible)
        add(checks, "chroma_residue", residue <= 0.001, f"visible_chroma_ratio={residue:.6f}")

    for manual in asset.get("manual_checks", []):
        add(checks, f"manual:{manual}", False, "human approval required", level="manual")

    hard_failures = [item for item in checks if item["level"] == "error" and not item["passed"]]
    return {
        "asset_id": asset["id"],
        "file": str(path),
        "passed": not hard_failures,
        "manual_approval_required": bool(asset.get("manual_checks")),
        "checks": checks,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate one NTSI image against its YAML specification.")
    parser.add_argument("image", type=Path)
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--id")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    asset = find_asset(args.spec, args.id)
    report = validate_image(args.image, asset)
    if args.report:
        write_json(args.report, report)
    print(f"{'PASS' if report['passed'] else 'FAIL'} {asset['id']} -> {args.image}")
    for check in report["checks"]:
        marker = "PASS" if check["passed"] else ("MANUAL" if check["level"] == "manual" else "FAIL")
        print(f"{marker} {check['name']}: {check['detail']}")
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
