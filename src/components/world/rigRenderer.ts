// Tiny WebGL mesh-deformation renderer for the 2.5D Rocky (Live2D-style,
// much simpler). The approved artwork is drawn on a 32x32 grid mesh that the
// vertex shader bends: the head (above the neck line) rotates, bobs and
// turns around the neck pivot with a smooth blend into the body, and the
// chest breathes; below the hips each leg moves on its own for a walk/run
// cycle; and inside each eye the iris shifts toward what Rocky looks at.
// The art itself is never cut, redrawn or painted over — no seams, no fake
// eyelids: every pixel on screen is the approved art, just moved.
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
  /** Walk cycle phase (radians) and stride 0 (standing) .. 1 (running). */
  step: number
  stride: number
  /** -1 left, 0 toward the viewer, 1 right — which way the feet swing. */
  facing: number
  /** Where the eyes look, -1..1 on each axis. */
  lookX: number
  lookY: number
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
uniform float uHip;
uniform float uFeet;
uniform float uSplit;
uniform float uStep;
uniform float uStride;
uniform float uFacing;
varying vec2 vUv;
void main() {
  vec2 p = aUv;
  // Legs: below the hips, inside the legs' column (hands hanging beside
  // them stay put). Each leg lifts and swings on its half of the cycle;
  // the foot moves most, the hip not at all.
  float legZone = smoothstep(uHip - 0.01, uHip + 0.03, p.y) * (1.0 - smoothstep(0.09, 0.13, abs(p.x - uSplit)));
  float along = clamp((p.y - uHip) / max(0.02, uFeet - uHip), 0.0, 1.0);
  float right = smoothstep(-0.008, 0.008, p.x - uSplit);
  float lift = mix(max(0.0, sin(uStep)), max(0.0, -sin(uStep)), right);
  float swing = mix(sin(uStep), -sin(uStep), right);
  p.y -= legZone * along * lift * uStride * 0.05;
  p.x += legZone * along * (uFacing * swing * 0.018 + (right - 0.5) * lift * 0.006) * uStride;
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
uniform vec2 uLook;
varying vec2 vUv;

// Inside an eye the art is sampled a little off-centre, so the iris and
// pupil slide toward the look direction while the eye's outline stays put.
vec2 look(vec2 uv, vec4 eye) {
  if (eye.z <= 0.0) return uv;
  vec2 d = uv - eye.xy;
  float k = 1.0 - smoothstep(0.35, 0.95, length(d) / eye.z);
  return uv - uLook * eye.z * 0.24 * k;
}

void main() {
  vec2 uv = look(look(vUv, uEye0), uEye1);
  gl_FragColor = texture2D(uTex, uv);
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
    hip: u('uHip'),
    feet: u('uFeet'),
    split: u('uSplit'),
    step: u('uStep'),
    stride: u('uStride'),
    facing: u('uFacing'),
    eye0: u('uEye0'),
    eye1: u('uEye1'),
    look: u('uLook'),
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
      gl.uniform1f(loc.hip, rig.hip)
      gl.uniform1f(loc.feet, rig.feet)
      gl.uniform1f(loc.split, rig.splitX)
      const [e0, e1] = rig.eyes
      gl.uniform4f(loc.eye0, e0?.x ?? 0, e0?.y ?? 0, e0?.r ?? 0, 0)
      gl.uniform4f(loc.eye1, e1?.x ?? 0, e1?.y ?? 0, e1?.r ?? 0, 0)
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
      gl.uniform1f(loc.step, pose.step)
      gl.uniform1f(loc.stride, pose.stride)
      gl.uniform1f(loc.facing, pose.facing)
      gl.uniform2f(loc.look, pose.lookX, pose.lookY)
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
