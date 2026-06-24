// localStorage-backed General Expenses store.
// Mirrors: expense_categories, general_expenses, expense_uploads
// Used as fallback when the FastAPI backend is not running.

const KEYS = {
  categories: 'hma_expense_categories',
  expenses: 'hma_general_expenses',
  uploads: 'hma_expense_uploads',
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const now = () => new Date().toISOString()

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}
const write = (key, data) => localStorage.setItem(key, JSON.stringify(data))

// Fixed UUIDs so expense seed rows can reference them reliably
const CAT_IDS = {
  HOUSE_RENT:       'cat-00000000-0001',
  INTERNET:         'cat-00000000-0002',
  ELECTRICITY:      'cat-00000000-0003',
  WATER_BILL:       'cat-00000000-0004',
  STATIONERY:       'cat-00000000-0005',
  SOFTWARE:         'cat-00000000-0006',
  AMC:              'cat-00000000-0007',
  MAINTENANCE:      'cat-00000000-0008',
  TELEPHONE:        'cat-00000000-0009',
  IMPREST:          'cat-00000000-0010',
  MISCELLANEOUS:    'cat-00000000-0011',
  OUTSOURCED_SVC:   'cat-00000000-0012',
}

const SEED_TS = '2025-09-01T00:00:00.000Z'

const DEFAULT_CATEGORIES = [
  { id: CAT_IDS.HOUSE_RENT,     name: 'House Rent',          description: 'Office space rent',               is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.INTERNET,       name: 'Internet',            description: 'Broadband and data services',     is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.ELECTRICITY,    name: 'Electricity',         description: 'Electricity bills (KSEB)',        is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.WATER_BILL,     name: 'Water Bill',          description: 'Water utility (KWA)',             is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.STATIONERY,     name: 'Stationery',          description: 'Office supplies',                 is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.SOFTWARE,       name: 'Software Licenses',   description: 'Software subscriptions and AMC',  is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.AMC,            name: 'AMC',                 description: 'Annual maintenance contracts',    is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.MAINTENANCE,    name: 'Maintenance',         description: 'Repairs and maintenance',         is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.TELEPHONE,      name: 'Telephone',           description: 'Landline and communication',      is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.IMPREST,        name: 'Imprest',             description: 'Petty cash imprest',             is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.MISCELLANEOUS,  name: 'Miscellaneous',       description: 'Other administrative expenses',  is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
  { id: CAT_IDS.OUTSOURCED_SVC, name: 'Outsourced Services', description: 'HK, security, and city salaries',is_active: true, created_at: SEED_TS, updated_at: SEED_TS },
]

// September 2025 Admin Expenses — sourced from EXPENSE MASTER SHEET
const _makeExp = (catId, name, freq, planned, actual, remarks) => {
  const p = parseFloat(planned) || 0
  const a = actual !== null && actual !== undefined ? parseFloat(actual) : 0
  const hasActual = actual !== null && actual !== undefined
  return {
    id: uid(),
    category_id: catId,
    expense_name: name,
    month: 9,
    year: 2025,
    frequency: freq,
    planned_amount: parseFloat(p.toFixed(2)),
    actual_amount: parseFloat(a.toFixed(2)),
    variance: parseFloat((a - p).toFixed(2)),
    status: hasActual && a > 0 ? 'Paid' : 'Pending',
    remarks: remarks || null,
    upload_id: null,
    created_at: SEED_TS,
    updated_at: SEED_TS,
  }
}

const DEFAULT_EXPENSES = [
  _makeExp(CAT_IDS.MAINTENANCE,    'Contract Vehicle',                    'Monthly',   43661,       46000,    'Vendor: Manjith Travels'),
  _makeExp(CAT_IDS.AMC,            'Photocopier SDP',                     'Monthly',   7000,        4720,     'Vendor: Oval Blue Technologies'),
  _makeExp(CAT_IDS.AMC,            'Desktop Rental',                      'Monthly',   57652,       57652,    'Vendor: Volks Electronics'),
  _makeExp(CAT_IDS.INTERNET,       'Internet Services',                   'Quarterly', 4720,        5306.46,  'Vendor: Asianet'),
  _makeExp(CAT_IDS.STATIONERY,     'Stationery',                          'Monthly',   16667,       9524,     null),
  _makeExp(CAT_IDS.HOUSE_RENT,     'House Rent',                          'Monthly',   150000,      119100,   'Vendor: Dr Anandam'),
  _makeExp(CAT_IDS.TELEPHONE,      'Land Line',                           'Monthly',   2000,        1977,     'Vendor: BSNL'),
  _makeExp(CAT_IDS.ELECTRICITY,    'Electricity Bill',                    'Monthly',   22000,       19999,    'Vendor: KSEB'),
  _makeExp(CAT_IDS.WATER_BILL,     'Water Bill',                          'Monthly',   8000,        null,     'Vendor: KWA'),
  _makeExp(CAT_IDS.AMC,            'DG AMC',                              'One-time',  833,         null,     'Vendor: Subramania Industries'),
  _makeExp(CAT_IDS.IMPREST,        'Monthly Imprest',                     'Monthly',   10000,       10000,    null),
  _makeExp(CAT_IDS.AMC,            'EPABX AMC',                           'One-time',  667,         null,     'Vendor: Geejey Solutions'),
  _makeExp(CAT_IDS.SOFTWARE,       'Tally Software Renewal',              'Annual',    1333,        null,     'Vendor: VRS Infosystems'),
  _makeExp(CAT_IDS.AMC,            'CAMC Computer Hardware',              'Quarterly', 1250,        null,     'Vendor: Armtech Computer Services'),
  _makeExp(CAT_IDS.AMC,            'AC AMC',                              'Quarterly', 3000,        null,     'Vendor: Nu Aire'),
  _makeExp(CAT_IDS.MAINTENANCE,    'Repair & Maintenance',                'Monthly',   4167,        null,     null),
  _makeExp(CAT_IDS.SOFTWARE,       'Microsoft 365',                       'Annual',    583,         null,     null),
  _makeExp(CAT_IDS.AMC,            'Photocopier - Admin & DVP',           'Monthly',   5000,        null,     'Vendor: Asterisk'),
  _makeExp(CAT_IDS.MISCELLANEOUS,  'Speed Post',                          'Monthly',   10000,       2572,     'Vendor: India Post'),
  _makeExp(CAT_IDS.MISCELLANEOUS,  'Financial Consultant',                'Monthly',   108000,      null,     'Vendor: Pradeep Kumar Cost Accountant'),
  _makeExp(CAT_IDS.MISCELLANEOUS,  'Accounts Assistance',                 'Monthly',   62500,       null,     'Vendor: Pradeep Kumar Cost Accountant'),
  _makeExp(CAT_IDS.OUTSOURCED_SVC, 'Housekeeping Salary',                 'Monthly',   50000,       46955,    'Vendor: Vismaya Services'),
  _makeExp(CAT_IDS.OUTSOURCED_SVC, 'My City Salary',                      'Monthly',   67500,       66207,    'Vendor: Vismaya Services'),
  _makeExp(CAT_IDS.OUTSOURCED_SVC, 'Security Salary',                     'Monthly',   95000,       96550,    'Vendor: Naveen Security Services'),
]

function _ensureSeeded() {
  const cats = read(KEYS.categories)
  if (cats.length === 0) {
    write(KEYS.categories, DEFAULT_CATEGORIES)
  }
  const exps = read(KEYS.expenses)
  if (exps.length === 0) {
    write(KEYS.expenses, DEFAULT_EXPENSES)
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

const categories = {
  list(includeInactive = false) {
    _ensureSeeded()
    const all = read(KEYS.categories)
    return includeInactive ? all : all.filter((c) => c.is_active)
  },

  create(name, description = '') {
    _ensureSeeded()
    const all = read(KEYS.categories)
    if (all.find((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Category name already exists')
    }
    const ts = now()
    const cat = { id: uid(), name: name.trim(), description, is_active: true, created_at: ts, updated_at: ts }
    write(KEYS.categories, [...all, cat])
    return cat
  },

  update(id, patch) {
    const all = read(KEYS.categories)
    const idx = all.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Category not found')
    if (patch.name) {
      const conflict = all.find((c) => c.name.toLowerCase() === patch.name.toLowerCase() && c.id !== id)
      if (conflict) throw new Error('Category name already exists')
    }
    all[idx] = { ...all[idx], ...patch, updated_at: now() }
    write(KEYS.categories, all)
    return all[idx]
  },

  delete(id) {
    const expenses = read(KEYS.expenses)
    if (expenses.find((e) => e.category_id === id)) {
      throw new Error('Cannot delete a category that has expense records. Deactivate it instead.')
    }
    const all = read(KEYS.categories)
    write(KEYS.categories, all.filter((c) => c.id !== id))
  },
}

// ── Expenses ──────────────────────────────────────────────────────────────────

function _catName(catId) {
  const cats = read(KEYS.categories)
  return cats.find((c) => c.id === catId)?.name || 'Unknown'
}

const expenses = {
  list({ year, month, category_id, status, page = 1, page_size = 25 } = {}) {
    let all = read(KEYS.expenses)
    if (year) all = all.filter((e) => e.year === year)
    if (month) all = all.filter((e) => e.month === month)
    if (category_id) all = all.filter((e) => e.category_id === category_id)
    if (status) all = all.filter((e) => e.status === status)

    all = all.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      if (b.month !== a.month) return b.month - a.month
      return a.expense_name.localeCompare(b.expense_name)
    })

    const total = all.length
    const total_pages = Math.max(1, Math.ceil(total / page_size))
    const offset = (page - 1) * page_size
    const items = all.slice(offset, offset + page_size).map((e) => ({
      ...e,
      category_name: _catName(e.category_id),
    }))

    return { items, total, total_pages, page }
  },

  get(id) {
    const all = read(KEYS.expenses)
    const exp = all.find((e) => e.id === id)
    if (!exp) throw new Error('Expense not found')
    return { ...exp, category_name: _catName(exp.category_id) }
  },

  create(data) {
    const all = read(KEYS.expenses)
    const ts = now()
    const variance = parseFloat((parseFloat(data.actual_amount || 0) - parseFloat(data.planned_amount || 0)).toFixed(2))
    const exp = {
      id: uid(),
      category_id: data.category_id,
      expense_name: data.expense_name,
      month: data.month,
      year: data.year,
      frequency: data.frequency || 'Monthly',
      planned_amount: parseFloat(data.planned_amount || 0),
      actual_amount: parseFloat(data.actual_amount || 0),
      variance,
      status: data.status || 'Pending',
      remarks: data.remarks || null,
      upload_id: data.upload_id || null,
      created_at: ts,
      updated_at: ts,
    }
    write(KEYS.expenses, [...all, exp])
    return { ...exp, category_name: _catName(exp.category_id) }
  },

  update(id, patch) {
    const all = read(KEYS.expenses)
    const idx = all.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Expense not found')
    const updated = { ...all[idx], ...patch, updated_at: now() }
    updated.variance = parseFloat((parseFloat(updated.actual_amount) - parseFloat(updated.planned_amount)).toFixed(2))
    all[idx] = updated
    write(KEYS.expenses, all)
    return { ...updated, category_name: _catName(updated.category_id) }
  },

  delete(id) {
    const all = read(KEYS.expenses)
    if (!all.find((e) => e.id === id)) throw new Error('Expense not found')
    write(KEYS.expenses, all.filter((e) => e.id !== id))
  },
}

// ── Uploads ───────────────────────────────────────────────────────────────────

const uploads = {
  list({ year, month } = {}) {
    let all = read(KEYS.uploads)
    if (year) all = all.filter((u) => u.year === year)
    if (month) all = all.filter((u) => u.month === month)
    return all.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
  },

  create(data) {
    const all = read(KEYS.uploads)
    const upload = { ...data, id: uid(), uploaded_at: now() }
    write(KEYS.uploads, [...all, upload])
    return upload
  },
}

// ── Analysis ──────────────────────────────────────────────────────────────────

const analysis = {
  get(year) {
    const allExpenses = read(KEYS.expenses).filter((e) => e.year === year)
    const cats = read(KEYS.categories)
    const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]))

    const ytd_planned = allExpenses.reduce((s, e) => s + parseFloat(e.planned_amount || 0), 0)
    const ytd_actual = allExpenses.reduce((s, e) => s + parseFloat(e.actual_amount || 0), 0)
    const ytd_variance = parseFloat((ytd_actual - ytd_planned).toFixed(2))

    const monthMap = {}
    for (const e of allExpenses) {
      if (!monthMap[e.month]) monthMap[e.month] = { planned: 0, actual: 0, count: 0 }
      monthMap[e.month].planned += parseFloat(e.planned_amount || 0)
      monthMap[e.month].actual += parseFloat(e.actual_amount || 0)
      monthMap[e.month].count += 1
    }
    const monthly_summary = Object.entries(monthMap)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([m, v]) => ({
        month: parseInt(m),
        year,
        planned_total: parseFloat(v.planned.toFixed(2)),
        actual_total: parseFloat(v.actual.toFixed(2)),
        variance_total: parseFloat((v.actual - v.planned).toFixed(2)),
        record_count: v.count,
      }))

    const catTotals = {}
    for (const e of allExpenses) {
      if (!catTotals[e.category_id]) catTotals[e.category_id] = { planned: 0, actual: 0 }
      catTotals[e.category_id].planned += parseFloat(e.planned_amount || 0)
      catTotals[e.category_id].actual += parseFloat(e.actual_amount || 0)
    }
    const category_summary = Object.entries(catTotals)
      .sort((a, b) => b[1].actual - a[1].actual)
      .map(([cid, v]) => ({
        category_id: cid,
        category_name: catMap[cid] || 'Unknown',
        planned_total: parseFloat(v.planned.toFixed(2)),
        actual_total: parseFloat(v.actual.toFixed(2)),
        variance_total: parseFloat((v.actual - v.planned).toFixed(2)),
      }))

    const status_breakdown = {}
    for (const e of allExpenses) {
      status_breakdown[e.status] = (status_breakdown[e.status] || 0) + 1
    }

    return {
      year,
      ytd_planned: parseFloat(ytd_planned.toFixed(2)),
      ytd_actual: parseFloat(ytd_actual.toFixed(2)),
      ytd_variance,
      monthly_summary,
      category_summary,
      status_breakdown,
    }
  },
}

export const localGeneralExpenses = { categories, expenses, uploads, analysis }
