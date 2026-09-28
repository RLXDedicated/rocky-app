"""Remove the leftover white background from the approved Rocky PNGs.

The delivered artworks were cut out of a white background, but the cut-out
left OPAQUE WHITE patches wherever the background was enclosed — mostly the
gap between the legs and around the tail. On a still image that's hard to
see; once the 2.5D rig moves the legs, the white patch moves and stretches
with them.

This tool flood-fills from the transparent outside through neutral,
near-white pixels (below the neck only, so eye whites, horns, the RLX logo
and catch-lights are never touched) and makes them transparent, then
softens the fringe next to what was removed. The untouched originals are
kept in docs/rocky-assets-source/original-png/ (created on first run).

    python3 tools/clean-rocky-art.py
"""
import glob
import json
import os
import shutil
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP = os.path.join(ROOT, 'docs/rocky-assets-source/original-png')


def is_bg_white(p):
    r, g, b, a = p
    return a > 0 and min(r, g, b) >= 222 and max(r, g, b) - min(r, g, b) <= 22


def remove_holes(px, w, h, y_from, min_size=20):
    """Enclosed white patches (e.g. between the legs, closed off by the ground
    shadow) that the outside flood can't reach. Only below `y_from` — the
    hips, where the vest (and its white RLX logo) has already ended."""
    seen = set()
    removed = []
    for y in range(y_from, h):
        for x in range(w):
            if (x, y) in seen or not is_bg_white(px[x, y]):
                continue
            blob = []
            queue = deque([(x, y)])
            seen.add((x, y))
            while queue:
                cx, cy = queue.popleft()
                blob.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and y_from <= ny < h and (nx, ny) not in seen and is_bg_white(px[nx, ny]):
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            if len(blob) >= min_size:
                removed.extend(blob)
    return removed


def clean(path, neck_frac, hip_frac):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    y_min = int(neck_frac * h)
    seen = bytearray(w * h)
    queue = deque()
    # Seeds: every transparent pixel in the lower body band.
    for y in range(y_min, h):
        for x in range(w):
            if px[x, y][3] <= 8:
                seen[y * w + x] = 1
                queue.append((x, y))
    removed = []
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < y_min or nx >= w or ny >= h:
                continue
            i = ny * w + nx
            if seen[i]:
                continue
            seen[i] = 1
            p = px[nx, ny]
            if p[3] <= 8 or is_bg_white(p):
                if p[3] > 8:
                    removed.append((nx, ny))
                queue.append((nx, ny))
    removed += remove_holes(px, w, h, int(hip_frac * h) - 4)
    for x, y in removed:
        px[x, y] = (255, 255, 255, 0)
    # Soften the fringe: light pixels touching removed ones lose alpha in
    # proportion to how white they are (the anti-aliased edge of the old
    # background).
    gone = set(removed)
    for x, y in removed:
        for nx in range(x - 2, x + 3):
            for ny in range(y - 2, y + 3):
                if 0 <= nx < w and y_min <= ny < h and (nx, ny) not in gone:
                    r, g, b, a = px[nx, ny]
                    lum = 0.3 * r + 0.59 * g + 0.11 * b
                    if a > 0 and lum > 185 and max(r, g, b) - min(r, g, b) <= 40:
                        k = max(0.0, min(1.0, (255 - lum) / 70))
                        px[nx, ny] = (r, g, b, int(a * k))
    im.save(path)
    return len(removed)


def main():
    rig_src = open(os.path.join(ROOT, 'src/components/rockyRig.ts')).read()
    rig = json.loads(rig_src[rig_src.index('= ') + 2 :])
    os.makedirs(BACKUP, exist_ok=True)
    for path in sorted(glob.glob(os.path.join(ROOT, 'src/assets/rocky/*/*.png'))):
        stage = os.path.basename(os.path.dirname(path))
        mood = os.path.splitext(os.path.basename(path))[0]
        if stage == 'reactions':
            continue  # half-body stills, never rigged: left exactly as delivered
        backup = os.path.join(BACKUP, stage, f'{mood}.png')
        if not os.path.exists(backup):
            os.makedirs(os.path.dirname(backup), exist_ok=True)
            shutil.copy2(path, backup)
        # Always start from the original so re-runs are idempotent.
        shutil.copy2(backup, path)
        points = rig.get(stage.capitalize(), {}).get(mood.capitalize(), {})
        # Reaction art has no rig: use typical proportions.
        n = clean(path, points.get('neck', 0.55), points.get('hip', 0.8))
        print(f'{stage}/{mood}: {n} background pixels removed')


if __name__ == '__main__':
    main()
