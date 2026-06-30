const BODIES_KEY = 'hma_lsgb_bodies'
const FUNDS_KEY = 'hma_lsgb_fund_withdrawals'

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
const write = (key, data) => localStorage.setItem(key, JSON.stringify(data))
const uid = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const now = () => new Date().toISOString()

export const BODY_TYPES = [
  'Gram Panchayat',
  'Block Panchayat',
  'District Panchayat',
  'Municipality',
  'Municipal Corporation',
  'Town Panchayat',
]

export const CONTACT_ROLES = ['President', 'Vice President', 'Secretary', 'Assistant Secretary']

export const FUND_PURPOSES = ['Core Expenses', 'HR Expenses', 'Other Operational Expenses']

export const PURPOSE_COLOR = {
  'Core Expenses': 'primary',
  'HR Expenses': 'success',
  'Other Operational Expenses': 'warning',
}

export const localLsgb = {
  // ── LSGB Bodies ──────────────────────────────────────────────────────────────

  listBodies(filters = {}) {
    let items = read(BODIES_KEY)
    if (filters.officer_id) items = items.filter((b) => b.officer_id === filters.officer_id)
    if (filters.body_type) items = items.filter((b) => b.body_type === filters.body_type)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      items = items.filter(
        (b) =>
          b.body_name?.toLowerCase().includes(q) || b.body_type?.toLowerCase().includes(q),
      )
    }
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },

  getBody(id) {
    return read(BODIES_KEY).find((b) => b.id === id) || null
  },

  createBody(data) {
    const bodies = read(BODIES_KEY)
    const record = {
      id: uid('lsgb'),
      officer_id: '',
      project_id: '',
      body_name: '',
      body_type: '',
      sanction_number: '',
      sanction_date: '',
      sanctioned_amount: 0,
      work_order_number: '',
      agreement_date: '',
      validity_period: '',
      office_address: '',
      contact_person: '',
      contact_role: '',
      contact_phone: '',
      ...data,
      created_at: now(),
      updated_at: now(),
    }
    bodies.push(record)
    write(BODIES_KEY, bodies)
    return record
  },

  updateBody(id, data) {
    const bodies = read(BODIES_KEY)
    const idx = bodies.findIndex((b) => b.id === id)
    if (idx === -1) throw new Error('LSGB body not found')
    bodies[idx] = { ...bodies[idx], ...data, updated_at: now() }
    write(BODIES_KEY, bodies)
    return bodies[idx]
  },

  removeBody(id) {
    write(BODIES_KEY, read(BODIES_KEY).filter((b) => b.id !== id))
    write(FUNDS_KEY, read(FUNDS_KEY).filter((f) => f.lsgb_body_id !== id))
  },

  // ── Fund Withdrawals ──────────────────────────────────────────────────────────

  listWithdrawals(filters = {}) {
    let items = read(FUNDS_KEY)
    if (filters.lsgb_body_id) items = items.filter((f) => f.lsgb_body_id === filters.lsgb_body_id)
    if (filters.officer_id) items = items.filter((f) => f.officer_id === filters.officer_id)
    if (filters.purpose) items = items.filter((f) => f.purpose === filters.purpose)
    return items.sort((a, b) => new Date(b.withdrawal_date) - new Date(a.withdrawal_date))
  },

  addWithdrawal(data) {
    const items = read(FUNDS_KEY)
    const record = {
      id: uid('lfw'),
      lsgb_body_id: '',
      lsgb_body_name: '',
      officer_id: '',
      project_id: '',
      amount: 0,
      withdrawal_date: now().slice(0, 10),
      purpose: 'Core Expenses',
      description: '',
      ...data,
      created_at: now(),
    }
    items.push(record)
    write(FUNDS_KEY, items)
    return record
  },

  updateWithdrawal(id, data) {
    const items = read(FUNDS_KEY)
    const idx = items.findIndex((f) => f.id === id)
    if (idx === -1) throw new Error('Withdrawal not found')
    items[idx] = { ...items[idx], ...data }
    write(FUNDS_KEY, items)
    return items[idx]
  },

  removeWithdrawal(id) {
    write(FUNDS_KEY, read(FUNDS_KEY).filter((f) => f.id !== id))
  },

  // ── Summary ───────────────────────────────────────────────────────────────────

  getSummary() {
    const bodies = read(BODIES_KEY)
    const withdrawals = read(FUNDS_KEY)
    const totalSanctioned = bodies.reduce((s, b) => s + (parseFloat(b.sanctioned_amount) || 0), 0)
    const totalWithdrawn = withdrawals.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0)
    const byPurpose = {}
    withdrawals.forEach((f) => {
      byPurpose[f.purpose] = (byPurpose[f.purpose] || 0) + (parseFloat(f.amount) || 0)
    })
    const byBody = {}
    withdrawals.forEach((f) => {
      if (!byBody[f.lsgb_body_id]) byBody[f.lsgb_body_id] = { name: f.lsgb_body_name, total: 0 }
      byBody[f.lsgb_body_id].total += parseFloat(f.amount) || 0
    })
    return {
      totalBodies: bodies.length,
      totalSanctioned,
      totalWithdrawn,
      remaining: totalSanctioned - totalWithdrawn,
      byPurpose,
      byBody,
    }
  },
}
