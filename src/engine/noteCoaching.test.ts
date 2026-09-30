import { describe, expect, it } from 'vitest'
import { findLesson, lessonBlock, NOTE_CHECKLIST, NOTE_LESSONS, NOTE_REMINDERS, NOTE_SHIFT_STARTS, pickLesson, weekTheme } from './noteCoaching'

describe('note coaching', () => {
  it('covers the whole process: why, structure, process, examples, safety and QA', () => {
    expect(new Set(NOTE_LESSONS.map((l) => l.theme))).toEqual(new Set(['why', 'structure', 'process', 'examples', 'safety', 'qa']))
    expect(new Set(NOTE_LESSONS.map((l) => l.id)).size).toBe(NOTE_LESSONS.length)
  })

  it('never repeats a lesson the agent got recently while fresh ones remain', () => {
    const seen: string[] = []
    for (let i = 0; i < NOTE_LESSONS.length; i++) seen.unshift(pickLesson(seen).id)
    expect(new Set(seen).size).toBe(NOTE_LESSONS.length)
    // All used: anything but the very last one comes back.
    expect(pickLesson(seen).id).not.toBe(seen[0])
  })

  it('prefers the week’s focus theme, and the theme rotates weekly', () => {
    const mon = new Date('2026-09-07T10:00:00')
    const theme = weekTheme(mon)
    expect(pickLesson([], { theme }).theme).toBe(theme)
    expect(weekTheme(new Date('2026-09-13T10:00:00'))).toBe(theme)
    expect(weekTheme(new Date('2026-09-14T10:00:00'))).not.toBe(theme)
  })

  it('renders a before/after example in the card block', () => {
    const block = JSON.stringify(lessonBlock(findLesson('ex-reschedule')!))
    expect(block).toContain('❌ Avoid')
    expect(block).toContain('Called cx. Rescheduled.')
    expect(block).toContain('Spoke with Maria')
  })

  it('lessons and note reminders never mention Rocky (they go out in notes-only cards)', () => {
    const text = JSON.stringify([NOTE_LESSONS, NOTE_REMINDERS, NOTE_SHIFT_STARTS, NOTE_CHECKLIST])
    expect(text).not.toMatch(/Rocky|bull|pet/i)
  })
})
