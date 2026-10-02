"""Cut the official A-pose Rocky into puppet pieces for cut-out animation.

Every piece is the delivered art, pixel for pixel — nothing is redrawn,
recoloured or stretched; pieces are only moved and turned at their joints.
Neighbouring pieces overlap a little where one sits under another (the
sleeve under the vest, the hips under the belt), so a small turn shows the
real art there, never a hole.

    python3 tools/build-rocky-puppet.py   →   src/assets/rocky/official/puppet/
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/rocky-assets-source/official/sheets/a-pose.webp"
OUT = ROOT / "src/assets/rocky/official/puppet"


def line_x(y, p, q):
    """x of the line p→q at height y."""
    (x0, y0), (x1, y1) = p, q
    return x0 + (x1 - x0) * (y - y0) / (y1 - y0)


def inside(poly, xx, yy):
    """Even-odd polygon test on a pixel grid."""
    res = np.zeros(xx.shape, bool)
    n = len(poly)
    for i in range(n):
        (x0, y0), (x1, y1) = poly[i], poly[(i + 1) % n]
        cond = (y0 > yy) != (y1 > yy)
        with np.errstate(divide="ignore", invalid="ignore"):
            xin = x0 + (yy - y0) * (x1 - x0) / (y1 - y0)
        res ^= cond & (xx < xin)
    return res


def main() -> None:
    art = np.array(Image.open(SRC).convert("RGBA"))
    h, w = art.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    opaque = art[:, :, 3] > 0

    # Vest edges (where the sleeves go under it) and the pants' outer edges.
    vest_l = np.where(yy < 650, line_x(yy, (362, 500), (368, 650)), line_x(yy, (368, 650), (380, 880)))
    vest_r = np.where(yy < 650, line_x(yy, (765, 500), (770, 650)), line_x(yy, (770, 650), (752, 880)))
    pants_l = line_x(yy, (392, 880), (348, 1068))

    beard = inside([(390, 488), (565, 655), (772, 488)], xx, yy)
    r, g, b = (art[:, :, i].astype(int) for i in range(3))
    # Vest/sleeve colours (green, navy) and outlines: what sits under the head's lower edge.
    clothes = ((g > r + 25) & (g > b)) | ((b > r + 25) & (b > g)) | ((r < 60) & (g < 60) & (b < 60))
    head = opaque & ((yy < 490) | beard)
    upper = (yy >= 490) & (yy < 1000)
    arm_l = opaque & upper & (xx < vest_l + 26) & ~((xx > 210) & (yy > 850)) & ~beard
    arm_r = opaque & upper & (xx > vest_r - 26) & ~((xx < 925) & (yy > 850)) & ~beard
    tail = opaque & (yy > 850) & (yy < 1125) & (xx > 210) & (xx < pants_l) & ~((yy > 1060) & (xx > 318))
    legs = opaque & (yy > 896) & ~tail & ~((yy < 1000) & ((xx < 215) | (xx > 925)))
    leg_l = legs & (xx < 568)
    leg_r = legs & (xx >= 568)
    # The body: vest, belt and hips, drawn over the arms and legs. Under each
    # joint it keeps a strip of the real art — the sleeve beside the vest,
    # the pants down to the crotch, the vest under the head's lower edge — so
    # a turn shows art that is really there, never a hole.
    crotch = inside([(420, 896), (716, 896), (568, 1000)], xx, yy)
    sleeves = (arm_l & (xx >= vest_l - 22)) | (arm_r & (xx <= vest_r + 22))
    under_head = opaque & (yy >= 455) & (yy < 490) & clothes
    body = (
        opaque & (yy >= 490) & ~arm_l & ~arm_r & ~tail & ~legs
        | sleeves
        | (legs & ((yy <= 935) | crotch))
        | under_head
        | (opaque & beard)
    )

    pieces = {
        "tail": (tail, (386, 878)),
        "leg-left": (leg_l, (470, 925)),
        "leg-right": (leg_r, (665, 925)),
        "arm-left": (arm_l, (332, 560)),
        "arm-right": (arm_r, (800, 560)),
        "body": (body, (565, 760)),
        "head": (head, (565, 600)),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {"width": w, "height": h, "order": list(pieces), "pivots": {}}
    # Where pieces overlap, a soft (semi-transparent) edge pixel stays only in
    # the piece drawn on top — doubled, it would darken — so at rest the
    # puppet is identical to the delivered art.
    names = list(pieces)
    solid = art[:, :, 3] >= 245  # the delivered WebP keeps opaque art at ~253
    for i, name in enumerate(names):
        above = np.zeros((h, w), bool)
        for other in names[i + 1 :]:
            above |= pieces[other][0]
        mask, pivot = pieces[name]
        pieces[name] = (mask & (solid | ~above), pivot)
    covered = np.zeros((h, w), bool)
    meta["boxes"] = {}
    for name, (mask, pivot) in pieces.items():
        part = np.zeros_like(art)
        part[mask] = art[mask]
        ys, xs = np.nonzero(mask)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        # Saved cropped; the box says where it sits on the full canvas.
        Image.fromarray(part[y0:y1, x0:x1]).save(OUT / f"{name}.png", optimize=True)
        meta["boxes"][name] = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}
        meta["pivots"][name] = {"x": pivot[0], "y": pivot[1]}
        covered |= mask
    missing = int((opaque & ~covered).sum())
    (OUT / "puppet.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"{len(pieces)} pieces in {OUT.relative_to(ROOT)} · art pixels not in any piece: {missing}")


if __name__ == "__main__":
    main()
