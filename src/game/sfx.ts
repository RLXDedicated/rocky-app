// Rocky's sound pack, synthesised with the Web Audio API — no audio files
// to download, license or keep in sync. Short, soft and cartoony, so a
// room full of agents isn't disturbed. Muted per browser with the speaker
// toggle (and never plays before the agent has interacted, as browsers
// require). Every call is best-effort: no Web Audio → silence.
export type Sfx = 'pop' | 'chomp' | 'bounce' | 'kick' | 'splash' | 'bubble' | 'coin' | 'chime' | 'fanfare' | 'tap' | 'nope'

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

const RECIPES: Record<Sfx, (ac: AudioContext, out: AudioNode) => void> = {
  tap: (ac, o) => tone(ac, o, { freq: 520, to: 700, dur: 0.06, type: 'triangle', gain: 0.08 }),
  pop: (ac, o) => {
    tone(ac, o, { freq: 380, to: 900, dur: 0.12, type: 'sine', gain: 0.2 })
    tone(ac, o, { freq: 760, to: 1200, at: 0.07, dur: 0.1, type: 'sine', gain: 0.1 })
  },
  chomp: (ac, o) => {
    for (let i = 0; i < 3; i++) noise(ac, o, { at: i * 0.16, dur: 0.08, gain: 0.22, from: 400, to: 1200 })
    tone(ac, o, { freq: 180, to: 120, dur: 0.5, type: 'triangle', gain: 0.06 })
  },
  bounce: (ac, o) => tone(ac, o, { freq: 160, to: 90, dur: 0.16, type: 'sine', gain: 0.28 }),
  kick: (ac, o) => {
    tone(ac, o, { freq: 120, to: 50, dur: 0.18, type: 'sine', gain: 0.35 })
    noise(ac, o, { dur: 0.05, gain: 0.15, from: 2000, to: 800 })
  },
  splash: (ac, o) => {
    noise(ac, o, { dur: 0.6, gain: 0.16, from: 3000, to: 600 })
    noise(ac, o, { at: 0.15, dur: 0.5, gain: 0.1, from: 5000, to: 1500 })
  },
  bubble: (ac, o) => {
    for (let i = 0; i < 5; i++) tone(ac, o, { freq: 500 + Math.random() * 500, to: 1400 + Math.random() * 600, at: i * 0.11, dur: 0.07, gain: 0.07 })
  },
  coin: (ac, o) => {
    tone(ac, o, { freq: 988, dur: 0.08, type: 'square', gain: 0.07 })
    tone(ac, o, { freq: 1319, at: 0.08, dur: 0.28, type: 'square', gain: 0.07 })
  },
  chime: (ac, o) => {
    ;[523, 659, 784].forEach((f, i) => tone(ac, o, { freq: f, at: i * 0.09, dur: 0.4, type: 'triangle', gain: 0.12 }))
  },
  fanfare: (ac, o) => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(ac, o, { freq: f, at: i * 0.12, dur: i === 3 ? 0.7 : 0.18, type: 'triangle', gain: 0.14 }))
    tone(ac, o, { freq: 262, at: 0.36, dur: 0.7, type: 'sine', gain: 0.08 })
  },
  nope: (ac, o) => tone(ac, o, { freq: 260, to: 170, dur: 0.18, type: 'triangle', gain: 0.1 }),
}

/** Plays a sound effect unless muted. Safe to call anywhere. */
export function play(sfx: Sfx): void {
  if (isMuted()) return
  const ac = audio()
  if (!ac) return
  try {
    const master = ac.createGain()
    master.gain.value = 0.9
    master.connect(ac.destination)
    RECIPES[sfx](ac, master)
  } catch {
    // never let a sound break the game
  }
}
