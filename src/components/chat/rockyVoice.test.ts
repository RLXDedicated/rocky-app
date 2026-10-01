import { describe, expect, it } from 'vitest'
import { CALM_STICKER, ROAST_LINES, stickerImage, voiceFor } from '../../engine/rockyVoice'
import { STICKERS } from './Stickers'

const ctx = { firstName: 'Ana', streak: 5, energy: 30, level: 7, checkedInToday: false }

describe('Rocky’s Teams voice', () => {
  it('keeps the calm message when roast is off', () => {
    expect(voiceFor('Documentation', 'Rocky is ready when you are.', ctx, { roast: false })).toEqual({ text: 'Rocky is ready when you are.', sticker: CALM_STICKER.Documentation })
  })

  it('roasts with the agent’s details filled in', () => {
    const line = voiceFor('Streak', 'Keep the streak alive.', ctx, { roast: true, random: () => 0.99 })
    expect(line.text).not.toMatch(/\{\w+\}/)
    expect(line.text).not.toBe('Keep the streak alive.')
  })

  it('never teases a streak that isn’t there', () => {
    for (let i = 0; i < 20; i++) {
      const line = voiceFor('Streak', 'x', { ...ctx, streak: 0 }, { roast: true, random: () => 0.5 + i / 50 })
      expect(line.text).not.toMatch(/0-day|^0 days/)
    }
  })

  it('keeps celebration facts and uses a real sticker everywhere', () => {
    expect(voiceFor('Celebration', '✨ Rocky evolved into Elite Rocky!', ctx, { roast: true, random: () => 0.9 }).text).toContain('Elite Rocky')
    const ids = new Set(STICKERS.map((s) => s.id))
    for (const lines of Object.values(ROAST_LINES)) for (const [, sticker] of lines) expect(ids.has(sticker)).toBe(true)
    for (const s of Object.values(CALM_STICKER)) expect(ids.has(s)).toBe(true)
  })

  const RENDERED = new Set(Object.keys(import.meta.glob('/public/teams/stickers/*.png')))

  it('has one rendered Teams image per sticker (one official Rocky, no stages)', () => {
    for (const s of STICKERS) {
      expect(stickerImage(s.id, 'Elite')).toBe(`/teams/stickers/${s.id}.png`)
      expect(RENDERED.has(`/public${stickerImage(s.id)}`)).toBe(true)
    }
  })

  it('doesn’t repeat a line the agent got recently', () => {
    const seen: string[] = []
    for (let i = 0; i < ROAST_LINES.Celebration.length; i++) {
      const line = voiceFor('Celebration', '🎉 Level 5 reached!', ctx, { roast: true, random: () => 0.99, avoid: seen })
      expect(seen).not.toContain(line.text)
      seen.push(line.text)
    }
  })
})
