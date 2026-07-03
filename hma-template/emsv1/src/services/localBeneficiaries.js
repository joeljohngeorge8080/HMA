const KEY = 'hma_beneficiaries'

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

export const localBeneficiaries = {
  list({ search = '' } = {}) {
    let rows = read()
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.place_ward || '').toLowerCase().includes(q) ||
          (r.address || '').toLowerCase().includes(q) ||
          (r.occupation || '').toLowerCase().includes(q),
      )
    }
    return rows
  },

  get(id) {
    const row = read().find((r) => r.id === id)
    if (!row) throw new Error('Beneficiary not found')
    return row
  },

  create(data) {
    const rows = read()
    const next = { ...data, id: uid(), follow_ups: [] }
    write([...rows, next])
    return next
  },

  update(id, data) {
    const rows = read()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Beneficiary not found')
    rows[idx] = { ...rows[idx], ...data }
    write(rows)
    return rows[idx]
  },

  remove(id) {
    write(read().filter((r) => r.id !== id))
  },

  addFollowUp(id, followUp) {
    const rows = read()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Beneficiary not found')
    const existing = rows[idx].follow_ups || []
    rows[idx] = {
      ...rows[idx],
      follow_ups: [...existing, { id: uid(), date: new Date().toISOString(), ...followUp }],
    }
    write(rows)
    return rows[idx]
  },

  toggleFollowUp(beneficiaryId, followUpId) {
    const rows = read()
    const idx = rows.findIndex((r) => r.id === beneficiaryId)
    if (idx === -1) throw new Error('Beneficiary not found')
    rows[idx] = {
      ...rows[idx],
      follow_ups: (rows[idx].follow_ups || []).map((f) =>
        f.id === followUpId ? { ...f, completed: !f.completed } : f,
      ),
    }
    write(rows)
    return rows[idx]
  },
}
