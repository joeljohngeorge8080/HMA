/**
 * localProjects.js — Local-storage backed mock service for Projects & Project Officers.
 * Merged version supporting both Project Associate and Project Officer flows.
 *
 * Seed data sourced from: /docs/Projects sdp .csv
 */
import { SDP_PROJECTS } from './sdpProjectsData'

const PROJECTS_KEY = 'hma_projects_v11'   // bumped → forces reseed with CSV data
const OFFICERS_KEY = 'hma_project_officers_v6'

// ─── Utilities ────────────────────────────────────────────────────────────────

const uid = () => `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
const offUid = () => `po_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
const now = () => new Date().toISOString()

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

const write = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data))
}

/** Broadcast a DOM event so any mounted component can react immediately */
const notify = () => {
  window.dispatchEvent(new CustomEvent('hma_projects_changed'))
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
  implementation: { label: 'Implementation', color: 'primary' },
  design: { label: 'Design', color: 'info' },
}

// ─── Seed Officers — derived from real project officer names in the CSV ────────

const DEMO_OFFICERS = [
  { id: 'po_csv_01', name: 'Dr. Arjuna V Nath',  email: 'arjuna.nath@hma.org',    phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_01'],             created_at: '2026-01-01T00:00:00Z' },
  { id: 'po_csv_02', name: 'Syamili.M',           email: 'syamili.m@hma.org',       phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_02','sdp_05','sdp_16','sdp_17'], created_at: '2026-01-01T00:00:00Z' },
  { id: 'po_csv_03', name: 'Shone Kiran K.S.',    email: 'shone.kiran@hma.org',     phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_03'],             created_at: '2026-01-01T00:00:00Z' },
  { id: 'po_csv_04', name: 'Anjali A.S.',          email: 'anjali.as@hma.org',       phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_04','sdp_14'],    created_at: '2026-01-01T00:00:00Z' },
  { id: 'po_csv_05', name: 'K Anakha Soman',       email: 'anakha.soman@hma.org',    phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_06'],             created_at: '2026-01-01T00:00:00Z' },
  { id: 'po_csv_06', name: 'Dr. Bhavya RJ',        email: 'bhavya.rj@hma.org',       phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_07'],             created_at: '2026-01-01T00:00:00Z' },
  { id: 'po_csv_07', name: 'Rejitha Ravi',          email: 'rejitha.ravi@hma.org',    phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_08','sdp_09'],    created_at: '2026-01-01T00:00:00Z' },
  { id: 'po_csv_08', name: 'Rakhi Mohan',           email: 'rakhi.mohan@hma.org',     phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_10','sdp_11'],    created_at: '2026-01-01T00:00:00Z' },
  { id: 'po_csv_09', name: 'Swathy Krishna',        email: 'swathy.krishna@hma.org',  phone: '', designation: 'Project Officer', status: 'active', projects_assigned: ['sdp_12','sdp_13'],   created_at: '2026-01-01T00:00:00Z' },
]

/** Map officer name → officer id for quick lookup */
const OFFICER_BY_NAME = Object.fromEntries(
  DEMO_OFFICERS.map(o => [o.name.trim().toLowerCase(), o])
)

/** Resolve the phase string from CSV phases array */
const resolvePhase = (phases = [], csvStatus) => {
  const lower = (csvStatus || '').toLowerCase()
  if (lower === 'completed') return 'completed'
  if (lower === 'approved')  return 'approved'
  // find the active phase
  const activePhase = phases.find(ph => (ph.status || '').toLowerCase() === 'ongoing')
  if (activePhase) {
    const phLower = (activePhase.phase || '').toLowerCase()
    if (phLower.includes('design') || phLower.includes('initiation')) return 'design_and_initiation'
    if (phLower.includes('implement'))  return 'implementation'
    if (phLower.includes('monitoring')) return 'monitoring_and_evaluation'
  }
  return 'implementation'
}

/** Helper to parse CSV dates like 15/04/2025 or 10.03.2026 into YYYY-MM-DD */
const parseSdpDate = (dateStr) => {
  if (!dateStr) return ''
  const str = String(dateStr).trim()
  const match = str.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/)
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  }
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  return str
}

/**
 * Map a CSV SDP project record → the full localProjects schema.
 * This is the single source of truth for the PMS All Projects page.
 */
const mapSdpToLocal = (p) => {
  const officerNameKey = (p.project_officer || '').trim().toLowerCase()
  const officer = OFFICER_BY_NAME[officerNameKey] || null
  const statusLower = (p.status || 'Ongoing').toLowerCase()

  // Map CSV installments → localProjects installment schema
  const installments = (p.installments || []).map((inst, idx) => ({
    id: `inst_${p.id}_${idx + 1}`,
    label: inst.label || `Installment ${idx + 1}`,
    percentage: p.value > 0 ? Math.round((inst.amount / p.value) * 100) : 0,
    amount: inst.amount || 0,
    phase_name: inst.label || `Phase ${idx + 1}`,
    start_date: parseSdpDate(p.start_date),
    end_date: parseSdpDate(inst.uc_date || p.end_date),
    target_date: parseSdpDate(inst.uc_date),
    actual_date: inst.status === 'Received' ? parseSdpDate(inst.uc_date || now()) : null,
    uc_status: inst.uc_status || (inst.status === 'Received' ? 'Submitted' : 'Pending'),
  }))

  // Map CSV phases → milestones array
  const milestones = (p.phases || []).map((ph, idx) => ({
    id: `ms_${p.id}_${idx + 1}`,
    title: ph.phase || `Phase ${idx + 1}`,
    amount: 0,
    target_date: parseSdpDate(ph.pending_date),
    actual_date: (ph.status || '').toLowerCase() === 'completed' ? parseSdpDate(ph.pending_date) : null,
    uc_status: (ph.status || '').toLowerCase() === 'completed' ? 'Approved'
               : (ph.status || '').toLowerCase() === 'ongoing'  ? 'Submitted' : 'Pending',
  }))

  // Build risks from phase risk fields
  const risks = (p.phases || [])
    .filter(ph => ph.risk)
    .map((ph, idx) => ({
      id: `r_${p.id}_${idx + 1}`,
      title: ph.risk,
      severity: 'Medium',
      status: 'Open',
    }))

  // Amount received = sum of received installments
  const amountReceived = (p.installments || [])
    .filter(i => i.status === 'Received')
    .reduce((s, i) => s + (i.amount || 0), 0)

  return {
    id: p.id,
    project_code: p.project_number || '',
    project_type: p.type,
    name: p.name,
    title: p.name,
    description: p.components || '',
    funding_agency: p.funding_agency,
    implementing_partner: p.implementing_partner,
    location: p.location,
    district: (p.location || '').split(',')[0].trim(),
    status: statusLower === 'ongoing' ? 'ongoing' : statusLower === 'approved' ? 'approved' : statusLower === 'completed' ? 'completed' : 'pipeline',
    phase: resolvePhase(p.phases, p.status),
    project_value: p.value,
    project_valuation: p.value,
    amount_received: amountReceived,
    amount_sanctioned: p.value,
    amount_released: amountReceived,
    amount_spent: p.expense_accounted || 0,
    amount_utilized: p.expense_accounted || 0,
    expense_accounted: p.expense_accounted || 0,
    committed_expense: p.committed_expense || 0,
    start_date: parseSdpDate(p.start_date),
    end_date: parseSdpDate(p.end_date),
    duration: p.duration || '',
    beneficiaries_target: p.beneficiaries_target || 0,
    beneficiaries_completed: p.beneficiaries_completed || 0,
    officer_id: officer ? officer.id : null,
    assigned_officer_id: officer ? officer.id : null,
    officer_name: p.project_officer || null,
    officer_email: officer ? officer.email : null,
    email_sent: !!p.project_officer,
    field_personnel: p.field_team
      ? p.field_team.split(',').map(name => ({ name: name.trim(), email: '', status: 'active', invited_at: now() })).filter(fp => fp.name)
      : [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: now(),
    is_operations_active: statusLower === 'ongoing' || statusLower === 'completed',
    operations_activated_at: statusLower === 'ongoing' ? p.start_date || now() : null,
    tasks_count: (p.phases || []).length,
    tasks_completed: (p.phases || []).filter(ph => (ph.status || '').toLowerCase() === 'completed').length,
    pending_approvals: statusLower === 'approved' ? 1 : 0,
    milestones,
    installments,
    risks,
    core_pct: 5,
    hr_pct: 5,
    admin_pct: 5,
    hr_expenses: [],
    admin_expenses: [],
    remarks: p.remarks || '',
    components: p.components || '',
  }
}

/** All 17 CSV projects mapped to the localProjects schema */
const DEMO_PROJECTS = SDP_PROJECTS.map(mapSdpToLocal)


export const localProjects = {
  seedDemoData() {
    // Always seed projects from CSV data (key v10 forces fresh reseed on upgrade)
    if (!localStorage.getItem(PROJECTS_KEY)) {
      write(PROJECTS_KEY, DEMO_PROJECTS)
    }
    if (!localStorage.getItem(OFFICERS_KEY)) {
      write(OFFICERS_KEY, DEMO_OFFICERS)
    }
  },


  list({ search = '', status = '', phase = '', officerId = '', page = 1, pageSize = 50 } = {}) {
    let items = read(PROJECTS_KEY)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (p) =>
          (p.name || p.title)?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.officer_name?.toLowerCase().includes(q) ||
          p.funding_agency?.toLowerCase().includes(q),
      )
    }
    if (status) items = items.filter((p) => p.status === status)
    if (phase) items = items.filter((p) => p.phase === phase)
    if (officerId)
      items = items.filter((p) => p.officer_id === officerId || p.assigned_officer_id === officerId)

    items = [...items].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    const total = items.length
    const total_pages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, total_pages }
  },

  getById(id) {
    return read(PROJECTS_KEY).find((p) => p.id === id) || null
  },

  getByOfficer(officerId) {
    return read(PROJECTS_KEY)
      .filter((p) => p.officer_id === officerId || p.assigned_officer_id === officerId)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  },

  getByPersonnelEmail(email) {
    if (!email) return []
    return read(PROJECTS_KEY)
      .filter((p) => p.field_personnel?.some((fp) => fp.email === email))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  },

  create(data) {
    const projects = read(PROJECTS_KEY)
    const newProject = {
      id: uid(),
      ...data,
      title: data.title || data.name || 'Untitled Project',
      name: data.name || data.title || 'Untitled Project',
      status: data.status || 'pipeline',
      phase: data.phase || 'pipeline',
      project_value: parseFloat(data.project_valuation || data.project_value) || 0,
      project_valuation: parseFloat(data.project_valuation || data.project_value) || 0,
      amount_sanctioned: parseFloat(data.amount_sanctioned) || 0,
      amount_received: parseFloat(data.amount_received || data.amount_released) || 0,
      amount_released: parseFloat(data.amount_received || data.amount_released) || 0,
      amount_spent: parseFloat(data.amount_spent || data.amount_utilized) || 0,
      amount_utilized: parseFloat(data.amount_spent || data.amount_utilized) || 0,
      expense_accounted: parseFloat(data.expense_accounted) || 0,
      committed_expense: parseFloat(data.committed_expense) || 0,
      beneficiaries_completed: data.beneficiaries_completed || 0,
      assigned_officer_id: data.assigned_officer_id || data.officer_id || null,
      officer_id: data.assigned_officer_id || data.officer_id || null,
      field_personnel: [],
      tasks_count: 0,
      tasks_completed: 0,
      pending_approvals: 0,
      email_sent: false,
      is_operations_active: false,
      operations_activated_at: null,
      core_pct: 5,
      hr_pct: 5,
      admin_pct: 5,
      hr_expenses: [],
      admin_expenses: [],
      milestones: data.milestones || [],
      installments: (data.installments || []).map((inst, idx) => ({
        id: inst.id || `inst_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        label: inst.label || `Installment ${idx + 1}`,
        percentage: parseFloat(inst.percentage) || 0,
        amount: parseFloat(inst.amount) || 0,
        phase_name: inst.phase_name || `Phase ${idx + 1}`,
        start_date: inst.start_date || '',
        end_date: inst.end_date || inst.target_date || '',
        target_date: inst.end_date || inst.target_date || '',
        actual_date: inst.actual_date || null,
        uc_status: inst.uc_status || 'Pending',
      })),
      risks: [],
      created_at: now(),
      updated_at: now(),
    }
    projects.unshift(newProject)
    write(PROJECTS_KEY, projects)
    notify()
    return newProject
  },

  update(id, data) {
    const projects = read(PROJECTS_KEY)
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Project not found')
    projects[idx] = { ...projects[idx], ...data, updated_at: now() }
    write(PROJECTS_KEY, projects)
    notify()
    return projects[idx]
  },

  activateProject(id) {
    const projects = read(PROJECTS_KEY)
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Project not found')
    projects[idx].is_operations_active = true
    projects[idx].operations_activated_at = now()
    if (projects[idx].status === 'pipeline' || projects[idx].status === 'approved') {
      projects[idx].status = 'ongoing'
      projects[idx].phase = 'implementation'
    }
    projects[idx].updated_at = now()
    write(PROJECTS_KEY, projects)
    notify()
    return projects[idx]
  },

  // ── Installment Management ─────────────────────────────────────────────────

  updateInstallment(projectId, installmentId, data) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const inst = projects[pIdx].installments || []
    const iIdx = inst.findIndex((i) => i.id === installmentId)
    if (iIdx === -1) throw new Error('Installment not found')
    const merged = { ...inst[iIdx], ...data }
    projects[pIdx].installments[iIdx] = merged
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  addExpense(projectId, pool, expense) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const key = pool === 'hr' ? 'hr_expenses' : 'admin_expenses'
    const newExp = {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ...expense,
      created_at: now(),
    }
    projects[pIdx][key] = [...(projects[pIdx][key] || []), newExp]
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  removeExpense(projectId, pool, expenseId) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const key = pool === 'hr' ? 'hr_expenses' : 'admin_expenses'
    projects[pIdx][key] = (projects[pIdx][key] || []).filter((e) => e.id !== expenseId)
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  updateExpense(projectId, pool, expenseId, data) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const key = pool === 'hr' ? 'hr_expenses' : 'admin_expenses'
    projects[pIdx][key] = (projects[pIdx][key] || []).map((e) =>
      e.id === expenseId ? { ...e, ...data } : e,
    )
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  assignOfficer(projectId, officerId) {
    const projects = read(PROJECTS_KEY)
    const officers = read(OFFICERS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const officer = officers.find((o) => o.id === officerId)
    if (!officer) throw new Error('Officer not found')

    // Remove project from previous officer
    const prevOfficerId = projects[pIdx].officer_id
    if (prevOfficerId && prevOfficerId !== officerId) {
      const prevOIdx = officers.findIndex((o) => o.id === prevOfficerId)
      if (prevOIdx !== -1) {
        officers[prevOIdx].projects_assigned = officers[prevOIdx].projects_assigned.filter(
          (pid) => pid !== projectId,
        )
      }
    }

    // Assign to new officer
    projects[pIdx].officer_id = officerId
    projects[pIdx].assigned_officer_id = officerId
    projects[pIdx].officer_name = officer.name
    projects[pIdx].officer_email = officer.email
    projects[pIdx].email_sent = true // simulate SES
    projects[pIdx].updated_at = now()

    // Add project to officer's list
    if (!officers.find((o) => o.id === officerId).projects_assigned.includes(projectId)) {
      officers.find((o) => o.id === officerId).projects_assigned.push(projectId)
    }

    write(PROJECTS_KEY, projects)
    write(OFFICERS_KEY, officers)
    notify()
    return projects[pIdx]
  },

  invitePersonnel(projectId, { name, email }) {
    const rows = read(PROJECTS_KEY)
    const idx = rows.findIndex((p) => p.id === projectId)
    if (idx === -1) throw new Error('Project not found')

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

    write(PROJECTS_KEY, rows)
    notify()
    return rows[idx]
  },

  removePersonnel(projectId, email) {
    const rows = read(PROJECTS_KEY)
    const idx = rows.findIndex((p) => p.id === projectId)
    if (idx === -1) throw new Error('Project not found')

    rows[idx].field_personnel = (rows[idx].field_personnel || []).filter((fp) => fp.email !== email)
    rows[idx].updated_at = now()

    write(PROJECTS_KEY, rows)
    notify()
    return rows[idx]
  },

  getStats() {
    const items = read(PROJECTS_KEY)
    const totalValue = items.reduce((s, p) => s + (p.project_value || p.project_valuation || 0), 0)
    const totalReceived = items.reduce(
      (s, p) => s + (p.amount_received || p.amount_released || 0),
      0,
    )
    const totalSpent = items.reduce((s, p) => s + (p.amount_spent || p.amount_utilized || 0), 0)
    return {
      total: items.length,
      active: items.filter((p) => p.status === 'active' || p.status === 'ongoing').length,
      ongoing: items.filter((p) => p.status === 'ongoing').length,
      approved: items.filter((p) => p.status === 'approved').length,
      pipeline: items.filter((p) => p.status === 'pipeline').length,
      completed: items.filter((p) => p.status === 'completed').length,
      pendingApprovals: items.reduce((s, p) => s + (p.pending_approvals || 0), 0),
      totalValue,
      totalReceived,
      totalSpent,
      types: {
        consultancy: items.filter((p) => p.project_type === 'Consultancy').length,
        health: items.filter((p) => p.project_type === 'Other Public Health').length,
        mcup: items.filter((p) => p.project_type === 'M-CUP').length,
      },
    }
  },
}

// ─── Project Officers API ──────────────────────────────────────────────────────

export const localOfficers = {
  list({ search = '', status = '' } = {}) {
    let items = read(OFFICERS_KEY)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.designation?.toLowerCase().includes(q),
      )
    }
    if (status) items = items.filter((o) => o.status === status)
    return { items, total: items.length }
  },

  getById(id) {
    return read(OFFICERS_KEY).find((o) => o.id === id) || null
  },

  create(data) {
    const officers = read(OFFICERS_KEY)
    const newOfficer = {
      id: offUid(),
      ...data,
      status: 'active',
      projects_assigned: [],
      created_at: now(),
    }
    officers.push(newOfficer)
    write(OFFICERS_KEY, officers)
    return newOfficer
  },

  update(id, data) {
    const officers = read(OFFICERS_KEY)
    const idx = officers.findIndex((o) => o.id === id)
    if (idx === -1) throw new Error('Officer not found')
    officers[idx] = { ...officers[idx], ...data }
    write(OFFICERS_KEY, officers)
    return officers[idx]
  },

  getAvailable() {
    return read(OFFICERS_KEY).filter((o) => o.status === 'active')
  },

  getProjectsForOfficer(officerId) {
    const officer = read(OFFICERS_KEY).find((o) => o.id === officerId)
    if (!officer) return []
    return read(PROJECTS_KEY).filter((p) => officer.projects_assigned.includes(p.id))
  },
}
