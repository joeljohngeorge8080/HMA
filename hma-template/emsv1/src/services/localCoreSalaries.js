// Local store for Core division — employee salary entries.
// Each record ties one employee to a month/year with planned & actual salary.

const KEY = 'hma_core_salaries'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const now = () => new Date().toISOString()

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
const write = (data) => localStorage.setItem(KEY, JSON.stringify(data))

export const localCoreSalaries = {
  list({ year, month } = {}) {
    let all = read()
    if (year) all = all.filter((e) => e.year === year)
    if (month) all = all.filter((e) => e.month === month)
    return all.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''))
  },

  get(id) {
    const entry = read().find((e) => e.id === id)
    if (!entry) throw new Error('Salary entry not found')
    return entry
  },

  create(data) {
    const all = read()
    const ts = now()
    const planned = parseFloat(data.planned_amount || 0)
    const actual = parseFloat(data.actual_amount || 0)
    const entry = {
      id: uid(),
      employee_id: data.employee_id,
      employee_name: data.employee_name,
      employee_code: data.employee_code || '',
      month: data.month,
      year: data.year,
      planned_amount: planned,
      actual_amount: actual,
      variance: parseFloat((actual - planned).toFixed(2)),
      status: data.status || 'Pending',
      remarks: data.remarks || null,
      created_at: ts,
      updated_at: ts,
    }
    write([...all, entry])
    return entry
  },

  update(id, patch) {
    const all = read()
    const idx = all.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Salary entry not found')
    const planned = parseFloat(patch.planned_amount ?? all[idx].planned_amount)
    const actual = parseFloat(patch.actual_amount ?? all[idx].actual_amount)
    all[idx] = {
      ...all[idx],
      ...patch,
      variance: parseFloat((actual - planned).toFixed(2)),
      updated_at: now(),
    }
    write(all)
    return all[idx]
  },

  delete(id) {
    const all = read()
    if (!all.find((e) => e.id === id)) throw new Error('Entry not found')
    write(all.filter((e) => e.id !== id))
  },
}
