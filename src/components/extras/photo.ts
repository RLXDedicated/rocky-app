// Takes a photo of Rocky's world as it is on screen: the background, the
// home items, the wings, Rocky himself (the rig canvas or his picture) and
// what he's wearing — layered in the order the page draws them — and adds a
// polaroid-style frame with his name and the date.

function visible(el: Element): boolean {
  const withCheck = el as Element & { checkVisibility?: (o?: Record<string, boolean>) => boolean }
  if (withCheck.checkVisibility) return withCheck.checkVisibility({ opacityProperty: true, visibilityProperty: true })
  const cs = getComputedStyle(el)
  return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0'
}

function svgToImage(svg: SVGSVGElement, w: number, h: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  if (getComputedStyle(svg).overflow === 'visible') clone.setAttribute('overflow', 'visible')
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('svg'))
    }
    img.src = url
  })
}

/** Rocky's world, framed, as a WebP (or PNG) blob. */
export async function takeRockyPhoto(caption: string): Promise<Blob> {
  const stage = document.querySelector<HTMLElement>('[data-rocky-stage]')
  if (!stage) throw new Error('Open Rocky’s home to take a photo.')
  const box = stage.getBoundingClientRect()
  const scale = Math.min(2, 1200 / box.width)
  const pad = Math.round(22 * scale)
  const strip = Math.round(64 * scale)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(box.width * scale) + pad * 2
  canvas.height = Math.round(box.height * scale) + pad + strip
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.beginPath()
  ctx.rect(pad, pad, box.width * scale, box.height * scale)
  ctx.clip()
  ctx.fillStyle = '#e8f4fb'
  ctx.fillRect(pad, pad, box.width * scale, box.height * scale)

  const layers = [...stage.querySelectorAll<Element>('svg, canvas, img')].filter(
    (el) => !el.closest('[data-no-photo]') && !(el.tagName.toLowerCase() === 'svg' && el.parentElement?.closest('svg')) && visible(el),
  )
  for (const el of layers) {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const x = pad + (r.left - box.left) * scale
    const y = pad + (r.top - box.top) * scale
    const w = r.width * scale
    const h = r.height * scale
    ctx.globalAlpha = Number(getComputedStyle(el).opacity) || 1
    try {
      if (el instanceof HTMLCanvasElement || el instanceof HTMLImageElement) ctx.drawImage(el, x, y, w, h)
      else ctx.drawImage(await svgToImage(el as SVGSVGElement, r.width, r.height), x, y, w, h)
    } catch {
      // a layer that can't be drawn is left out rather than spoiling the photo
    }
  }
  ctx.restore()
  ctx.globalAlpha = 1

  // The frame's caption strip.
  ctx.fillStyle = '#0f2341'
  ctx.font = `800 ${Math.round(22 * scale)}px Poppins, system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  const mid = canvas.height - strip / 2
  ctx.fillText(caption.slice(0, 60), pad, mid)
  ctx.fillStyle = '#6b7a8f'
  ctx.font = `600 ${Math.round(14 * scale)}px Poppins, system-ui, sans-serif`
  const stamp = `Rocky · RLX · ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
  ctx.fillText(stamp, canvas.width - pad - ctx.measureText(stamp).width, mid)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
  if (blob && blob.type === 'image/webp') return blob
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The photo could not be made.'))), 'image/png'))
}
