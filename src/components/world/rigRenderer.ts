// Tiny WebGL mesh-deformation renderer for the 2.5D Rocky (Live2D-style,
// much simpler). The approved artwork is drawn on a 32x32 grid mesh that the
// vertex shader bends: the head (above the neck line) rotates, bobs and
// turns around the neck pivot with a smooth blend into the body, and the
// chest breathes. The art itself is never cut, redrawn or painted over — no
// seams, no fake eyelids: the face always stays exactly as it was drawn.
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
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uTex, vUv);
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
