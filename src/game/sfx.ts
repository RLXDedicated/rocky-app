// Rocky's sound pack, synthesised with the Web Audio API — no audio files
// to download, license or keep in sync. Short, soft and cartoony, so a
// room full of agents isn't disturbed. Muted per browser with the speaker
// toggle (and never plays before the agent has interacted, as browsers
// require). Every call is best-effort: no Web Audio → silence.
export type Sfx =
  | 'pop'
  | 'chomp'
  | 'munch'
  | 'bounce'
  | 'kick'
  | 'splash'
  | 'bubble'
  | 'coin'
  | 'chime'
  | 'fanfare'
  | 'tap'
  | 'nope'
  | 'boop'
  | 'beep'
  | 'yawn'
  | 'pad0'
  | 'pad1'
  | 'pad2'
  | 'pad3'

const MUTE_KEY = 'rocky.sound.muted'
let ctx: AudioContext | null = null

export function isMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  try {
    if (muted) window.localStorage.setItem(MUTE_KEY, '1')
    else window.localStorage.removeItem(MUTE_KEY)
  } catch {
    // ignore
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

interface Tone {
  freq: number
  to?: number
  at?: number
  dur: number
  type?: OscillatorType
  gain?: number
}

function tone(ac: AudioContext, out: AudioNode, { freq, to, at = 0, dur, type = 'sine', gain = 0.18 }: Tone) {
  const t0 = ac.currentTime + at
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(out)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise(
  ac: AudioContext,
  out: AudioNode,
  { at = 0, dur, gain = 0.12, from = 800, to = 3000 }: { at?: number; dur: number; gain?: number; from?: number; to?: number },
) {
  const t0 = ac.currentTime + at
  const len = Math.max(1, Math.floor(ac.sampleRate * dur))
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buf
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(from, t0)
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  filter.Q.value = 1.2
  const g = ac.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter).connect(g).connect(out)
  src.start(t0)
}

// Tuned after tester feedback: shorter, softer, no harsh square waves, and
// every sound matches what's on screen (no "kick" for a toy truck).
const RECIPES: Record<Sfx, (ac: AudioContext, out: AudioNode) => void> = {
  tap: (ac, o) => tone(ac, o, { freq: 520, to: 700, dur: 0.05, type: 'triangle', gain: 0.05 }),
  pop: (ac, o) => tone(ac, o, { freq: 420, to: 880, dur: 0.1, type: 'sine', gain: 0.12 }),
  chomp: (ac, o) => {
    for (let i = 0; i < 2; i++) noise(ac, o, { at: i * 0.13, dur: 0.06, gain: 0.12, from: 500, to: 1200 })
  },
  munch: (ac, o) => noise(ac, o, { dur: 0.06, gain: 0.1, from: 600, to: 1400 }),
  bounce: (ac, o) => tone(ac, o, { freq: 170, to: 110, dur: 0.1, type: 'sine', gain: 0.12 }),
  kick: (ac, o) => {
    tone(ac, o, { freq: 130, to: 60, dur: 0.12, type: 'sine', gain: 0.18 })
    noise(ac, o, { dur: 0.03, gain: 0.06, from: 2000, to: 900 })
  },
  splash: (ac, o) => noise(ac, o, { dur: 0.4, gain: 0.09, from: 2800, to: 700 }),
  bubble: (ac, o) => {
    for (let i = 0; i < 2; i++) tone(ac, o, { freq: 600 + Math.random() * 300, to: 1300, at: i * 0.09, dur: 0.06, gain: 0.04 })
  },
  coin: (ac, o) => {
    tone(ac, o, { freq: 988, dur: 0.07, type: 'triangle', gain: 0.09 })
    tone(ac, o, { freq: 1319, at: 0.07, dur: 0.2, type: 'triangle', gain: 0.09 })
  },
  chime: (ac, o) => {
    ;[523, 659, 784].forEach((f, i) => tone(ac, o, { freq: f, at: i * 0.08, dur: 0.3, type: 'triangle', gain: 0.08 }))
  },
  fanfare: (ac, o) => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(ac, o, { freq: f, at: i * 0.11, dur: i === 3 ? 0.45 : 0.15, type: 'triangle', gain: 0.09 }))
  },
  nope: (ac, o) => tone(ac, o, { freq: 240, to: 180, dur: 0.14, type: 'sine', gain: 0.07 }),
  boop: (ac, o) => tone(ac, o, { freq: 300, to: 520, dur: 0.08, type: 'sine', gain: 0.1 }),
  beep: (ac, o) => {
    tone(ac, o, { freq: 660, dur: 0.07, type: 'triangle', gain: 0.06 })
    tone(ac, o, { freq: 660, at: 0.13, dur: 0.07, type: 'triangle', gain: 0.06 })
  },
  yawn: (ac, o) => tone(ac, o, { freq: 330, to: 180, dur: 0.6, type: 'sine', gain: 0.05 }),
  // The memory game's pads: a clean C-E-G-C so the sequence is easy to hear.
  pad0: (ac, o) => tone(ac, o, { freq: 523, dur: 0.3, type: 'triangle', gain: 0.1 }),
  pad1: (ac, o) => tone(ac, o, { freq: 659, dur: 0.3, type: 'triangle', gain: 0.1 }),
  pad2: (ac, o) => tone(ac, o, { freq: 784, dur: 0.3, type: 'triangle', gain: 0.1 }),
  pad3: (ac, o) => tone(ac, o, { freq: 1047, dur: 0.3, type: 'triangle', gain: 0.1 }),
}

/** No sound repeats faster than this (a ball bouncing or a sponge scrubbing never turns into a buzz). */
const MIN_GAP_MS: Partial<Record<Sfx, number>> = { bounce: 280, bubble: 700, tap: 70, kick: 120, munch: 90, pop: 90, coin: 150 }
const lastPlayed = new Map<Sfx, number>()

/** Plays a sound effect unless muted. Safe to call anywhere. */
export function play(sfx: Sfx): void {
  if (isMuted()) return
  const now = Date.now()
  const gap = MIN_GAP_MS[sfx] ?? 60
  if (now - (lastPlayed.get(sfx) ?? 0) < gap) return
  lastPlayed.set(sfx, now)
  const ac = audio()
  if (!ac) return
  try {
    const master = ac.createGain()
    master.gain.value = 0.7
    master.connect(ac.destination)
    RECIPES[sfx](ac, master)
  } catch {
    // never let a sound break the game
  }
}
