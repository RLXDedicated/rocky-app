import { describe, expect, it } from 'vitest'
import { describeSchedule, minutesIntoShift, parseDays, parseRoster, parseShift, parseTime, parseScheduleText, matchByName, emailFitsName, toLocalSchedule, zoneOffsetMinutes } from './schedule'

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

describe('the RLX roster formats', () => {
  it('reads days and hours in one cell', () => {
    expect(parseScheduleText('WED-SUN / 1100 - 2000')).toEqual({ days: [0, 3, 4, 5, 6], start: '11:00', end: '20:00' })
    expect(parseScheduleText('SUN - THU 1200 / 2100')).toEqual({ days: [0, 1, 2, 3, 4], start: '12:00', end: '21:00' })
    expect(parseScheduleText('SAT-MON;WED-THU / 1000 - 1900')).toEqual({ days: [0, 1, 3, 4, 6], start: '10:00', end: '19:00' })
    expect(parseScheduleText('THU - MON / 0800 - 1700PM')).toEqual({ days: [0, 1, 4, 5, 6], start: '08:00', end: '17:00' })
    expect(parseScheduleText('MON - FRI / 1100-2000')?.start).toBe('11:00')
    expect(parseScheduleText('whenever')).toBeNull()
  })

  it('imports a Name / Schedule list (no emails) and the SharePoint export', () => {
    const byName = parseRoster('Name\tSchedule\nNohelia Laverde Mejia\tSAT-MON;WED-THU / 1000 - 1900')
    expect(byName.missing).toEqual([])
    expect(byName.rows[0]).toMatchObject({ email: '', name: 'Nohelia Laverde Mejia', schedule: { days: [0, 1, 3, 4, 6] } })
    const sp = parseRoster(
      '﻿"Título","TeamLead","TeamLeadEmail","AgentName","TeamsEmail","Active","ShiftStart","ShiftEnd","WorkDays"\n' +
        ',"Maria Cantillo","mcantillo@rlx.us","Eduardo Luis Nuñez Garcia","enunez@rlx.us","No","10:00","19:00","Fri,Sat,Sun,Mon,Tue"',
    )
    expect(sp.rows[0]).toMatchObject({ email: 'enunez@rlx.us', name: 'Eduardo Luis Nuñez Garcia', leader: 'mcantillo@rlx.us', active: false, schedule: { days: [0, 1, 2, 5, 6], start: '10:00', end: '19:00' } })
  })

  it('matches people by name and RLX emails by initial + surname', () => {
    const people = [
      { email: 'jnunez@rlx.us', name: 'Julieth Paola Nuñez Salas' },
      { email: 'enunez@rlx.us', name: 'Eduardo Luis Nuñez Garcia' },
    ]
    expect(matchByName('Julieth Paola Nunez Salas', people)?.email).toBe('jnunez@rlx.us')
    expect(matchByName('Nuñez', people)).toBeNull()
    expect(emailFitsName('mcantillo@rlx.us', 'Maria Cantillo')).toBe(true)
    expect(emailFitsName('jmullet@rlx.us', 'Juan David Mulett Millan')).toBe(false)
  })

  it('moves a US Eastern shift into local time, following US daylight saving', () => {
    const s = { days: [3, 4, 5, 6, 0], start: '08:00', end: '17:00' }
    // Expected local = Eastern wall time minus the zone gap at that moment.
    for (const at of [new Date('2026-09-30T15:00:00Z'), new Date('2026-12-02T15:00:00Z')]) {
      const gap = zoneOffsetMinutes('America/New_York', at) + at.getTimezoneOffset()
      const local = toLocalSchedule(s, 'America/New_York', at)
      const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
      if (minutes('08:00') - gap >= 0 && minutes('17:00') - gap < 1440) expect(minutes(local.start)).toBe(minutes('08:00') - gap)
    }
    expect(zoneOffsetMinutes('America/New_York', new Date('2026-09-30T15:00:00Z'))).toBe(-240)
    expect(zoneOffsetMinutes('America/New_York', new Date('2026-12-02T15:00:00Z'))).toBe(-300)
    expect(zoneOffsetMinutes('America/Bogota', new Date('2026-09-30T15:00:00Z'))).toBe(-300)
    expect(toLocalSchedule(s, null, new Date())).toBe(s)
  })

  it('describes shifts that wrap past Saturday', () => {
    expect(describeSchedule({ days: [0, 3, 4, 5, 6], start: '11:00', end: '20:00' })).toBe('Mié–Dom · 11:00–20:00')
    expect(describeSchedule({ days: [0, 1, 3, 4, 6], start: '10:00', end: '19:00' })).toBe('Dom, Lun, Mié, Jue, Sáb · 10:00–19:00')
  })
})
