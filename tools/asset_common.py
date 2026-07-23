from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any, Iterable
import json

try:
    import yaml
except ImportError as exc:
    raise SystemExit(
        "Missing PyYAML. Run: python -m pip install -r tools/requirements.txt"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
SPEC_DIR = ROOT / "assets-spec"


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = deepcopy(value)
    return result


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Top-level YAML value must be a mapping: {path}")
    return data


def iter_assets(path: Path) -> Iterable[dict[str, Any]]:
    data = load_yaml(path)
    defaults = data.get("defaults", {})
    for raw in data.get("assets", []):
        if not isinstance(raw, dict):
            continue
        yield deep_merge(defaults, raw)


def find_asset(spec_path: Path, asset_id: str | None) -> dict[str, Any]:
    assets = list(iter_assets(spec_path))
    if not assets:
        raise ValueError(f"No assets found in {spec_path}")
    if asset_id is None:
        if len(assets) != 1:
            choices = ", ".join(str(item.get("id")) for item in assets)
            raise ValueError(f"--id is required. Available: {choices}")
        return assets[0]
    for item in assets:
        if item.get("id") == asset_id:
            return item
    raise ValueError(f"Asset id not found: {asset_id}")


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def flatten_mapping(value: Any, prefix: str = "") -> list[str]:
    lines: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            label = f"{prefix}.{key}" if prefix else str(key)
            lines.extend(flatten_mapping(child, label))
    elif isinstance(value, list):
        lines.append(f"{prefix}: " + ", ".join(str(item) for item in value))
    else:
        lines.append(f"{prefix}: {value}")
    return lines

