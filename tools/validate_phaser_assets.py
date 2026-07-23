from __future__ import annotations

import argparse
import re
from pathlib import Path

from asset_common import ROOT, write_json


ASSET_LITERAL = re.compile(r"""["'](assets/[^"'?#]+)["']""")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate literal Phaser asset references.")
    parser.add_argument("--src", type=Path, default=ROOT / "game" / "src")
    parser.add_argument("--public", type=Path, default=ROOT / "game" / "public")
    parser.add_argument("--report", type=Path, default=ROOT / "art" / "reviews" / "phaser-asset-validation.json")
    args = parser.parse_args()

    references: dict[str, list[str]] = {}
    for source in sorted(args.src.rglob("*.ts")):
        text = source.read_text(encoding="utf-8")
        for match in ASSET_LITERAL.finditer(text):
            references.setdefault(match.group(1), []).append(str(source.relative_to(ROOT)))

    missing = []
    for relative, sources in references.items():
        if not (args.public / relative).is_file():
            missing.append({"path": relative, "sources": sources})

    public_files = {
        path.relative_to(args.public).as_posix()
        for path in args.public.rglob("*")
        if path.is_file()
    }
    unused = sorted(public_files - set(references))
    report = {
        "passed": not missing,
        "reference_count": len(references),
        "missing": missing,
        "unused_warning": unused,
    }
    write_json(args.report, report)
    print(f"{'PASS' if report['passed'] else 'FAIL'} Phaser assets: {len(references)} references")
    for item in missing:
        print(f"FAIL missing {item['path']} <- {', '.join(item['sources'])}")
    print(f"Warnings: {len(unused)} public files are not referenced by literal TypeScript asset paths.")
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
