// Keeps Rocky visible through network blips. A tester lost the connection
// for a moment and Rocky turned invisible: images that failed to load were
// never retried. Now:
//  - every Rocky illustration is preloaded (and kept in memory) at start,
//    so later mood/stage changes don't need the network;
//  - images that fail are retried, and everything retries when the browser
//    reports the connection is back ("online").
import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { ALL_ROCKY_ASSETS } from './rockyVisuals'

const kept: HTMLImageElement[] = []
let preloaded = false

export function preloadRockyArt(): void {
  if (preloaded || typeof Image === 'undefined') return
  preloaded = true
  for (const src of ALL_ROCKY_ASSETS) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    kept.push(img)
  }
}

let generation = 0
const subs = new Set<(g: number) => void>()
function bump() {
  generation++
  for (const s of subs) s(generation)
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Anything that failed while offline is fetched again.
    for (const img of kept) if (!img.complete || img.naturalWidth === 0) img.src = img.src.split('#')[0] + '#r' + Date.now()
    bump()
  })
}

/** Increments each time the connection comes back; use it as a retry key. */
export function useNetworkRecovery(): number {
  const [g, setG] = useState(generation)
  useEffect(() => {
    subs.add(setG)
    return () => {
      subs.delete(setG)
    }
  }, [])
  return g
}

/**
 * An <img> that heals itself: on error it retries (1 s, 2 s, 4 s … up to
 * 30 s) and again as soon as the connection is back.
 */
export function RetryImg(props: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const { src, onError, ...rest } = props
  const recovered = useNetworkRecovery()
  const [attempt, setAttempt] = useState(0)
  useEffect(() => setAttempt(0), [src, recovered])
  const url = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}-${recovered}`
  return (
    <img
      {...rest}
      key={`${src}-${recovered}`}
      src={url}
      onError={(e) => {
        onError?.(e)
        const wait = Math.min(30_000, 1000 * 2 ** attempt)
        window.setTimeout(() => setAttempt((a) => a + 1), wait)
      }}
    />
  )
}
