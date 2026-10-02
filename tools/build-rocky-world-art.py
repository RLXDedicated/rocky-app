"""Square canvases of the official poses Rocky uses in his world (and as an
avatar), laid out like the old art the world was built around: the figure
centred, feet on 94% of the height. Only transparent margin is added — the
pose's pixels are copied untouched (no resize, redraw or recolour).

    python3 tools/build-rocky-world-art.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
POSES = ROOT / "src/assets/rocky/official/poses"
OUT = ROOT / "src/assets/rocky/official/world"
# The poses Rocky's world uses (see src/components/rockyWorldRig.ts).
WORLD_POSES = ["thumbs-up", "proud", "thinking", "yawning"]
FEET = 0.94
HEIGHT = 0.86


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in WORLD_POSES:
        pose = Image.open(POSES / f"{name}.png").convert("RGBA")
        pose = pose.crop(pose.getbbox())
        side = int(max(pose.height / HEIGHT, pose.width / 0.92)) + 1
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        left = (side - pose.width) // 2
        top = int(side * FEET) - pose.height
        canvas.paste(pose, (left, top))
        canvas.save(OUT / f"{name}.png", optimize=True)
        print(f"{OUT.relative_to(ROOT)}/{name}.png {side}x{side}")


if __name__ == "__main__":
    main()
