/**
 * localProjects.js — Local-storage backed mock service for Projects & Project Officers.
 * Merged version supporting both Project Associate and Project Officer flows.
 */

const PROJECTS_KEY = 'hma_projects_v9'
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

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const DEMO_OFFICERS = [
  {
    id: 'po_001',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@hma.org',
    phone: '+91-98765-43210',
    designation: 'Senior Project Officer',
    status: 'active',
    projects_assigned: ['proj_001', 'proj_003'],
    created_at: '2024-01-10T09:00:00Z',
  },
  {
    id: 'po_002',
    name: 'Priya Nair',
    email: 'priya.nair@hma.org',
    phone: '+91-98765-12345',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['proj_002'],
    created_at: '2024-02-15T10:00:00Z',
  },
]

const DEMO_PROJECTS = [
  {
    id: 'proj_001',
    project_code: 'RWS-W-001',
    project_type: 'Other Public Health',
    name: 'Rural Water Supply Scheme — Wayanad',
    title: 'Rural Water Supply Scheme — Wayanad',
    description: 'Installation of drinking water pipelines and storage tanks across 12 tribal villages in Wayanad district.',
    funding_agency: 'NABARD',
    implementing_partner: 'Kerala Water Authority',
    location: 'Wayanad, Kerala',
    district: 'Wayanad',
    status: 'ongoing',
    phase: 'implementation',
    project_value: 4500000,
    project_valuation: 4500000,
    amount_received: 2800000,
    amount_sanctioned: 4500000,
    amount_released: 2800000,
    amount_spent: 1950000,
    amount_utilized: 1950000,
    expense_accounted: 1950000,
    committed_expense: 380000,
    start_date: '2024-03-01',
    end_date: '2025-02-28',
    beneficiaries_target: 12000,
    beneficiaries_completed: 12000,
    officer_id: 'po_001',
    assigned_officer_id: 'po_001',
    officer_name: 'Arjun Sharma',
    officer_email: 'arjun.sharma@hma.org',
    email_sent: true,
    field_personnel: [
      { name: 'Rajesh Kumar', email: 'rajesh.kumar@hll.in', status: 'active', invited_at: '2025-04-05T09:00:00Z' },
    ],
    created_at: '2024-02-20T09:00:00Z',
    updated_at: '2024-12-10T14:30:00Z',
    is_operations_active: true,
    operations_activated_at: '2024-03-01T09:00:00Z',
    tasks_count: 8,
    tasks_completed: 5,
    pending_approvals: 2,
    milestones: [
      { id: 'ms_1', title: 'Installment 1 (25%)', amount: 1125000, target_date: '2024-04-15', actual_date: '2024-04-10', uc_status: 'Approved' },
      { id: 'ms_2', title: 'Installment 2 (50%)', amount: 2250000, target_date: '2024-09-15', actual_date: '2024-09-20', uc_status: 'Submitted' },
      { id: 'ms_3', title: 'Installment 3 (25%)', amount: 1125000, target_date: '2025-02-15', actual_date: null, uc_status: 'Pending' },
    ],
    core_pct: 5,
    hr_pct: 5,
    admin_pct: 5,
    hr_expenses: [],
    admin_expenses: [
      { id: 'adm_1', label: 'Electricity Bill', amount: 4500, date: '2024-02-05', notes: 'Jan-Feb', is_recurring: true, recurring_type: 'electricity' },
      { id: 'adm_2', label: 'Internet', amount: 1200, date: '2024-02-05', notes: '', is_recurring: true, recurring_type: 'internet' },
    ],
    installments: [
      {
        id: 'inst_1_1', label: 'Installment 1', percentage: 25, amount: 1125000,
        start_date: '2024-03-01', end_date: '2024-05-31', actual_date: '2024-03-20',
        uc_status: 'Approved',
      },
      {
        id: 'inst_1_2', label: 'Installment 2', percentage: 50, amount: 2250000,
        start_date: '2024-06-01', end_date: '2024-10-31', actual_date: '2024-06-25',
        uc_status: 'Submitted',
      },
      {
        id: 'inst_1_3', label: 'Installment 3', percentage: 25, amount: 1125000,
        start_date: '2024-11-01', end_date: '2025-02-28', actual_date: null,
        uc_status: 'Pending',
      },
    ],
    risks: [
      { id: 'r_1', title: 'Delay in land acquisition for storage tanks', severity: 'High', status: 'Open' },
      { id: 'r_2', title: 'Monsoon weather delaying pipeline laying', severity: 'Medium', status: 'Mitigated' }
    ],
  },
  {
    id: 'proj_002',
    project_code: 'SE-I-002',
    project_type: 'Consultancy',
    name: 'Solar Electrification — Idukki Villages',
    title: 'Solar Electrification — Idukki Villages',
    description: 'Solar panel installation and micro-grid setup for 6 remote villages in Idukki to provide 24/7 electricity.',
    funding_agency: 'MNRE',
    implementing_partner: 'KSEB',
    location: 'Idukki, Kerala',
    district: 'Idukki',
    status: 'ongoing',
    phase: 'design',
    project_value: 7200000,
    project_valuation: 7200000,
    amount_received: 3600000,
    amount_sanctioned: 7200000,
    amount_released: 3600000,
    amount_spent: 890000,
    amount_utilized: 890000,
    expense_accounted: 890000,
    committed_expense: 1200000,
    start_date: '2024-06-01',
    end_date: '2025-05-31',
    beneficiaries_target: 6000,
    beneficiaries_completed: 450,
    officer_id: 'po_002',
    assigned_officer_id: 'po_002',
    officer_name: 'Priya Nair',
    officer_email: 'priya.nair@hma.org',
    email_sent: true,
    field_personnel: [],
    created_at: '2024-05-10T10:00:00Z',
    updated_at: '2024-11-25T11:00:00Z',
    is_operations_active: true,
    operations_activated_at: '2024-06-01T10:00:00Z',
    tasks_count: 6,
    tasks_completed: 1,
    pending_approvals: 1,
    milestones: [
      { id: 'ms_1', title: 'Installment 1 (40%)', amount: 2880000, target_date: '2024-07-01', actual_date: '2024-07-05', uc_status: 'Approved' },
      { id: 'ms_2', title: 'Installment 2 (40%)', amount: 2880000, target_date: '2024-11-01', actual_date: null, uc_status: 'Pending' },
      { id: 'ms_3', title: 'Installment 3 (20%)', amount: 1440000, target_date: '2025-04-01', actual_date: null, uc_status: 'Pending' },
    ],
    core_pct: 5,
    hr_pct: 5,
    admin_pct: 5,
    hr_expenses: [],
    admin_expenses: [
      { id: 'adm_4', label: 'Water Bill', amount: 800, date: '2024-07-02', notes: '', is_recurring: true, recurring_type: 'water' },
    ],
    installments: [
      {
        id: 'inst_2_1', label: 'Installment 1', percentage: 40, amount: 2880000,
        start_date: '2024-06-01', end_date: '2024-08-31', actual_date: '2024-07-05',
        uc_status: 'Approved',
      },
      {
        id: 'inst_2_2', label: 'Installment 2', percentage: 40, amount: 2880000,
        start_date: '2024-09-01', end_date: '2024-11-30', actual_date: null,
        uc_status: 'Pending',
      },
      {
        id: 'inst_2_3', label: 'Installment 3', percentage: 20, amount: 1440000,
        start_date: '2024-12-01', end_date: '2025-04-30', actual_date: null,
        uc_status: 'Pending',
      },
    ],
    risks: [
      { id: 'r_1', title: 'Vendor delay in solar panel delivery', severity: 'High', status: 'Open' }
    ],
  },
  {
    id: 'proj_003',
    project_code: 'LTC-M-003',
    project_type: 'M-CUP',
    name: 'Livelihood Training Centre — Malappuram',
    description:
      'Construction and equipping of a vocational training centre for skill development of youth in Malappuram.',
    funding_agency: 'NRLM',
    implementing_partner: 'Kudumbashree',
    location: 'Malappuram, Kerala',
    district: 'Malappuram',
    status: 'ongoing',
    phase: 'implementation',
    project_value: 2800000,
    amount_received: 2800000,
    amount_spent: 2200000,
    amount_utilized: 2200000,
    expense_accounted: 2200000,
    committed_expense: 95000,
    start_date: '2023-09-01',
    end_date: '2024-08-31',
    beneficiaries_target: 500,
    beneficiaries_completed: 300,
    officer_id: 'po_001',
    assigned_officer_id: 'po_001',
    officer_name: 'Arjun Sharma',
    officer_email: 'arjun.sharma@hma.org',
    email_sent: true,
    field_personnel: [],
    created_at: '2023-08-15T08:00:00Z',
    updated_at: '2024-08-01T16:00:00Z',
    is_operations_active: true,
    operations_activated_at: '2023-09-01T08:00:00Z',
    tasks_count: 10,
    tasks_completed: 9,
    pending_approvals: 0,
    milestones: [
      { id: 'ms_1', title: 'Installment 1 (50%)', amount: 1400000, target_date: '2023-10-01', actual_date: '2023-10-05', uc_status: 'Approved' },
      { id: 'ms_2', title: 'Installment 2 (50%)', amount: 1400000, target_date: '2024-03-01', actual_date: '2024-03-10', uc_status: 'Approved' },
    ],
    core_pct: 5,
    hr_pct: 5,
    admin_pct: 5,
    hr_expenses: [],
    admin_expenses: [],
    installments: [
      {
        id: 'inst_3_1', label: 'Installment 1', percentage: 50, amount: 1400000,
        start_date: '2023-09-01', end_date: '2024-02-28', actual_date: '2023-10-05',
        uc_status: 'Approved',
      },
      {
        id: 'inst_3_2', label: 'Installment 2', percentage: 50, amount: 1400000,
        start_date: '2024-03-01', end_date: '2024-08-31', actual_date: '2024-04-10',
        uc_status: 'Approved',
      },
    ],
    risks: [],
  },
  {
    id: 'proj_004',
    project_code: 'CHP-T-004',
    project_type: 'Other Public Health',
    name: 'Community Health Post — Thrissur',
    description:
      'Establishment of a primary health post with telemedicine facilities in underserved areas of Thrissur.',
    funding_agency: 'NHM',
    implementing_partner: 'District Medical Office',
    location: 'Thrissur, Kerala',
    district: 'Thrissur',
    status: 'pipeline',
    phase: 'pipeline',
    project_value: 3100000,
    amount_received: 0,
    amount_spent: 0,
    amount_utilized: 0,
    expense_accounted: 0,
    committed_expense: 0,
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    beneficiaries_target: 8000,
    beneficiaries_completed: 0,
    officer_id: 'po_003',
    officer_name: 'Kavitha Reddy',
    officer_email: 'k.reddy@hma.org',
    email_sent: false,
    field_personnel: [],
    created_at: '2024-12-01T09:00:00Z',
    updated_at: '2024-12-01T09:00:00Z',
    tasks_count: 0,
    tasks_completed: 0,
    pending_approvals: 0,
    milestones: [
      { id: 'ms_1', title: 'Installment 1 (30%)', amount: 930000, target_date: '2025-02-01', actual_date: null, uc_status: 'Pending' },
      { id: 'ms_2', title: 'Installment 2 (40%)', amount: 1240000, target_date: '2025-06-01', actual_date: null, uc_status: 'Pending' },
      { id: 'ms_3', title: 'Installment 3 (30%)', amount: 930000, target_date: '2025-10-01', actual_date: null, uc_status: 'Pending' },
    ],
    core_pct: 5,
    hr_pct: 5,
    admin_pct: 5,
    hr_expenses: [],
    admin_expenses: [],
    installments: [
      {
        id: 'inst_4_1', label: 'Installment 1', percentage: 30, amount: 930000,
        start_date: '2024-11-01', end_date: '2025-02-28', actual_date: null,
        uc_status: 'Pending',
      },
      {
        id: 'inst_4_2', label: 'Installment 2', percentage: 40, amount: 1240000,
        start_date: '2025-03-01', end_date: '2025-06-30', actual_date: null,
        uc_status: 'Pending',
      },
      {
        id: 'inst_4_3', label: 'Installment 3', percentage: 30, amount: 930000,
        start_date: '2025-07-01', end_date: '2025-10-31', actual_date: null,
        uc_status: 'Pending', core_pct: 5, hr_pct: 5, admin_pct: 5,
        core_budget: 46500, hr_budget: 46500, admin_budget: 46500,
        hr_expenses: [], admin_expenses: [],
      },
    ],
    risks: [
      { id: 'r_1', title: 'Pending government approvals for location', severity: 'Medium', status: 'Open' }
    ],
  },
  {
    id: 'proj_005',
    project_code: 'OFC-P-005',
    project_type: 'Consultancy',
    name: 'Organic Farming Collective — Palakkad',
    description:
      'Support for formation and capacity building of organic farming collectives in Palakkad district.',
    funding_agency: 'SFAC',
    implementing_partner: 'Agriculture Department',
    location: 'Palakkad, Kerala',
    district: 'Palakkad',
    status: 'completed',
    phase: 'completed',
    project_value: 1500000,
    amount_received: 1500000,
    amount_spent: 1490000,
    amount_utilized: 1490000,
    expense_accounted: 1490000,
    committed_expense: 0,
    start_date: '2023-01-01',
    end_date: '2023-12-31',
    beneficiaries_completed: 50,
    officer_id: null,
    officer_name: null,
    officer_email: null,
    email_sent: false,
    field_personnel: [],
    created_at: '2022-12-10T07:00:00Z',
    updated_at: '2024-01-05T12:00:00Z',
    tasks_count: 12,
    tasks_completed: 12,
    pending_approvals: 0,
    milestones: [],
    installments: [],
    risks: [],
  },
]

// ─── Projects API ──────────────────────────────────────────────────────────────

export const localProjects = {
  seedDemoData() {
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
    if (officerId) items = items.filter((p) => p.officer_id === officerId || p.assigned_officer_id === officerId)
    
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
      installments: (data.installments || []).map((inst) => ({
        id: inst.id || `inst_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        label: inst.label || 'Installment',
        percentage: parseFloat(inst.percentage) || 0,
        amount: parseFloat(inst.amount) || 0,
        start_date: inst.start_date || '',
        end_date: inst.end_date || inst.target_date || '',
        target_date: inst.end_date || inst.target_date || '', // kept for backwards compatibility in other parts of app if any
        actual_date: inst.actual_date || null,
        uc_status: inst.uc_status || 'Pending',
      })),
      risks: [],
      created_at: now(),
      updated_at: now(),
    }
    projects.unshift(newProject)
    write(PROJECTS_KEY, projects)
    return newProject
  },

  update(id, data) {
    const projects = read(PROJECTS_KEY)
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Project not found')
    projects[idx] = { ...projects[idx], ...data, updated_at: now() }
    write(PROJECTS_KEY, projects)
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
    projects[pIdx][key] = [
      ...(projects[pIdx][key] || []),
      newExp,
    ]
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    return projects[pIdx]
  },

  removeExpense(projectId, pool, expenseId) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const key = pool === 'hr' ? 'hr_expenses' : 'admin_expenses'
    projects[pIdx][key] = (
      projects[pIdx][key] || []
    ).filter((e) => e.id !== expenseId)
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    return projects[pIdx]
  },

  updateExpense(projectId, pool, expenseId, data) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const key = pool === 'hr' ? 'hr_expenses' : 'admin_expenses'
    projects[pIdx][key] = (
      projects[pIdx][key] || []
    ).map((e) => (e.id === expenseId ? { ...e, ...data } : e))
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
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
    return rows[idx]
  },

  removePersonnel(projectId, email) {
    const rows = read(PROJECTS_KEY)
    const idx = rows.findIndex((p) => p.id === projectId)
    if (idx === -1) throw new Error('Project not found')

    rows[idx].field_personnel = (rows[idx].field_personnel || []).filter((fp) => fp.email !== email)
    rows[idx].updated_at = now()

    write(PROJECTS_KEY, rows)
    return rows[idx]
  },

  getStats() {
    const items = read(PROJECTS_KEY)
    const totalValue = items.reduce((s, p) => s + (p.project_value || p.project_valuation || 0), 0)
    const totalReceived = items.reduce((s, p) => s + (p.amount_received || p.amount_released || 0), 0)
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
