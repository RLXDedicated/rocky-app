"""Measure the 2.5D "rig" points of each approved Rocky artwork.

Writes src/components/rockyRig.ts: for every stage/mood PNG, the points the
mesh-deformation renderer (src/components/world/RockyRig.tsx) needs, as
fractions of the 512x512 canvas:

  neck   — the chin/vest line; above it the head moves, below it the body.
  pivot  — where the head rotates: centred between the eyes, just above
           the neck line.
  chest  — centre of the breathing area.
  feet   — bottom of the figure (body squash/stretch anchor).
  hip    — where the legs split (the crotch), and splitX, the gap between
           the legs: below it each leg moves on its own when Rocky walks.
  eyes   — centre and radius of each open eye: the renderer shifts the iris
           inside the eye to look around (the art is never painted over —
           no fake eyelids). Empty for artworks with closed eyes.

Eyes are found from the white catch-light inside each pupil (the most
reliable mark of an open eye in this art style), with hand-checked
overrides where the automatic pass was fooled.

    python3 tools/build-rocky-rig.py
"""
import glob
import json
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Eye catch-lights (px, 512 canvas) — confirmed by eye on every artwork.
# The eye centre is the centroid of the dark pupil around each catch-light.
HIGHLIGHTS = {
    ('advanced', 'happy'): [(234, 143), (321, 145)],
    ('advanced', 'motivated'): [(233, 145), (322, 153)],
    ('advanced', 'recovery'): [(232, 157), (303, 154)],
    ('advanced', 'worried'): [(225, 150), (316, 156)],
    ('baby', 'motivated'): [(225, 162), (329, 164)],
    ('baby', 'worried'): [(221, 180), (329, 176)],
    ('elite', 'happy'): [(244, 135), (321, 138)],
    ('elite', 'motivated'): [(246, 137), (323, 135)],
    ('elite', 'recovery'): [(235, 140), (313, 140)],
    ('elite', 'worried'): [(231, 142), (309, 152)],
    ('young', 'motivated'): [(216, 151), (309, 157)],
    ('young', 'worried'): [(205, 169), (311, 173)],
}
# Eye centres measured directly where catch-lights were ambiguous.
CENTRES = {
    ('baby', 'happy'): [(230, 186), (324, 182)],
    ('young', 'happy'): [(254, 217), (306, 217)],
    ('young', 'motivated'): [(226, 163), (305, 162)],
    ('young', 'worried'): [(219, 179), (298, 179)],
}
# Eye radius (px) for the hand-measured entries above.
RADII = {('baby', 'happy'): 28, ('young', 'happy'): 17, ('young', 'motivated'): 24, ('young', 'worried'): 26}
# Eyes already closed in the art: no eye movement; the pivot uses the head's centre line.
CLOSED_EYES = {('baby', 'recovery'), ('young', 'recovery'), ('advanced', 'recovery'), ('elite', 'recovery')}


def lum(p):
    return 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]


def pupil_centre(px, hx, hy, radius=22):
    pts = [
        (x, y)
        for y in range(hy - radius, hy + radius + 1)
        for x in range(hx - radius, hx + radius + 1)
        if (x - hx) ** 2 + (y - hy) ** 2 <= radius * radius and px[x, y][3] > 200 and lum(px[x, y]) < 60
    ]
    if len(pts) < 20:
        return (hx - 5, hy + 9)
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def eye_shape(px, pc):
    """Centre and radius of the whole eye around a pupil centre. The search is
    scaled to the pupil's own size so nearby brows and shadows (also dark)
    are left out; the eye is the pupil plus its white/blue surround."""
    cx, cy = int(pc[0]), int(pc[1])
    dark = [
        (x, y)
        for y in range(cy - 20, cy + 21)
        for x in range(cx - 20, cx + 21)
        if (x - cx) ** 2 + (y - cy) ** 2 <= 400 and px[x, y][3] > 200 and lum(px[x, y]) < 60
    ]
    if len(dark) < 20:
        return pc, None
    rp = (len(dark) / math.pi) ** 0.5
    reach = rp * 2.0
    pts = list(dark)
    for y in range(int(cy - reach), int(cy + reach) + 1):
        for x in range(int(cx - reach), int(cx + reach) + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 > reach * reach:
                continue
            r, g, b, a = px[x, y]
            if a > 200 and ((lum((r, g, b)) > 200 and max(r, g, b) - min(r, g, b) < 45) or b > r + 20):
                pts.append((x, y))
    mx = sum(p[0] for p in pts) / len(pts)
    my = sum(p[1] for p in pts) / len(pts)
    return (mx, my), rp * 1.7


def is_vest(p):
    return p[3] > 200 and p[1] > p[0] + 15 and p[1] > p[2]


def legs(px, w, cx, neck, bottom):
    """Where the legs start (the bottom edge of the green vest) and the x of the
    gap between the legs (measured on the shins, where the gap is clear)."""
    vest_rows = [y for y in range(neck, bottom) if sum(1 for x in range(int(cx - 40), int(cx + 40), 2) if is_vest(px[x, y])) > 8]
    hip = vest_rows[-1] if vest_rows else int(bottom - (bottom - neck) * 0.3)
    # Keep at least a quarter of the lower body as legs so the walk reads.
    hip = min(hip, int(bottom - (bottom - neck) * 0.22))
    gaps = []
    for y in range(bottom - 4, hip, -1):
        row = [px[x, y][3] > 128 for x in range(int(cx - 60), int(cx + 60))]
        xs = [i for i in range(20, len(row) - 20) if not row[i] and any(row[:i]) and any(row[i:])]
        if xs:
            gaps.append(cx - 60 + sum(xs) / len(xs))
    split = sum(gaps) / len(gaps) if len(gaps) >= 4 else cx
    return hip, split


def measure(path, stage, mood):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    rows = [y for y in range(h) if any(px[x, y][3] > 128 for x in range(0, w, 2))]
    top, bottom = rows[0], rows[-1]
    head_xs = [x for y in range(top, top + 80) for x in range(0, w, 2) if px[x, y][3] > 128]
    cx = sum(head_xs) / len(head_xs)
    # Neck = first row where the green vest shows around the centre line.
    neck = next(
        y
        for y in range(top + 60, h)
        if sum(1 for x in range(int(cx - 40), int(cx + 40), 2) if is_vest(px[x, y])) > 8
    )

    key = (stage, mood)
    if key in CLOSED_EYES:
        centres = []
    elif key in CENTRES:
        centres = CENTRES[key]
    else:
        centres = [pupil_centre(px, hx, hy) for hx, hy in HIGHLIGHTS[key]]
    eyes = []
    if centres and key not in CENTRES:
        shapes = [eye_shape(px, c) for c in centres]
        centres = [sh[0] for sh in shapes]
        radii = [sh[1] for sh in shapes if sh[1]]
    else:
        radii = []
    if centres:
        (x1, y1), (x2, y2) = centres
        r = RADII.get(key) or ((sum(radii) / len(radii)) if radii else 0.27 * math.hypot(x2 - x1, y2 - y1))
        eyes = [{'x': round(ex / w, 4), 'y': round(ey / h, 4), 'r': round(r / w, 4)} for ex, ey in centres]
    pivot_x = (centres[0][0] + centres[1][0]) / 2 if centres else cx
    hip, split = legs(px, w, cx, neck, bottom)

    return {
        'neck': round(neck / h, 4),
        'pivot': {'x': round(pivot_x / w, 4), 'y': round((neck - 6) / h, 4)},
        'chest': round((neck + (bottom - neck) * 0.28) / h, 4),
        'feet': round(bottom / h, 4),
        'top': round(top / h, 4),
        'hip': round(hip / h, 4),
        'splitX': round(split / w, 4),
        'eyes': eyes,
    }


def main():
    rig = {}
    for path in sorted(glob.glob(os.path.join(ROOT, 'src/assets/rocky/*/*.png'))):
        stage = os.path.basename(os.path.dirname(path))
        if stage == 'reactions':
            continue
        mood = os.path.splitext(os.path.basename(path))[0]
        rig.setdefault(stage.capitalize(), {})[mood.capitalize()] = measure(path, stage, mood)
    out = os.path.join(ROOT, 'src/components/rockyRig.ts')
    with open(out, 'w') as f:
        f.write('// GENERATED by tools/build-rocky-rig.py — do not edit by hand.\n')
        f.write('// Rig points per approved artwork, as fractions of the 512x512 canvas.\n')
        f.write("import type { EvolutionStage, Mood } from '../types/domain'\n\n")
        f.write('export interface RockyRigPoints {\n  neck: number\n  pivot: { x: number; y: number }\n  chest: number\n  feet: number\n  top: number\n  hip: number\n  splitX: number\n  eyes: { x: number; y: number; r: number }[]\n}\n\n')
        f.write('export const ROCKY_RIG: Record<EvolutionStage, Record<Mood, RockyRigPoints>> = ')
        f.write(json.dumps(rig, indent=2))
        f.write('\n')
    print('wrote', out)


if __name__ == '__main__':
    main()
