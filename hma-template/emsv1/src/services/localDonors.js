const KEY = 'hma_donor_records'

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
const write = (data) => localStorage.setItem(KEY, JSON.stringify(data))
const uid = () => `donor_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const now = () => new Date().toISOString()

export const localDonors = {
  list(filters = {}) {
    let items = read()
    if (filters.agency) {
      const q = filters.agency.toLowerCase()
      items = items.filter((d) => d.funding_agency?.toLowerCase().includes(q))
    }
    if (filters.year) items = items.filter((d) => String(d.year) === String(filters.year))
    if (filters.location) {
      const q = filters.location.toLowerCase()
      items = items.filter((d) => d.location?.toLowerCase().includes(q))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      items = items.filter(
        (d) =>
          d.funding_agency?.toLowerCase().includes(q) ||
          d.project_name?.toLowerCase().includes(q) ||
          d.location?.toLowerCase().includes(q),
      )
    }
    // Sort: by year desc, then agency name
    return items.sort((a, b) => b.year - a.year || a.funding_agency?.localeCompare(b.funding_agency))
  },

  get(id) {
    return read().find((d) => d.id === id) || null
  },

  create(data) {
    const items = read()
    const record = {
      id: uid(),
      funding_agency: '',
      location: '',
      project_id: '',
      project_name: '',
      num_beneficiaries: 0,
      project_value: 0,
      year: new Date().getFullYear(),
      notes: '',
      ...data,
      created_at: now(),
      updated_at: now(),
    }
    items.push(record)
    write(items)
    return record
  },

  update(id, data) {
    const items = read()
    const idx = items.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error('Donor record not found')
    items[idx] = { ...items[idx], ...data, updated_at: now() }
    write(items)
    return items[idx]
  },

  remove(id) {
    write(read().filter((d) => d.id !== id))
  },

  // Unique agencies for filter dropdowns / grouping
  getAgencies() {
    const seen = new Set()
    return read()
      .map((d) => d.funding_agency)
      .filter((a) => a && !seen.has(a) && seen.add(a))
      .sort()
  },

  getYears() {
    const seen = new Set()
    return read()
      .map((d) => d.year)
      .filter((y) => y && !seen.has(y) && seen.add(y))
      .sort((a, b) => b - a)
  },

  // Group all records by funding agency
  groupByAgency() {
    const groups = {}
    read().forEach((d) => {
      const key = d.funding_agency || 'Unknown'
      if (!groups[key]) groups[key] = { name: key, records: [], totalValue: 0, totalBeneficiaries: 0 }
      groups[key].records.push(d)
      groups[key].totalValue += parseFloat(d.project_value) || 0
      groups[key].totalBeneficiaries += parseInt(d.num_beneficiaries) || 0
    })
    return Object.values(groups).sort((a, b) => b.totalValue - a.totalValue)
  },

  getSummary() {
    const items = read()
    const agencies = new Set(items.map((d) => d.funding_agency).filter(Boolean))
    return {
      total: items.length,
      uniqueAgencies: agencies.size,
      totalFunds: items.reduce((s, d) => s + (parseFloat(d.project_value) || 0), 0),
      totalBeneficiaries: items.reduce((s, d) => s + (parseInt(d.num_beneficiaries) || 0), 0),
    }
  },
}
