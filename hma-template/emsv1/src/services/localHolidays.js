// Company holiday store.
// Default holidays (all Sundays, 2nd & 4th Saturdays) are computed, not stored.
// Only custom HR-added holidays are persisted in localStorage.

const KEY = 'hma_holidays'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const now = () => new Date().toISOString()
const pad = (n) => String(n).padStart(2, '0')

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
const write = (data) => localStorage.setItem(KEY, JSON.stringify(data))

// Returns default holiday info for a date string, or null if it's a working day.
const getDefaultHoliday = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  if (dow === 0) return { type: 'sunday', name: 'Sunday' }
  if (dow === 6) {
    // nth = which Saturday of the month (1st, 2nd, 3rd, 4th, 5th)
    const nth = Math.ceil(d.getDate() / 7)
    if (nth === 2) return { type: 'saturday', name: '2nd Saturday' }
    if (nth === 4) return { type: 'saturday', name: '4th Saturday' }
  }
  return null
}

export const localHolidays = {
  // ── default rule helper ────────────────────────────────────────────
  getDefaultHoliday,

  // ── custom holiday CRUD ────────────────────────────────────────────
  listCustom({ year, month } = {}) {
    let rows = read()
    if (year != null) rows = rows.filter((h) => h.year === Number(year))
    if (month != null) rows = rows.filter((h) => h.month === Number(month))
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  },

  addHoliday({ date, name }) {
    const rows = read()
    if (rows.find((h) => h.date === date)) {
      throw new Error('A custom holiday already exists for this date.')
    }
    const d = new Date(date + 'T00:00:00')
    const entry = {
      id: uid(),
      date,
      name: (name || '').trim() || 'Holiday',
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      created_at: now(),
    }
    write([...rows, entry])
    return entry
  },

  deleteHoliday(id) {
    write(read().filter((h) => h.id !== id))
  },

  updateHoliday(id, { name }) {
    const rows = read()
    const idx = rows.findIndex((h) => h.id === id)
    if (idx === -1) throw new Error('Holiday not found')
    rows[idx] = { ...rows[idx], name: (name || '').trim() || rows[idx].name }
    write(rows)
    return rows[idx]
  },

  // ── month holiday map ──────────────────────────────────────────────
  // Returns { 'YYYY-MM-DD': { type: 'sunday'|'saturday'|'custom', name, id? } }
  // for every holiday in the given month (defaults + custom).
  getMonthMap(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate()
    const custom = read().filter((h) => h.year === Number(year) && h.month === Number(month))
    const customByDate = {}
    for (const h of custom) {
      customByDate[h.date] = { type: 'custom', name: h.name, id: h.id }
    }
    const map = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month)}-${pad(d)}`
      const def = getDefaultHoliday(dateStr)
      if (def) map[dateStr] = def
      else if (customByDate[dateStr]) map[dateStr] = customByDate[dateStr]
    }
    return map
  },

  // Returns holiday info for a single date (default first, then custom), or null.
  getHoliday(dateStr) {
    const def = getDefaultHoliday(dateStr)
    if (def) return def
    const custom = read().find((h) => h.date === dateStr)
    return custom ? { type: 'custom', name: custom.name, id: custom.id } : null
  },
}
