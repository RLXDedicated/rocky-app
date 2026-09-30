import { describe, expect, it } from 'vitest'
import { describeSchedule, minutesIntoShift, parseDays, parseRoster, parseShift, parseTime } from './schedule'

describe('schedule parsing', () => {
  it('reads days the ways people write them', () => {
    expect(parseDays('L-V')).toEqual([1, 2, 3, 4, 5])
    expect(parseDays('Lunes a Viernes')).toEqual([1, 2, 3, 4, 5])
    expect(parseDays('Mon-Fri')).toEqual([1, 2, 3, 4, 5])
    expect(parseDays('Lun, Mié, Vie')).toEqual([1, 3, 5])
    expect(parseDays('LMXJV')).toEqual([1, 2, 3, 4, 5])
    expect(parseDays('Martes a Sábado')).toEqual([2, 3, 4, 5, 6])
    expect(parseDays('Vie-Lun')).toEqual([0, 1, 5, 6])
    expect(parseDays('1,2,3,4,5')).toEqual([1, 2, 3, 4, 5])
    expect(parseDays('todos los días')).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(parseDays('whenever')).toBeNull()
  })

  it('reads times and shifts', () => {
    expect(parseTime('8')).toBe('08:00')
    expect(parseTime('8:30')).toBe('08:30')
    expect(parseTime('8:00 a. m.')).toBe('08:00')
    expect(parseTime('5pm')).toBe('17:00')
    expect(parseTime('12:15 p.m.')).toBe('12:15')
    expect(parseTime('12 am')).toBe('00:00')
    expect(parseTime('17:30')).toBe('17:30')
    expect(parseTime('25:00')).toBeNull()
    expect(parseShift('8:00 - 17:00')).toEqual(['08:00', '17:00'])
    expect(parseShift('8am a 5pm')).toEqual(['08:00', '17:00'])
    expect(describeSchedule({ days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' })).toBe('Lun–Vie · 08:00–17:00')
  })

  it('imports a pasted SharePoint export (CSV or tab-separated)', () => {
    const csv = [
      'Nombre,Correo,Líder,Días,Entrada,Salida',
      'Ana Pérez,ana.perez@rlx.us,mcantillo@rlx.us,L-V,8:00 a. m.,5:00 p. m.',
      '"Gómez, Luis",LUIS.GOMEZ@rlx.us,,Mar a Sáb,9,18',
      'Bad,not-an-email,,L-V,8,17',
      'Late,late@rlx.us,,L-V,18,8',
    ].join('\n')
    const r = parseRoster(csv)
    expect(r.missing).toEqual([])
    expect(r.rows[0]).toMatchObject({ email: 'ana.perez@rlx.us', name: 'Ana Pérez', leader: 'mcantillo@rlx.us', schedule: { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' }, problem: null })
    expect(r.rows[1]).toMatchObject({ email: 'luis.gomez@rlx.us', name: 'Gómez, Luis', schedule: { days: [2, 3, 4, 5, 6], start: '09:00', end: '18:00' } })
    expect(r.rows[2]!.problem).toContain('correo')
    expect(r.rows[3]!.schedule).toBeNull()
    const tsv = parseRoster('Email\tShift\tDays\nx@rlx.us\t7am - 4pm\tMon-Fri')
    expect(tsv.rows[0]!.schedule).toEqual({ days: [1, 2, 3, 4, 5], start: '07:00', end: '16:00' })
  })

  it('knows how far into the shift we are', () => {
    const s = { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' }
    expect(minutesIntoShift(s, new Date(2026, 8, 29, 8, 20))).toBe(20)
    expect(minutesIntoShift(s, new Date(2026, 9, 4, 9, 0))).toBeNull()
  })
})
