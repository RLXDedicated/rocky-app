"""Build Rocky's cut-out puppet from the design team's layers (v2).

Design delivered the official A-pose split into 11 body layers, with each
piece continuing under its neighbour at the joint, plus a guide with the
pivot points (docs/rocky-assets-source/official/layers-v2/). This script:

1. Takes the approved A-pose as the truth for every visible pixel: at rest
   the puppet rebuilds it exactly, whatever small gaps the cut left.
2. Uses the layers to decide which piece owns each visible pixel (the
   topmost layer covering it; pixels no layer covers go to the nearest
   piece) and keeps the layers' hidden parts as the backing that shows
   when a joint turns.
3. Works out the stacking order from the art itself: where two layers
   overlap, the one that matches the A-pose there is the one on top.
4. Reads the pivot points from the guide's red dots.

Nothing is redrawn, recoloured or stretched.

    python3 tools/build-rocky-puppet.py   →   src/assets/rocky/official/puppet/
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
POSE = ROOT / "docs/rocky-assets-source/official/sheets/a-pose.webp"
LAYERS = ROOT / "docs/rocky-assets-source/official/layers-v2"
OUT = ROOT / "src/assets/rocky/official/puppet"

# Our piece name → design's layer file. "left" is the viewer's left.
PIECES = {
    "tail": "11_Cola",
    "thigh-left": "07_Muslo_Izq",
    "thigh-right": "08_Muslo_Der",
    "shin-left": "09_Pierna_Inf_Izq",
    "shin-right": "10_Pierna_Inf_Der",
    "upper-arm-left": "03_Brazo_Sup_Izq",
    "upper-arm-right": "04_Brazo_Sup_Der",
    "forearm-left": "05_Antbrazo_Izq",
    "forearm-right": "06_Antbrazo_Der",
    "body": "02_Torso",
    "head": "01_Cabeza",
}

# Which guide dot is which joint, by position (the guide labels them).
JOINTS = {
    "neck": (570, 635),
    "shoulder-left": (350, 535),
    "shoulder-right": (760, 535),
    "elbow-left": (285, 710),
    "elbow-right": (855, 710),
    "tail": (315, 835),
    "hip-left": (430, 850),
    "hip-right": (700, 850),
    "knee-left": (425, 1090),
    "knee-right": (680, 1090),
}
# Rounded joints: past the elbow or knee the upper piece keeps only a round cap
# of this radius (canvas px), so a bent joint shows a round end, never a cut.
END = {"forearm-left": 52, "forearm-right": 52, "shin-left": 70, "shin-right": 70}

# Backing: where a piece tucks under a neighbour, it carries art out to a radius
# around a joint, so a turn uncovers art instead of a gap: (joint, radius, the
# pieces it tucks under). Where design's layer has art there it is used;
# elsewhere the neighbour's own pixels, which is what that spot looks like.
BACKING = {
    # The tail's whole length tucks behind the leg, but only its own art backs it.
    "tail": [("tail", 320, ("thigh-left", "body"), "own")],
    "thigh-left": [("hip-left", 165, ("body", "thigh-right")), ("knee-left", 115, ("shin-left",))],
    "thigh-right": [("hip-right", 130, ("body",)), ("knee-right", 115, ("shin-right",))],
    "upper-arm-left": [("shoulder-left", 115, ("body",), "own")],
    "upper-arm-right": [("shoulder-right", 115, ("body",), "own")],
    "forearm-left": [("elbow-left", 64, ("upper-arm-left",))],
    "forearm-right": [("elbow-right", 64, ("upper-arm-right",))],
}

PIVOT_OF = {
    "tail": "tail",
    "thigh-left": "hip-left",
    "thigh-right": "hip-right",
    "shin-left": "knee-left",
    "shin-right": "knee-right",
    "upper-arm-left": "shoulder-left",
    "upper-arm-right": "shoulder-right",
    "forearm-left": "elbow-left",
    "forearm-right": "elbow-right",
    "body": "neck",
    "head": "neck",
}


def guide_dots(path: Path) -> list[tuple[int, int]]:
    """Centres of the guide's red dots (the big blobs; the labels are thin text)."""
    g = np.array(Image.open(path).convert("RGBA")).astype(int)
    red = (g[..., 0] > 170) & (g[..., 1] < 110) & (g[..., 2] < 110) & (g[..., 3] > 100)
    ys, xs = np.nonzero(red)
    clusters: list[list[float]] = []
    for x, y in zip(xs, ys):
        for c in clusters:
            if abs(c[0] / c[2] - x) < 12 and abs(c[1] / c[2] - y) < 12:
                c[0] += x
                c[1] += y
                c[2] += 1
                break
        else:
            clusters.append([x, y, 1])
    return [(round(c[0] / c[2]), round(c[1] / c[2])) for c in clusters if c[2] >= 90]


def stacking(pose: np.ndarray, masks: dict, layers: dict) -> list[str]:
    """Back-to-front order: in each overlap, the layer that matches the A-pose is on top."""
    names = list(masks)
    above = {n: set() for n in names}  # above[a] = pieces that must be drawn after a
    visible = pose[..., 3] > 200
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            both = masks[a] & masks[b] & visible
            if both.sum() < 200:
                continue
            da = np.abs(layers[a][..., :3][both] - pose[..., :3][both]).sum(1).mean()
            db = np.abs(layers[b][..., :3][both] - pose[..., :3][both]).sum(1).mean()
            if da < db:
                above[b].add(a)  # a is on top of b
            else:
                above[a].add(b)
    # Kahn's algorithm: a piece is drawn once every piece below it is drawn.
    order, done = [], set()
    while len(order) < len(names):
        free = [n for n in names if n not in done and all(m in done for m in names if n in above[m])]
        pick = free[0] if free else next(n for n in names if n not in done)  # a cycle: keep the listed order
        order.append(pick)
        done.add(pick)
    return order


def grow_owner(owner: np.ndarray, need: np.ndarray) -> np.ndarray:
    """Give each pixel in `need` with no owner (-1) the owner of its nearest owned neighbour."""
    own = owner.copy()
    for _ in range(400):
        todo = need & (own < 0)
        if not todo.any():
            break
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            shifted = np.roll(np.roll(own, dy, 0), dx, 1)
            fill = todo & (own < 0) & (shifted >= 0)
            own[fill] = shifted[fill]
    return own


def main() -> None:
    pose = np.array(Image.open(POSE).convert("RGBA")).astype(int)
    h, w = pose.shape[:2]
    layers = {n: np.array(Image.open(LAYERS / f"{f}.png").convert("RGBA")).astype(int) for n, f in PIECES.items()}
    masks = {n: l[..., 3] > 40 for n, l in layers.items()}

    # The tail hangs behind the legs and body (its layer repeats a little of the pants
    # where they overlap, which would otherwise put it on top).
    order = ["tail"] + [n for n in stacking(pose, masks, layers) if n != "tail"]
    rank = {n: i for i, n in enumerate(order)}

    # Owner of every visible pixel: the topmost layer covering it, else the nearest piece.
    visible = pose[..., 3] > 0
    owner = np.full((h, w), -1, int)
    for n in order:  # back to front, so later (higher) pieces overwrite
        owner[masks[n] & visible] = rank[n]
    # Some layers repeat a little of a neighbour (the left thigh paints over the
    # tail); where the topmost layer doesn't look like the A-pose but one under
    # it does, that pixel belongs to the one that matches.
    match = {n: masks[n] & (np.abs(layers[n][..., :3] - pose[..., :3]).sum(-1) < 60) for n in order}
    top_matches = np.full((h, w), -1, int)
    for n in order:
        top_matches[match[n] & visible] = rank[n]
    owner_matches = np.zeros((h, w), bool)
    for n in order:
        owner_matches |= (owner == rank[n]) & match[n]
    fix = visible & (top_matches >= 0) & ~owner_matches
    owner[fix] = top_matches[fix]
    owner = grow_owner(owner, visible)

    dots = guide_dots(LAYERS / "30_Puntos_de_Giro_GUIA.png")
    joints = {}
    for name, (gx, gy) in JOINTS.items():
        best = min(dots, key=lambda d: (d[0] - gx) ** 2 + (d[1] - gy) ** 2)
        joints[name] = {"x": int(best[0]), "y": int(best[1])}

    # Past the elbow or the knee everything belongs to the lower piece, the rest
    # of the limb to the upper one, which ends in a round cap at the joint: when the joint bends, the end
    # that shows is the rounded cap, never the flat cut of the layer.
    yy, xx = np.mgrid[0:h, 0:w]
    for upper, lower, top, mid in (
        ("upper-arm-left", "forearm-left", "shoulder-left", "elbow-left"),
        ("upper-arm-right", "forearm-right", "shoulder-right", "elbow-right"),
        ("thigh-left", "shin-left", "hip-left", "knee-left"),
        ("thigh-right", "shin-right", "hip-right", "knee-right"),
    ):
        a, m = joints[top], joints[mid]
        ax, ay = m["x"] - a["x"], m["y"] - a["y"]
        past = (xx - m["x"]) * ax + (yy - m["y"]) * ay > 0
        outside = (xx - m["x"]) ** 2 + (yy - m["y"]) ** 2 > END[lower] ** 2
        limb = (owner == rank[upper]) | (owner == rank[lower])
        owner[limb & past & outside] = rank[lower]
        owner[limb & ~(past & outside)] = rank[upper]

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    boxes = {}
    rebuilt = np.full((h, w, 3), 255.0)  # the pieces stacked on white
    for n in order:
        piece = np.zeros((h, w, 4), int)
        # Hidden backing: art under the parent piece(s), near the pivot (inside the figure only).
        hidden = np.zeros((h, w), bool)
        for joint, reach, over, *only in BACKING.get(n, []):
            j = joints[joint]
            near = (xx - j["x"]) ** 2 + (yy - j["y"]) ** 2 <= reach**2
            spot = near & np.isin(owner, [rank[o] for o in over])
            if only:  # own art only
                spot &= masks[n] & (layers[n][..., 3] >= 250)
            hidden |= spot
        hidden &= pose[..., 3] >= 250
        piece[hidden] = pose[hidden]
        own_art = hidden & masks[n] & (layers[n][..., 3] >= 250)
        piece[own_art] = layers[n][own_art]
        piece[hidden, 3] = 255
        # Visible pixels: exactly the A-pose's.
        mine = visible & (owner == rank[n])
        piece[mine] = pose[mine]
        ys, xs = np.nonzero(piece[..., 3] > 0)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        Image.fromarray(piece[y0:y1, x0:x1].astype(np.uint8)).save(OUT / f"{n}.png", optimize=True)
        boxes[n] = {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}
        a = piece[..., 3:4] / 255
        rebuilt = rebuilt * (1 - a) + piece[..., :3] * a

    a = pose[..., 3:4] / 255
    diff = np.abs(rebuilt - (pose[..., :3] * a + 255 * (1 - a))).max()
    print("order (back→front):", ", ".join(order))
    print("max difference from the A-pose at rest:", round(float(diff), 2))

    meta = {
        "width": w,
        "height": h,
        "order": order,
        "boxes": boxes,
        "joints": joints,
        "pivots": {n: joints[PIVOT_OF[n]] for n in PIECES},
    }
    (OUT / "puppet.json").write_text(json.dumps(meta, indent=2) + "\n")


if __name__ == "__main__":
    main()
