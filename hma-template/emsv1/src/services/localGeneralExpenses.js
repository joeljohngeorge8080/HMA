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

const DEFAULT_CATEGORIES = [
  { id: uid(), name: 'House Rent', description: 'Office space rent', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Internet', description: 'Broadband and mobile data', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Electricity', description: 'Electricity bills', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Water Bill', description: 'Water utility', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Stationery', description: 'Office supplies', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Software Licenses', description: 'Software subscriptions', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'AMC', description: 'Annual maintenance contracts', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Maintenance', description: 'General maintenance', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Telephone', description: 'Phone bills', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Imprest', description: 'Petty cash imprest', is_active: true, created_at: now(), updated_at: now() },
  { id: uid(), name: 'Miscellaneous', description: 'Other expenses', is_active: true, created_at: now(), updated_at: now() },
]

function _ensureSeeded() {
  const cats = read(KEYS.categories)
  if (cats.length === 0) {
    write(KEYS.categories, DEFAULT_CATEGORIES)
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
