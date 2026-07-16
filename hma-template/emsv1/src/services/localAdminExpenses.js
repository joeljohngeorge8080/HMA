// Local store for Admin Expenses (vendor recurring contracts).
// Tracks vendor name, expense category, frequency, and annual contract value.
// Monthly equivalent is always derived: annual_amount / 12.
// monthly_actuals additionally records what was really spent in a given
// 'YYYY-MM', so month-specific consumers (e.g. the Forecast Expense tab)
// read/write the same records shown here instead of keeping their own copy.

const KEY = 'hma_admin_expenses'
const VERSION_KEY = 'hma_admin_expenses_seed_v'
const SEED_VERSION = 1

const SEED_TS = '2025-09-01T00:00:00.000Z'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
const write = (data) => localStorage.setItem(KEY, JSON.stringify(data))

const _row = (vendor, category, frequency, annual, status = 'Active', remarks = null) => ({
  id: uid(),
  vendor_name: vendor,
  expense_category: category,
  frequency,
  annual_amount: annual,
  monthly_actuals: {},
  status,
  remarks,
  created_at: SEED_TS,
  updated_at: SEED_TS,
})

// 18 entries from the HMA Admin Expenses master sheet
const DEFAULT_DATA = [
  _row('Manjith Travels', 'Contract Vehicle', 'Monthly', 524160),
  _row('Dr Anandam', 'House Rent', 'Monthly', 1800000),
  _row('BSNL', 'Land Line', 'Monthly', 24000),
  _row('KSEB', 'Electricity Bill', 'Monthly', 264000),
  _row('KWA', 'Water Bill', 'Monthly', 96000),
  _row('Subramania Industries', 'DG AMC', 'Half Yearly', 10000),
  _row('Imprest', 'Monthly Imprest', 'Monthly', 120000),
  _row('Alchemy IBS', 'Website', 'Monthly', 200000),
  _row('Geejey Solutions', 'Epabx AMC', 'Half Yearly', 8000),
  _row('VRS Infosystems', 'Tally Software Renewal', 'Annually', 16000),
  _row('M/s Armtech Computer Services', 'CAMC Computer Hardware', 'Quarterly', 15000),
  _row('Nu Aire', 'AC AMC', 'Quarterly', 36000),
  _row('Miscellaneous', 'Repair & Maintenance', 'Monthly', 50000),
  _row('Microsoft 365', 'Software', 'Annually', 7000),
  _row('Asterisk', 'Photocopier (Admin & DVP)', 'Monthly', 48000),
  _row('Pradeep Kumar Cost Accountant', 'Financial Consultant', 'Monthly', 1296000),
  _row('Pradeep Kumar Cost Accountant', 'Accounts Assistance', 'Monthly', 750000),
  _row('Indian Postal Department', 'Speed Post', 'Monthly', 120000, 'Inactive'),
]

function _ensureSeeded() {
  const stored = parseInt(localStorage.getItem(VERSION_KEY) || '0', 10)
  if (read().length === 0 || stored < SEED_VERSION) {
    write(DEFAULT_DATA)
    localStorage.setItem(VERSION_KEY, String(SEED_VERSION))
  }
}

export const localAdminExpenses = {
  list({ search = '', category = '', frequency = '', status = '' } = {}) {
    _ensureSeeded()
    let rows = read()
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((r) => r.vendor_name.toLowerCase().includes(q))
    }
    if (category) rows = rows.filter((r) => r.expense_category === category)
    if (frequency) rows = rows.filter((r) => r.frequency === frequency)
    if (status) rows = rows.filter((r) => r.status === status)
    return rows
  },

  categories() {
    _ensureSeeded()
    return [...new Set(read().map((r) => r.expense_category))].sort()
  },

  get(id) {
    _ensureSeeded()
    const row = read().find((r) => r.id === id)
    if (!row) throw new Error('Expense not found')
    return row
  },

  /** Find an entry by exact vendor + category match, if one exists. */
  findByVendorCategory(vendor_name, expense_category) {
    _ensureSeeded()
    return (
      read().find(
        (r) => r.vendor_name === vendor_name && r.expense_category === expense_category,
      ) || null
    )
  },

  create(data) {
    _ensureSeeded()
    const rows = read()
    const ts = new Date().toISOString()
    const row = {
      id: uid(),
      vendor_name: data.vendor_name.trim(),
      expense_category: data.expense_category.trim(),
      frequency: data.frequency,
      annual_amount: parseFloat(data.annual_amount) || 0,
      monthly_actuals: data.monthly_actuals || {},
      // 'HR' | 'Admin' — only used by the Forecast Expense tab's card grouping
      group: data.group || 'Admin',
      status: data.status || 'Active',
      remarks: data.remarks?.trim() || null,
      created_at: ts,
      updated_at: ts,
    }
    write([...rows, row])
    return row
  },

  /** Merge a single month's actual spend into an entry's monthly_actuals map. */
  setMonthlyActual(id, monthKey, amount) {
    const rows = read()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Expense not found')
    rows[idx] = {
      ...rows[idx],
      monthly_actuals: {
        ...(rows[idx].monthly_actuals || {}),
        [monthKey]: parseFloat(amount) || 0,
      },
      updated_at: new Date().toISOString(),
    }
    write(rows)
    return rows[idx]
  },

  update(id, patch) {
    const rows = read()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Expense not found')
    rows[idx] = {
      ...rows[idx],
      ...patch,
      annual_amount: parseFloat(patch.annual_amount ?? rows[idx].annual_amount) || 0,
      updated_at: new Date().toISOString(),
    }
    write(rows)
    return rows[idx]
  },

  delete(id) {
    const rows = read()
    if (!rows.find((r) => r.id === id)) throw new Error('Expense not found')
    write(rows.filter((r) => r.id !== id))
  },

  /**
   * Returns active HR admin expenses converted to the PMS ExpenseCard format.
   * Amount shown is the monthly equivalent (annual / 12).
   * These entries are tagged with source: 'hr_admin' so PMS can render them
   * as read-only org-level entries.
   */
  asProjectExpenses() {
    _ensureSeeded()
    return read()
      .filter((r) => r.status === 'Active')
      .map((r) => ({
        id: r.id,
        label: `${r.expense_category} — ${r.vendor_name}`,
        amount: Math.round(parseFloat(r.annual_amount || 0) / 12),
        date: r.updated_at || r.created_at || '',
        notes: `${r.frequency} · HR Admin`,
        source: 'hr_admin',
        vendor_name: r.vendor_name,
        expense_category: r.expense_category,
        frequency: r.frequency,
        annual_amount: r.annual_amount,
      }))
  },
}
