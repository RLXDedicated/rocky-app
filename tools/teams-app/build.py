"""Builds the Rocky Teams app package (personal tab) -> public/teams/rocky-teams-app.zip.

Upload it in Teams: Apps -> Manage your apps -> Upload an app (or ask IT to
publish it for the org). The tab opens https://rocky-dist.vercel.app inside
Teams with the signed-in user's email ({loginHint}) as the pilot identity.

    python3 tools/teams-app/build.py
"""
import json
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "public" / "teams" / "rocky-teams-app.zip"
WEB = "https://rocky-dist.vercel.app"
NAVY = (16, 35, 63, 255)
GREEN = (0, 166, 81, 255)


def color_icon() -> Image.Image:
    size = 192
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=40, fill=NAVY)
    d.ellipse((24, 110, 168, 186), fill=GREEN)
    rocky = Image.open(ROOT / "src" / "assets" / "rocky" / "official" / "poses" / "hello.png").convert("RGBA")
    rocky = rocky.crop(rocky.getbbox())
    rocky.thumbnail((176, 172), Image.LANCZOS)
    img.alpha_composite(rocky, ((size - rocky.width) // 2, size - rocky.height - 8))
    return img


def outline_icon() -> Image.Image:
    # 32x32, white on transparent: Rocky's silhouette.
    rocky = Image.open(ROOT / "src" / "assets" / "rocky" / "official" / "poses" / "hello.png").convert("RGBA")
    rocky = rocky.crop(rocky.getbbox())
    rocky.thumbnail((30, 30), Image.LANCZOS)
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    alpha = rocky.split()[3].point(lambda a: 255 if a > 110 else 0)
    white = Image.new("RGBA", rocky.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    img.alpha_composite(white, ((32 - rocky.width) // 2, (32 - rocky.height) // 2))
    return img


def optimize_stickers() -> None:
    """Palette PNGs for the rendered stickers (render-stickers.mjs): ~16 KB instead of ~70 KB each."""
    for f in sorted((ROOT / "public" / "teams" / "stickers").glob("*.png")):
        im = Image.open(f).convert("RGBA")
        im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(f, optimize=True)


def main() -> None:
    optimize_stickers()
    manifest = json.loads((HERE / "manifest.json").read_text())
    color_icon().save(HERE / "color.png")
    outline_icon().save(HERE / "outline.png")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))
        z.write(HERE / "color.png", "color.png")
        z.write(HERE / "outline.png", "outline.png")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
