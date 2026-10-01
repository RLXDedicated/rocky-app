// Renders Rocky's chat stickers (src/components/chat/Stickers.tsx) as PNGs
// for Teams cards: same official pose, emoji and label as the chat — one
// image per sticker (one official Rocky for everyone).
//
//   node tools/teams-app/render-stickers.mjs   (needs the `playwright` package)
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.ROCKY_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ART = path.join(ROOT, 'src/assets/rocky/official/poses')
const OUT = path.join(ROOT, 'public/teams/stickers')

const src = fs.readFileSync(path.join(ROOT, 'src/components/chat/Stickers.tsx'), 'utf8')
const stickers = [...src.matchAll(/\{ id: '(\w+)', label: '([^']+)', art: '([\w-]+)', motion: '\w+', extra: '([^']+)' \}/g)].map((m) => ({
  id: m[1],
  label: m[2],
  pose: m[3],
  extra: m[4],
}))
if (stickers.length < 20) throw new Error(`Only found ${stickers.length} stickers — did Stickers.tsx change shape?`)

const img = (file) => `data:image/png;base64,${fs.readFileSync(path.join(ART, file)).toString('base64')}`
const html = (art, s) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent}
  .sticker{position:relative;width:132px;height:132px;font-family:'Poppins','Segoe UI',system-ui,sans-serif}
  .body{position:absolute;left:4px;right:4px;top:4px;bottom:16px}
  .body img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(15,35,65,.25))}
  .extra{position:absolute;top:2%;right:4%;font-size:30px;font-family:'Noto Color Emoji'}
  .label{position:absolute;left:50%;bottom:2px;padding:2px 10px;border-radius:999px;background:#fff;box-shadow:0 2px 6px rgba(15,35,65,.25);color:#0f2341;font-size:13px;font-weight:800;white-space:nowrap;transform:translateX(-50%)}
</style></head><body><div class="sticker" id="s"><div class="body"><img src="${art}"></div><span class="extra">${s.extra}</span><span class="label">${s.label}</span></div></body></html>`

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 200, height: 200 } })
let n = 0
for (const s of stickers) {
  const jobs = [[`${s.id}.png`, `${s.pose}.png`]]
  for (const [out, file] of jobs) {
    await page.setContent(html(img(file), s))
    await page.waitForTimeout(50)
    await page.locator('#s').screenshot({ path: path.join(OUT, out), omitBackground: true })
    n++
  }
}
await browser.close()
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(stickers.map(({ id, label, pose }) => ({ id, label, pose })), null, 2) + '\n')
console.log(`${n} sticker images in public/teams/stickers`)
