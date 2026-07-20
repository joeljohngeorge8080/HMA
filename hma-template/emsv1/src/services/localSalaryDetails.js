// localStorage-based store for per-employee, per-month salary detail records.
// Mirrors localAttendance.js's per-employee-per-month summary convention.
// Keyed by employee CODE (e.g. "THLL2408"), matching localAttendance — not
// the employee's internal UUID row id — so this data lines up with the
// attendance-driven TND/TNDW figures the same way SalaryTab.jsx's live
// calculator already does.
//
// Each record stores the raw manual inputs only (idealBasic, pt, recovery,
// tnd, tndw, centreInchargeAllowance, rsoAllowance, invoiceNo, hcNo, state,
// remarks) — the computed CTC breakdown is always derived fresh via
// computeCTC() on read/display, never persisted, so a future formula change
// never leaves stale computed numbers sitting in old records.

const KEY = 'hma_salary_details'

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

export const localSalaryDetails = {
  get(employeeId, year, month) {
    return (
      read().find(
        (r) => r.employee_id === employeeId && r.year === Number(year) && r.month === Number(month),
      ) || null
    )
  },

  // Creates or updates the one record for this employee+year+month.
  upsert(employeeId, year, month, fields) {
    const rows = read()
    const idx = rows.findIndex(
      (r) => r.employee_id === employeeId && r.year === Number(year) && r.month === Number(month),
    )
    const ts = now()
    if (idx === -1) {
      const entry = {
        id: uid(),
        employee_id: employeeId,
        year: Number(year),
        month: Number(month),
        created_at: ts,
        updated_at: ts,
        ...fields,
      }
      write([...rows, entry])
      return entry
    }
    rows[idx] = { ...rows[idx], ...fields, updated_at: ts }
    write(rows)
    return rows[idx]
  },

  listByEmployee(employeeId) {
    return read()
      .filter((r) => r.employee_id === employeeId)
      .sort((a, b) => b.year - a.year || b.month - a.month)
  },
}
