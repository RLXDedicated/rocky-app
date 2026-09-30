import { describe, expect, it } from 'vitest'
import { parseQaDate, parseQaResult, parseQaSheet } from './qaImport'

describe('QA sheet import', () => {
  it('reads results the ways QA writes them', () => {
    expect(parseQaResult('Pass')).toBe('pass')
    expect(parseQaResult('No cumple')).toBe('fail')
    expect(parseQaResult('Aprobado')).toBe('pass')
    expect(parseQaResult('FAILED')).toBe('fail')
    expect(parseQaResult('maybe')).toBeNull()
  })

  it('reads dates day-first, month-first, ISO and Excel serials', () => {
    expect(parseQaDate('29/09/2026', 'dmy')).toBe('2026-09-29')
    expect(parseQaDate('9/29/2026', 'dmy')).toBe('2026-09-29')
    expect(parseQaDate('03/04/2026', 'dmy')).toBe('2026-04-03')
    expect(parseQaDate('03/04/2026', 'mdy')).toBe('2026-03-04')
    expect(parseQaDate('2026-09-01', 'dmy')).toBe('2026-09-01')
    expect(parseQaDate('46294', 'dmy')).toBe('2026-09-29')
  })

  it('imports a pasted sheet with a score column and a pass mark', () => {
    const text = ['Agente\tFecha\tPuntaje\tCaso\tMotivo', 'ana.perez@rlx.us\t29/09/2026\t92\t12345\t', 'Luis Gomez\t29/09/2026\t70%\t12346\tIncomplete notes', 'x\t\t\t\t'].join('\n')
    const r = parseQaSheet(text, { today: '2026-09-30' })
    expect(r.missing).toEqual([])
    expect(r.rows[0]).toMatchObject({ agent: 'ana.perez@rlx.us', date: '2026-09-29', result: 'pass', ticket: '12345', problem: null })
    expect(r.rows[1]).toMatchObject({ result: 'fail', reason: 'Incomplete notes' })
    expect(r.rows[2]!.problem).toBeTruthy()
  })

  it('flags future dates', () => {
    const r = parseQaSheet('Email,Date,Result\nana@rlx.us,2026-10-05,Pass', { today: '2026-09-30' })
    expect(r.rows[0]!.problem).toContain('futura')
  })
})
