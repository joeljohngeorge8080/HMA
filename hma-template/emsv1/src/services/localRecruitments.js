const KEY = 'hma_recruitments'

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

export const localRecruitments = {
  list({ search = '', status = '', payment_status = '', activity_type = '' } = {}) {
    let rows = read()
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.candidate_name.toLowerCase().includes(q) ||
          (r.position || '').toLowerCase().includes(q) ||
          (r.department || '').toLowerCase().includes(q),
      )
    }
    if (status) rows = rows.filter((r) => r.status === status)
    if (payment_status) rows = rows.filter((r) => r.payment_status === payment_status)
    if (activity_type) {
      rows = rows.filter((r) =>
        activity_type === 'recruitment'
          ? (r.activity_type || 'recruitment') === 'recruitment'
          : r.activity_type === activity_type,
      )
    }
    return rows
  },

  get(id) {
    const row = read().find((r) => r.id === id)
    if (!row) throw new Error('Recruitment not found')
    return row
  },

  create(data) {
    const rows = read()
    const ts = new Date().toISOString()
    const row = {
      id: uid(),
      activity_type: data.activity_type === 'training' ? 'training' : 'recruitment',
      candidate_name: data.candidate_name.trim(),
      position: data.position?.trim() || null,
      department: data.department?.trim() || null,
      date_applied: data.date_applied || null,
      interview_date: data.interview_date || null,
      status: data.status || 'Applied',
      amount_received: parseFloat(data.amount_received) || 0,
      payment_status: data.payment_status || 'Pending',
      remarks: data.remarks?.trim() || null,
      created_at: ts,
      updated_at: ts,
    }
    write([...rows, row])
    return row
  },

  update(id, patch) {
    const rows = read()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Recruitment not found')
    rows[idx] = {
      ...rows[idx],
      ...patch,
      amount_received: parseFloat(patch.amount_received ?? rows[idx].amount_received) || 0,
      updated_at: new Date().toISOString(),
    }
    write(rows)
    return rows[idx]
  },

  delete(id) {
    const rows = read()
    if (!rows.find((r) => r.id === id)) throw new Error('Recruitment not found')
    write(rows.filter((r) => r.id !== id))
  },
}
