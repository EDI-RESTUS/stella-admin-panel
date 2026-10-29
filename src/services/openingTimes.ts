// src/services/openingTimes.ts
//
// A shop's (delivery zone's) own opening hours in the panel — display only:
// the apps and websites show them on their Locations page. Same shape and
// rules as the server (stella_back_end utils/zoneOpeningTimes, utils/outletHours)
// and the apps (opening_hours.dart): Cyprus time, a window is [opens, closes),
// a day without times is closed, a closing time of 00:00 is midnight.
// The editor always stores the 'byDay' mode. Pure helpers, no Vue.

export const WEEKDAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
] as const

export type WeekdayKey = (typeof WEEKDAYS)[number]['key']

export interface OpeningWindow {
  opens: string
  closes: string
}

export interface ZoneOpeningTimes {
  selected: 'byDay'
  byDay: Record<WeekdayKey, OpeningWindow>
}

/** "HH:mm" (also "H:mm", "HH:mm:ss", "24:00") -> minutes after midnight; null when unreadable. */
export const parseClock = (v: unknown): number | null => {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(v ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (mi > 59 || h > 24 || (h === 24 && mi !== 0)) return null
  return h * 60 + mi
}

/** '' or a zero-padded "HH:mm" the time input can show (24:00 -> 00:00: both are midnight). */
export const toInputTime = (v: unknown): string => {
  const m = parseClock(v)
  if (m === null) return ''
  const h = Math.floor(m / 60) % 24
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export const emptyByDay = (): Record<WeekdayKey, OpeningWindow> =>
  Object.fromEntries(WEEKDAYS.map((d) => [d.key, { opens: '', closes: '' }])) as Record<WeekdayKey, OpeningWindow>

/** The stored hours as the editor's week, or null = the shop has no own hours. */
export const fromStored = (raw: any): ZoneOpeningTimes | null => {
  const selected = String(raw?.selected ?? '').trim()
  const byDay = emptyByDay()
  if (selected === 'byDay') {
    for (const d of WEEKDAYS) {
      const w = raw?.byDay?.[d.key]
      const opens = toInputTime(w?.opens)
      const closes = toInputTime(w?.closes)
      byDay[d.key] = opens && closes ? { opens, closes } : { opens: '', closes: '' }
    }
    return { selected: 'byDay', byDay }
  }
  if (selected === 'daily') {
    const opens = toInputTime(raw?.daily?.opens)
    const closes = toInputTime(raw?.daily?.closes)
    if (!opens || !closes) return null
    for (const d of WEEKDAYS) byDay[d.key] = { opens, closes }
    return { selected: 'byDay', byDay }
  }
  if (selected === 'is24h') {
    for (const d of WEEKDAYS) byDay[d.key] = { opens: '00:00', closes: '00:00' }
    return { selected: 'byDay', byDay }
  }
  return null
}

/** The `openingTimes` the panel sends: null (remove the shop's own hours) or the full week. Also the snapshot form. */
export const toPayload = (v: ZoneOpeningTimes | null): ZoneOpeningTimes | null => {
  if (!v) return null
  const byDay = emptyByDay()
  for (const d of WEEKDAYS) {
    const w = v.byDay?.[d.key]
    byDay[d.key] = { opens: toInputTime(w?.opens), closes: toInputTime(w?.closes) }
  }
  return { selected: 'byDay', byDay }
}

/** What blocks saving: a day with only one time, or a week with every day closed. */
export const problems = (v: ZoneOpeningTimes | null): { days: Record<WeekdayKey, string>; week: string } => {
  const days = Object.fromEntries(WEEKDAYS.map((d) => [d.key, ''])) as Record<WeekdayKey, string>
  if (!v) return { days, week: '' }
  let openDays = 0
  for (const d of WEEKDAYS) {
    const opens = toInputTime(v.byDay?.[d.key]?.opens)
    const closes = toInputTime(v.byDay?.[d.key]?.closes)
    if (!!opens !== !!closes) days[d.key] = 'Set both times, or clear both for a closed day'
    else if (opens) openDays++
  }
  const dayProblem = Object.values(days).some(Boolean)
  const week =
    !dayProblem && openDays === 0
      ? "Every day is closed: set at least one day, or switch off this shop's own hours"
      : ''
  return { days, week }
}

/** The first problem, or ''. */
export const firstProblem = (v: ZoneOpeningTimes | null): string => {
  const p = problems(v)
  return Object.values(p.days).find(Boolean) || p.week
}

/** One line like the apps show it: "Mon–Sat 09:00–00:00, Sun 09:30–00:00"; '' without own hours. */
export const summary = (raw: any): string => {
  const v = fromStored(raw)
  if (!v) return ''
  const groups: { from: number; to: number; w: OpeningWindow }[] = []
  WEEKDAYS.forEach((d, i) => {
    const w = v.byDay[d.key]
    if (!w.opens || !w.closes) return
    const last = groups[groups.length - 1]
    if (last && last.to === i - 1 && last.w.opens === w.opens && last.w.closes === w.closes) last.to = i
    else groups.push({ from: i, to: i, w })
  })
  return groups
    .map(
      (g) => `${WEEKDAYS[g.from].short}${g.from === g.to ? '' : '–' + WEEKDAYS[g.to].short} ${g.w.opens}–${g.w.closes}`,
    )
    .join(', ')
}
