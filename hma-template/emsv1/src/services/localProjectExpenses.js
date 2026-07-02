/**
 * Local store for per-project actual expense entries. Distinct from
 * localAdminExpenses.js (the org-wide vendor-contract ledger) — these
 * entries are tied to one specific project via project_id, and feed the
 * PMS "Actual Spend" section and the Budget & Payroll Admin Expenses card.
 * Only pool: 'admin' is exposed in the UI so far; 'hr'/'core' are accepted
 * by the shape as a provision for later.
 */

const KEY = 'hma_project_expenses'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `pexp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
const write = (data) => localStorage.setItem(KEY, JSON.stringify(data))

const VALID_POOLS = ['admin', 'hr', 'core']

export const localProjectExpenses = {
  list({ projectId = '', pool = '', month = '' } = {}) {
    let rows = read()
    if (projectId) rows = rows.filter((r) => r.project_id === projectId)
    if (pool) rows = rows.filter((r) => r.pool === pool)
    if (month) rows = rows.filter((r) => r.month === month)
    return rows
  },

  create({ project_id, pool, month, amount, label, createdBy }) {
    if (!project_id) throw new Error('A project is required.')
    if (!VALID_POOLS.includes(pool)) throw new Error('Pool must be admin, hr, or core.')
    if (!month) throw new Error('A month is required.')
    const amt = parseFloat(amount) || 0
    if (amt <= 0) throw new Error('Amount must be greater than zero.')
    if (!label || !label.trim()) throw new Error('A label is required.')

    const rows = read()
    const row = {
      id: uid(),
      project_id,
      pool,
      month,
      amount: amt,
      label: label.trim(),
      createdBy: createdBy || 'Unknown',
      createdAt: new Date().toISOString(),
    }
    write([...rows, row])
    return row
  },

  remove(id) {
    const rows = read()
    if (!rows.find((r) => r.id === id)) throw new Error('Expense entry not found')
    write(rows.filter((r) => r.id !== id))
  },

  sumForMonth(projectId, pool, month) {
    return (
      Math.round(
        read()
          .filter((r) => r.project_id === projectId && r.pool === pool && r.month === month)
          .reduce((s, r) => s + (r.amount || 0), 0) * 100,
      ) / 100
    )
  },
}
