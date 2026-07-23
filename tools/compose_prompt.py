from __future__ import annotations

import argparse
from pathlib import Path

from asset_common import find_asset, flatten_mapping


def build_prompt(asset: dict) -> str:
    sections: list[str] = [
        f"Asset id: {asset['id']}",
        f"Asset category: {asset['category']}",
        f"Asset name: {asset['name']}",
    ]
    for heading, key in (
        ("Canvas", "canvas"),
        ("Runtime", "runtime"),
        ("References", "references"),
        ("View", "view"),
        ("Style", "style"),
    ):
        if asset.get(key):
            sections.append(f"\n{heading}:")
            sections.extend(f"- {line}" for line in flatten_mapping(asset[key]))
    if asset.get("identity_locked"):
        sections.append("\nIdentity lock:")
        sections.extend(f"- {item}" for item in asset["identity_locked"])
    sections.append("\nConstraints:")
    sections.extend(f"- {item}" for item in asset.get("constraints", []))
    sections.append(
        "\nUse the referenced NTSI master assets and style guides. "
        "Do not add unlisted subjects, text, effects, UI, or narrative elements."
    )
    return "\n".join(sections)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compose a deterministic built-in image-generation prompt from an NTSI YAML spec."
    )
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--id")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    asset = find_asset(args.spec, args.id)
    prompt = build_prompt(asset)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(prompt + "\n", encoding="utf-8")
    else:
        print(prompt)


if __name__ == "__main__":
    main()

