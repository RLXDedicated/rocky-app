"""Bake Rocky's approved 2.5D artwork onto the 3D model as vertex colors.

The delivered Baby Rocky GLB (docs/rocky-assets-source/3d/) has its geometry,
Mixamo rig and 9 animations intact, but NO textures: its 8 materials carry
neither a base-color texture nor a color, so it renders plain white.

Until a re-export with textures arrives, this script paints it:

  * every part gets a clean, solid colour sampled from the approved art
    (fur, darker hair tuft, cream horns, RLX-green vest, dark hooves);
  * only the FACE (eyes, muzzle, mouth) is projected from the approved
    Happy artwork, fitted to the sculpted eyes, and faded out smoothly at
    the edge of the face and towards the sides — never on the back.

A first version projected the art onto the whole body; that smeared the
vest and tinted the legs, so projection is now limited to the face.

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

def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))


FUR = hex_rgb('#9a5a32')
HAIR = hex_rgb('#7a4124')
HORN = hex_rgb('#f1e6cc')
VEST = hex_rgb('#1f7f45')
VEST_TRIM = hex_rgb('#17663a')
BADGE = hex_rgb('#f7f7f5')
HOOF = hex_rgb('#3b2a22')

PART_COLOR = {
    'Head': FUR,
    'L_Arm': FUR,
    'R_Arm': FUR,
    'Lower_Body': FUR,
    'L_Horn': HORN,
    'R_Horn': HORN,
    'Vest': VEST,
    'Badge': BADGE,
}

# The head is fitted by facial landmarks, so the painted eyes land exactly on
# the sculpted ones. Measured once:
#   model (rest pose): eyes at x = -0.097 / 0.079, y = 0.666
#   happy.png:         iris centres at (223, 188) / (328, 189)
# Both axes give ~600 px per model unit.
HEAD_FIT = {'eye_mid_model': (-0.009, 0.666), 'eye_mid_art': (275.5, 188.5), 'px_per_unit': 600.0}
# The face zone (model units) — an ellipse around eyes, muzzle and mouth.
FACE_CENTER = (-0.009, 0.615)
FACE_RADII = (0.2, 0.135)
HAIR_LINE_Y = 0.74  # above this the head is the hair tuft
HOOF_TOP_Y = 0.035


def smoothstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def furness(r, g, b):
    """~1 for the art's orange/brown fur tones, ~0 for eyes (dark, blue,
    white), the pale muzzle and the mouth."""
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    warm = smoothstep(0.1, 0.25, r - b) * (1.0 if r >= g >= b else 0.0)
    mid = smoothstep(0.2, 0.3, lum) * (1 - smoothstep(0.7, 0.8, lum))
    return warm * mid


def mix(a, b, t):
    return tuple(a[k] * (1 - t) + b[k] * t for k in range(3))


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

    happy, _ = art_image('happy')
    (mx, my), (axm, aym), k = HEAD_FIT['eye_mid_model'], HEAD_FIT['eye_mid_art'], HEAD_FIT['px_per_unit']

    for name, mi in meshes:
        prim = gltf['meshes'][mi]['primitives'][0]
        positions = read_accessor(gltf, binary, prim['attributes']['POSITION'])
        normals = read_accessor(gltf, binary, prim['attributes']['NORMAL'])
        base = PART_COLOR[name]
        colors = []
        for (x, y, _z), (_nx, _ny, nz) in zip(positions, normals):
            rgb = base
            if name == 'Head':
                rgb = mix(FUR, HAIR, smoothstep(HAIR_LINE_Y - 0.03, HAIR_LINE_Y + 0.03, y))
                # Face: project the approved art inside a soft ellipse, only
                # where the surface faces forward.
                dx = (x - FACE_CENTER[0]) / FACE_RADII[0]
                dy = (y - FACE_CENTER[1]) / FACE_RADII[1]
                zone = 1 - smoothstep(0.75, 1.0, (dx * dx + dy * dy) ** 0.5)
                facing = smoothstep(0.2, 0.55, nz)
                if zone * facing > 0:
                    r, g, b, a = sample(happy, axm + (x - mx) * k, aym - (y - my) * k)
                    # Keep only the features (eyes, muzzle, mouth); the art's
                    # warm-lit fur around them would show as orange patches.
                    w = zone * facing * smoothstep(0.6, 0.95, a) * (1 - furness(r, g, b))
                    rgb = mix(rgb, (r, g, b), w)
            elif name == 'Lower_Body':
                rgb = mix(HOOF, FUR, smoothstep(HOOF_TOP_Y - 0.012, HOOF_TOP_Y + 0.012, y))
            elif name == 'Vest':
                # Slightly darker trim toward the bottom hem for a bit of shape.
                rgb = mix(VEST_TRIM, VEST, smoothstep(0.22, 0.30, y))
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
