"""Bake Rocky's approved 2.5D artwork onto the 3D model as vertex colors.

The delivered Baby Rocky GLB (docs/rocky-assets-source/3d/) has its geometry,
Mixamo rig and 9 animations intact, but NO textures: its 8 materials carry
neither a base-color texture nor a color, so it renders plain white.

Until a re-export with textures arrives, this script paints it from the
approved artwork instead of inventing colors:

  * every vertex is projected straight onto the front-facing approved PNG
    (the model and the art are both front views of the same character, so
    their silhouettes are fitted box-to-box);
  * the art colour is blended in by how much the surface faces the viewer
    (normal.z), and sides/back fall back to a flat per-part colour — so the
    face, muzzle, eyes and RLX vest show on the front, and there are never
    eyes on the back of Rocky's head;
  * horns always use the part colour (they stick out sideways).

Head colours come from the Happy art (friendly face), the body from the
Worried art (arms down, same as the model's rest pose).

    python3 tools/bake-rocky3d-colors.py

reads  docs/rocky-assets-source/3d/Baby_Rocky_AllAnimations.glb
writes src/assets/rocky3d/baby.glb
"""
import json
import os
import struct

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs/rocky-assets-source/3d/Baby_Rocky_AllAnimations.glb')
OUT = os.path.join(ROOT, 'src/assets/rocky3d/baby.glb')
ART = os.path.join(ROOT, 'src/assets/rocky/baby')

# Flat colours used where the art can't reach (sides, back) — sampled from the art.
PART_COLOR = {
    'Head': (0.55, 0.32, 0.18),
    'L_Arm': (0.55, 0.32, 0.18),
    'R_Arm': (0.55, 0.32, 0.18),
    'Lower_Body': (0.50, 0.29, 0.16),
    'L_Horn': (0.94, 0.89, 0.78),
    'R_Horn': (0.94, 0.89, 0.78),
    'Vest': (0.12, 0.52, 0.28),
    'Badge': (0.95, 0.95, 0.95),
}
ART_FOR_PART = {'Head': 'happy'}  # everything else: worried
# Arms swing away from the body in every animation, and the horns stick out
# sideways, so projecting the front view onto them smears the vest across the
# arms — they keep their flat part colour.
NO_PROJECTION = {'L_Horn', 'R_Horn', 'L_Arm', 'R_Arm'}

# The head is fitted by facial landmarks rather than by silhouette, so the
# painted eyes land exactly on the sculpted ones. Measured once:
#   model (rest pose): eyes at x = -0.097 / 0.079, y = 0.666
#   happy.png:         iris centres at (223, 188) / (328, 189)
# Both axes give ~600 px per model unit.
HORN_LINE_PX = 165  # happy.png rows above the eyes (horn height)
HEAD_FIT = {'eye_mid_model': (-0.009, 0.666), 'eye_mid_art': (275.5, 188.5), 'px_per_unit': 600.0}


def load_glb(path):
    data = open(path, 'rb').read()
    json_len = struct.unpack('<I', data[12:16])[0]
    gltf = json.loads(data[20:20 + json_len])
    bin_start = 20 + json_len + 8
    bin_len = struct.unpack('<I', data[20 + json_len:24 + json_len])[0]
    return gltf, bytearray(data[bin_start:bin_start + bin_len])


def read_accessor(gltf, binary, index):
    acc = gltf['accessors'][index]
    view = gltf['bufferViews'][acc['bufferView']]
    comps = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[acc['type']]
    offset = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    values = struct.unpack_from('<%df' % (acc['count'] * comps), binary, offset)
    return [values[i:i + comps] for i in range(0, len(values), comps)]


def art_image(mood):
    im = Image.open(os.path.join(ART, f'{mood}.png')).convert('RGBA')
    bbox = im.split()[3].point(lambda a: 255 if a > 128 else 0).getbbox()
    return im, bbox


def sample(im, x, y):
    """Bilinear, alpha-weighted sample: semi-transparent edge pixels (often
    light-coloured anti-aliasing) never bleed white into the fur."""
    w, h = im.size
    x = min(max(x, 0), w - 1.001)
    y = min(max(y, 0), h - 1.001)
    x0, y0 = int(x), int(y)
    fx, fy = x - x0, y - y0
    rgb = [0.0, 0.0, 0.0]
    alpha = 0.0
    for dx, dy, wt in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        r, g, b, a = im.getpixel((x0 + dx, y0 + dy))
        aw = wt * a / 255
        rgb[0] += r * aw
        rgb[1] += g * aw
        rgb[2] += b * aw
        alpha += aw
    if alpha <= 1e-6:
        return [0, 0, 0, 0]
    return [rgb[0] / alpha / 255, rgb[1] / alpha / 255, rgb[2] / alpha / 255, alpha]


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def main():
    gltf, binary = load_glb(SRC)
    meshes = [(n['name'], n['mesh']) for n in gltf['nodes'] if 'mesh' in n]

    # Model silhouette (rest pose, front view) — shared by every part.
    xs, ys = [], []
    for _, mi in meshes:
        for x, y, _z in read_accessor(gltf, binary, gltf['meshes'][mi]['primitives'][0]['attributes']['POSITION']):
            xs.append(x)
            ys.append(y)
    mx0, mx1, my0, my1 = min(xs), max(xs), min(ys), max(ys)
    arts = {m: art_image(m) for m in ('happy', 'worried')}

    for name, mi in meshes:
        prim = gltf['meshes'][mi]['primitives'][0]
        positions = read_accessor(gltf, binary, prim['attributes']['POSITION'])
        normals = read_accessor(gltf, binary, prim['attributes']['NORMAL'])
        im, (ax0, ay0, ax1, ay1) = arts[ART_FOR_PART.get(name, 'worried')]
        base = PART_COLOR[name]
        colors = []
        for (x, y, _z), (_nx, _ny, nz) in zip(positions, normals):
            rgb = list(base)
            if name not in NO_PROJECTION:
                if name == 'Head':
                    (mx, my), (axm, aym), k = HEAD_FIT['eye_mid_model'], HEAD_FIT['eye_mid_art'], HEAD_FIT['px_per_unit']
                    px = axm + (x - mx) * k
                    py = aym - (y - my) * k
                else:
                    px = ax0 + (x - mx0) / (mx1 - mx0) * (ax1 - ax0)
                    py = ay0 + (my1 - y) / (my1 - my0) * (ay1 - ay0)
                r, g, b, a = sample(im, px, py)
                # Above the eyes the art's cream horns sit behind the hair tuft,
                # where the model has fur — don't let horn colour land on fur.
                if name == 'Head' and py < HORN_LINE_PX and (0.3 * r + 0.59 * g + 0.11 * b) > 0.55:
                    a = 0.0
                facing = min(1.0, max(0.0, (nz - 0.15) / 0.45)) * min(1.0, max(0.0, (a - 0.6) / 0.35))
                rgb = [base[k] * (1 - facing) + (r, g, b)[k] * facing for k in range(3)]
            colors.extend(srgb_to_linear(c) for c in rgb)

        # Append a COLOR_0 accessor (float VEC3, linear) to the binary chunk.
        while len(binary) % 4:
            binary.append(0)
        offset = len(binary)
        binary.extend(struct.pack('<%df' % len(colors), *colors))
        gltf['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(colors) * 4, 'target': 34962})
        gltf['accessors'].append({'bufferView': len(gltf['bufferViews']) - 1, 'componentType': 5126, 'count': len(positions), 'type': 'VEC3'})
        prim['attributes']['COLOR_0'] = len(gltf['accessors']) - 1

    # Vertex colours carry the look: keep materials white and matte.
    for mat in gltf['materials']:
        pbr = mat.setdefault('pbrMetallicRoughness', {})
        pbr['baseColorFactor'] = [1, 1, 1, 1]
        pbr['metallicFactor'] = 0
        pbr['roughnessFactor'] = 0.85

    while len(binary) % 4:
        binary.append(0)
    gltf['buffers'][0]['byteLength'] = len(binary)
    gltf.setdefault('asset', {})['extras'] = {'rockyColors': 'baked from approved 2.5D art by tools/bake-rocky3d-colors.py'}
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    with open(OUT, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON'))
        f.write(js)
        f.write(struct.pack('<I4s', len(binary), b'BIN\x00'))
        f.write(binary)
    print('wrote', OUT, total, 'bytes')


if __name__ == '__main__':
    main()
