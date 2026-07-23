from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter


SOURCE_BOXES = {
    "mechanism-ink-effect-v2.png": (20, 100, 520, 625),
    "question-stone-ink-effect-v2.png": (520, 100, 1020, 625),
    "identity-jade-slip-ink-effect-v3.png": (1020, 100, 1520, 625),
}


def extract(source: Path, output_dir: Path) -> None:
    image = Image.open(source).convert("RGB")
    pixels = np.asarray(image).astype(np.float32)
    output_dir.mkdir(parents=True, exist_ok=True)

    for filename, box in SOURCE_BOXES.items():
        left, top, right, bottom = box
        crop = pixels[top:bottom, left:right]
        gray = np.mean(crop, axis=2)
        edge_background = np.median(np.c_[gray[:, :24], gray[:, -24:]], axis=1)[:, None]
        row_difference = np.abs(gray - edge_background)

        blurred = np.asarray(
            Image.fromarray(crop.astype(np.uint8), "RGB").filter(ImageFilter.GaussianBlur(11))
        ).astype(np.float32)
        detail = np.max(np.abs(crop - blurred), axis=2)

        crop_height, crop_width = gray.shape
        yy, xx = np.mgrid[0:crop_height, 0:crop_width]
        nx = (xx - crop_width * 0.5) / (crop_width * 0.5)
        ny = (yy - crop_height * 0.52) / (crop_height * 0.52)
        radius = np.sqrt(nx * nx + ny * ny)
        feather = np.clip((1.0 - radius) / 0.32, 0.0, 1.0)
        alpha = np.maximum(row_difference * 4.2, detail * 8.0) * feather
        alpha = np.clip(alpha, 0, 255).astype(np.uint8)
        alpha[alpha < 4] = 0
        extracted = Image.fromarray(np.dstack((crop.astype(np.uint8), alpha)), "RGBA")
        extracted.thumbnail((488, 512), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        canvas.paste(extracted, ((512 - extracted.width) // 2, (512 - extracted.height) // 2), extracted)
        canvas.save(output_dir / filename)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: extract-title-icons-with-effects.py SOURCE OUTPUT_DIR")
    extract(Path(sys.argv[1]), Path(sys.argv[2]))
