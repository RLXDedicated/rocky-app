// Tiny WebGL mesh-deformation renderer for the 2.5D Rocky (Live2D-style,
// much simpler). The approved artwork is drawn on a 32x32 grid mesh that the
// vertex shader bends: the head (above the neck line) rotates, bobs and
// turns around the neck pivot with a smooth blend into the body, and the
// chest breathes. Eyelids in the fur colour close over each open eye for
// blinks. The art itself is never cut, redrawn or edited — no seams.
import type { RockyRigPoints } from '../rockyRig'

export interface RigPose {
  /** Head rotation, radians (positive = clockwise on screen). */
  headAngle: number
  /** Head offset in canvas-fraction units. */
  headX: number
  headY: number
  /** -1..1 — head turned toward screen left/right (fake yaw). */
  turn: number
  /** 0..1 breathing phase amplitude. */
  breath: number
  /** 0 open .. 1 fully closed. */
  blink: number
}

/** Extra canvas margin around the 512 art square, so a tilted head never clips. */
export const RIG_MARGIN = 0.08
const GRID = 32

const VERT = `
attribute vec2 aUv;
uniform vec2 uPivot;
uniform float uNeck;
uniform float uChest;
uniform float uAngle;
uniform vec2 uHead;
uniform float uTurn;
uniform float uBreath;
uniform float uMargin;
varying vec2 vUv;
void main() {
  vec2 p = aUv;
  // 1 above the neck line, 0 below, smooth across the collar.
  float wh = 1.0 - smoothstep(uNeck - 0.06, uNeck + 0.03, p.y);
  vec2 hp = p - uPivot;
  hp.x *= 1.0 - abs(uTurn) * 0.07;
  hp.x += uTurn * 0.018 * clamp((uPivot.y - p.y) * 4.0, 0.0, 1.0);
  float c = cos(uAngle), s = sin(uAngle);
  vec2 rot = vec2(c * hp.x - s * hp.y, s * hp.x + c * hp.y);
  p = mix(p, uPivot + rot + uHead, wh);
  // Breathing: the chest swells a touch, below the neck only.
  float wc = exp(-pow((aUv.y - uChest) / 0.13, 2.0)) * (1.0 - wh);
  p.x = uPivot.x + (p.x - uPivot.x) * (1.0 + uBreath * 0.04 * wc);
  p.y -= uBreath * 0.009 * wc;
  vec2 q = (p + uMargin) / (1.0 + 2.0 * uMargin);
  gl_Position = vec4(q.x * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0);
  vUv = aUv;
}
`

const FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform vec4 uEye0;
uniform vec4 uEye1;
uniform float uBlink;
uniform vec3 uLid;
varying vec2 vUv;

vec4 lid(vec4 c, vec4 eye) {
  if (eye.z <= 0.0 || uBlink <= 0.001) return c;
  vec2 d = (vUv - eye.xy) / eye.z;
  d.y *= 1.1;
  // Soft edge so the lid melts into the surrounding fur.
  float inside = 1.0 - smoothstep(0.78, 1.04, length(d));
  if (inside <= 0.0) return c;
  // The lid comes down from the top; its edge is an arc (lower in the
  // middle), and when fully closed it rests as a smile-shaped lash line.
  float edge = -1.1 + 2.0 * uBlink + 0.32 * d.x * d.x * uBlink;
  float covered = 1.0 - smoothstep(edge - 0.04, edge + 0.04, d.y);
  // The lid is the art's own skin just above the eye, stretched down — it
  // carries the real fur tone and shading instead of a flat colour.
  vec4 skin = texture2D(uTex, vec2(vUv.x, eye.y - eye.z * 1.18));
  vec3 lidCol = mix(uLid * skin.a, skin.rgb, 0.85) * (0.97 - 0.1 * clamp(d.y - edge + 0.4, 0.0, 1.0));
  float lash = (1.0 - smoothstep(0.02, 0.1, abs(d.y - edge))) * smoothstep(0.08, 0.3, uBlink) * (1.0 - smoothstep(0.55, 0.85, abs(d.x)));
  vec3 col = mix(c.rgb, lidCol * c.a, covered * inside);
  col = mix(col, vec3(0.2, 0.1, 0.06) * c.a, lash * 0.85);
  return vec4(col, c.a);
}

void main() {
  vec4 c = texture2D(uTex, vUv);
  c = lid(c, uEye0);
  c = lid(c, uEye1);
  gl_FragColor = c;
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed')
  return sh
}

export interface RigRenderer {
  setImage(img: HTMLImageElement, rig: RockyRigPoints): void
  draw(pose: RigPose): void
  resize(px: number): void
  dispose(): void
}

export function createRigRenderer(canvas: HTMLCanvasElement): RigRenderer | null {
  const gl = (canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true }) ??
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
  if (!gl) return null

  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed')
  gl.useProgram(prog)

  // Grid mesh over the art square.
  const verts: number[] = []
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const u0 = i / GRID
      const v0 = j / GRID
      const u1 = (i + 1) / GRID
      const v1 = (j + 1) / GRID
      verts.push(u0, v0, u1, v0, u0, v1, u1, v0, u1, v1, u0, v1)
    }
  }
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
  const aUv = gl.getAttribLocation(prog, 'aUv')
  gl.enableVertexAttribArray(aUv)
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)

  const u = (name: string) => gl.getUniformLocation(prog, name)
  const loc = {
    pivot: u('uPivot'),
    neck: u('uNeck'),
    chest: u('uChest'),
    angle: u('uAngle'),
    head: u('uHead'),
    turn: u('uTurn'),
    breath: u('uBreath'),
    margin: u('uMargin'),
    eye0: u('uEye0'),
    eye1: u('uEye1'),
    blink: u('uBlink'),
    lid: u('uLid'),
  }
  gl.uniform1f(loc.margin, RIG_MARGIN)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  let ready = false

  return {
    setImage(img, rig) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.uniform2f(loc.pivot, rig.pivot.x, rig.pivot.y)
      gl.uniform1f(loc.neck, rig.neck)
      gl.uniform1f(loc.chest, rig.chest)
      const [e0, e1] = rig.eyes
      gl.uniform4f(loc.eye0, e0?.x ?? 0, e0?.y ?? 0, e0?.r ?? 0, 0)
      gl.uniform4f(loc.eye1, e1?.x ?? 0, e1?.y ?? 0, e1?.r ?? 0, 0)
      gl.uniform3f(loc.lid, rig.lid[0], rig.lid[1], rig.lid[2])
      ready = true
    },
    draw(pose) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (!ready) return
      gl.uniform1f(loc.angle, pose.headAngle)
      gl.uniform2f(loc.head, pose.headX, pose.headY)
      gl.uniform1f(loc.turn, pose.turn)
      gl.uniform1f(loc.breath, pose.breath)
      gl.uniform1f(loc.blink, pose.blink)
      gl.drawArrays(gl.TRIANGLES, 0, verts.length / 2)
    },
    resize(px) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(px * dpr)
      canvas.height = Math.round(px * dpr)
    },
    dispose() {
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
