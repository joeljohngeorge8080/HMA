// localStorage-based project store for Project Officer project management.

const KEY = 'hma_projects'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const now = () => new Date().toISOString()

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

const writeAll = (rows) => {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

export const PROJECT_PHASE = {
  PIPELINE: 'pipeline',
  APPROVED: 'approved',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
}

export const PHASE_CONFIG = {
  pipeline: { label: 'Pipeline', color: 'secondary' },
  approved: { label: 'Approved', color: 'info' },
  ongoing: { label: 'Ongoing', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
}

export const localProjects = {
  // ── list ────────────────────────────────────────────────────────────────────
  list({ search = '', phase = '', officerId = '', page = 1, pageSize = 50 } = {}) {
    let rows = readAll()

    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.funding_agency?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q),
      )
    }
    if (phase) rows = rows.filter((p) => p.phase === phase)
    if (officerId) rows = rows.filter((p) => p.assigned_officer_id === officerId)

    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const total = rows.length
    const total_pages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    return { items: rows.slice(start, start + pageSize), total, total_pages }
  },

  // ── getById ─────────────────────────────────────────────────────────────────
  getById(id) {
    return readAll().find((p) => p.id === id) || null
  },

  // ── getByOfficer ────────────────────────────────────────────────────────────
  getByOfficer(officerId) {
    return readAll()
      .filter((p) => p.assigned_officer_id === officerId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },

  // ── getByPersonnelEmail ──────────────────────────────────────────────────────
  // Returns all projects where the given email is a member of field_personnel.
  // Used by Field Personnel to discover their assigned projects and team tasks.
  getByPersonnelEmail(email) {
    if (!email) return []
    return readAll()
      .filter((p) => p.field_personnel?.some((fp) => fp.email === email))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },

  // ── create ──────────────────────────────────────────────────────────────────
  create(data) {
    const rows = readAll()
    const ts = now()

    const project = {
      id: uid(),
      title: data.title || 'Untitled Project',
      phase: data.phase || PROJECT_PHASE.PIPELINE,
      funding_agency: data.funding_agency || '',
      implementing_partner: data.implementing_partner || '',
      location: data.location || '',
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      project_valuation: parseFloat(data.project_valuation) || 0,
      amount_sanctioned: parseFloat(data.amount_sanctioned) || 0,
      amount_released: parseFloat(data.amount_released) || 0,
      amount_utilized: parseFloat(data.amount_utilized) || 0,
      assigned_officer_id: data.assigned_officer_id || 'po_001',
      field_personnel: [],
      created_at: ts,
      updated_at: ts,
    }

    writeAll([...rows, project])
    return project
  },

  // ── update ──────────────────────────────────────────────────────────────────
  update(id, data) {
    const rows = readAll()
    const idx = rows.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Project not found')

    rows[idx] = {
      ...rows[idx],
      ...data,
      id: rows[idx].id,
      updated_at: now(),
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── invitePersonnel ──────────────────────────────────────────────────────────
  // Simulates sending an email invitation. Records the invite in the project.
  invitePersonnel(projectId, { name, email }) {
    const rows = readAll()
    const idx = rows.findIndex((p) => p.id === projectId)
    if (idx === -1) throw new Error('Project not found')

    // Avoid duplicates
    const alreadyInvited = rows[idx].field_personnel?.find((fp) => fp.email === email)
    if (alreadyInvited) throw new Error(`${email} has already been invited to this project.`)

    rows[idx].field_personnel = [
      ...(rows[idx].field_personnel || []),
      {
        name: name || email.split('@')[0],
        email,
        status: 'invited',
        invited_at: now(),
      },
    ]
    rows[idx].updated_at = now()

    writeAll(rows)
    return rows[idx]
  },

  // ── removePersonnel ──────────────────────────────────────────────────────────
  removePersonnel(projectId, email) {
    const rows = readAll()
    const idx = rows.findIndex((p) => p.id === projectId)
    if (idx === -1) throw new Error('Project not found')

    rows[idx].field_personnel = rows[idx].field_personnel.filter((fp) => fp.email !== email)
    rows[idx].updated_at = now()

    writeAll(rows)
    return rows[idx]
  },

  // ── seed demo data ──────────────────────────────────────────────────────────
  seedDemoData() {
    if (readAll().length > 0) return

    const demoProjects = [
      {
        title: 'Medical College Construction — Phase 2',
        phase: 'ongoing',
        funding_agency: 'Ministry of Health & Family Welfare',
        implementing_partner: 'HLL Lifecare Limited',
        location: 'Thiruvananthapuram, Kerala',
        start_date: '2025-04-01',
        end_date: '2026-12-31',
        project_valuation: 45000000,
        amount_sanctioned: 45000000,
        amount_released: 22000000,
        amount_utilized: 18500000,
        assigned_officer_id: 'po_001',
        field_personnel: [
          { name: 'Rajesh Kumar', email: 'rajesh.kumar@hll.in', status: 'active', invited_at: '2025-04-05T09:00:00Z' },
          { name: 'Vikram Patel', email: 'vikram.patel@hll.in', status: 'active', invited_at: '2025-04-06T10:00:00Z' },
        ],
      },
      {
        title: 'Highway Expansion Phase 2',
        phase: 'approved',
        funding_agency: 'National Highway Authority of India',
        implementing_partner: 'State PWD',
        location: 'Kozhikode, Kerala',
        start_date: '2026-01-15',
        end_date: '2027-06-30',
        project_valuation: 78000000,
        amount_sanctioned: 78000000,
        amount_released: 10000000,
        amount_utilized: 4200000,
        assigned_officer_id: 'po_001',
        field_personnel: [
          { name: 'Anita Sharma', email: 'anita.sharma@hll.in', status: 'active', invited_at: '2026-01-20T11:00:00Z' },
          { name: 'Suresh Reddy', email: 'suresh.reddy@hll.in', status: 'active', invited_at: '2026-01-21T09:00:00Z' },
        ],
      },
      {
        title: 'City Hospital Renovation',
        phase: 'pipeline',
        funding_agency: 'State Health Mission',
        implementing_partner: 'District Medical Office',
        location: 'Ernakulam, Kerala',
        start_date: '',
        end_date: '2027-03-31',
        project_valuation: 15000000,
        amount_sanctioned: 0,
        amount_released: 0,
        amount_utilized: 0,
        assigned_officer_id: 'po_001',
        field_personnel: [],
      },
    ]

    demoProjects.forEach((p) => this.create(p))
  },
}
