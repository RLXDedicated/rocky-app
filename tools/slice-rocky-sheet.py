"""Cut an official Rocky pose sheet (transparent PNG/WebP, poses in a grid)
into one PNG per pose — crop only: every pixel is copied as delivered, never
redrawn, recoloured or resized.

Each pose is the solid art in one grid cell; pieces that float on their own
(confetti, hearts, a light bulb, a "?") go with the cell they sit in, and the
faint anti-aliased edge pixels go to the pose they touch.

    python3 tools/slice-rocky-sheet.py SHEET COLS ROWS OUT_DIR name1 name2 ...

Names are in reading order (left to right, top to bottom); "-" skips a cell.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

PAD = 12


def components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    for y in range(h):
        for x in np.nonzero(mask[y] & (lab[y] == 0))[0]:
            if lab[y, x]:
                continue
            n += 1
            lab[y, x] = n
            q = deque([(y, x)])
            while q:
                cy, cx = q.popleft()
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n
                        q.append((ny, nx))
    return lab, n


def main() -> None:
    sheet, cols, rows, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    names = sys.argv[5:]
    assert len(names) == cols * rows, f"need {cols * rows} names"
    art = np.array(Image.open(sheet).convert("RGBA"))
    h, w = art.shape[:2]
    alpha = art[:, :, 3]
    yy, xx = np.mgrid[0:h, 0:w]
    pixel_cell = np.minimum((yy * rows // h), rows - 1) * cols + np.minimum((xx * cols // w), cols - 1)

    # Solid art: each piece goes to the cell holding most of it; a piece that
    # spans cells about evenly (two poses touching) is split along the grid.
    owner = np.full((h, w), -1, np.int32)
    lab, n = components(alpha > 160)
    for k in range(1, n + 1):
        sel = lab == k
        counts = np.bincount(pixel_cell[sel], minlength=cols * rows)
        if counts.max() >= 0.9 * counts.sum():
            owner[sel] = counts.argmax()
        else:
            owner[sel] = pixel_cell[sel]

    # Faint edge pixels: grow each pose outward through the visible pixels.
    visible = alpha > 0
    q = deque(zip(*np.nonzero(owner >= 0)))
    while q:
        y, x = q.popleft()
        for ny in (y - 1, y, y + 1):
            for nx in (x - 1, x, x + 1):
                if 0 <= ny < h and 0 <= nx < w and visible[ny, nx] and owner[ny, nx] < 0:
                    owner[ny, nx] = owner[y, x]
                    q.append((ny, nx))
    rest = visible & (owner < 0)
    owner[rest] = pixel_cell[rest]

    for i, name in enumerate(names):
        if name == "-":
            continue
        sel = owner == i
        ys, xs = np.nonzero(sel)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        pose = np.zeros_like(art)
        pose[sel] = art[sel]
        crop = pose[y0:y1, x0:x1]
        canvas = np.zeros((crop.shape[0] + 2 * PAD, crop.shape[1] + 2 * PAD, 4), np.uint8)
        canvas[PAD:-PAD, PAD:-PAD] = crop
        Image.fromarray(canvas).save(f"{out}/{name}.png", optimize=True)
        print(f"{out}/{name}.png", canvas.shape[1], "x", canvas.shape[0])


if __name__ == "__main__":
    main()
