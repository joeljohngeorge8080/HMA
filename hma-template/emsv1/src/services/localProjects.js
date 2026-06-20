/**
 * localProjects.js — Local-storage backed mock service for Projects & Project Officers.
 * Follows the same pattern as localReports.js and localTasks.js.
 */

const PROJECTS_KEY = 'hma_projects'
const OFFICERS_KEY = 'hma_project_officers'

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
  {
    id: 'po_003',
    name: 'Mohammed Farooq',
    email: 'm.farooq@hma.org',
    phone: '+91-91234-56789',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: [],
    created_at: '2024-03-20T11:00:00Z',
  },
  {
    id: 'po_004',
    name: 'Kavitha Reddy',
    email: 'k.reddy@hma.org',
    phone: '+91-87654-32109',
    designation: 'Assistant Project Officer',
    status: 'active',
    projects_assigned: ['proj_004'],
    created_at: '2024-04-05T08:00:00Z',
  },
  {
    id: 'po_005',
    name: 'Suresh Pillai',
    email: 's.pillai@hma.org',
    phone: '+91-76543-21098',
    designation: 'Senior Project Officer',
    status: 'inactive',
    projects_assigned: [],
    created_at: '2023-11-01T07:00:00Z',
  },
]

const DEMO_PROJECTS = [
  {
    id: 'proj_001',
    name: 'Rural Water Supply Scheme — Wayanad',
    description:
      'Installation of drinking water pipelines and storage tanks across 12 tribal villages in Wayanad district.',
    funding_agency: 'NABARD',
    implementing_partner: 'Kerala Water Authority',
    location: 'Wayanad, Kerala',
    district: 'Wayanad',
    status: 'active',
    phase: 'implementation',
    project_value: 4500000,
    amount_received: 2800000,
    amount_spent: 1950000,
    start_date: '2024-03-01',
    end_date: '2025-02-28',
    officer_id: 'po_001',
    officer_name: 'Arjun Sharma',
    officer_email: 'arjun.sharma@hma.org',
    email_sent: true,
    created_at: '2024-02-20T09:00:00Z',
    updated_at: '2024-12-10T14:30:00Z',
    tasks_count: 8,
    tasks_completed: 5,
    pending_approvals: 2,
  },
  {
    id: 'proj_002',
    name: 'Solar Electrification — Idukki Villages',
    description:
      'Solar panel installation and micro-grid setup for 6 remote villages in Idukki to provide 24/7 electricity.',
    funding_agency: 'MNRE',
    implementing_partner: 'KSEB',
    location: 'Idukki, Kerala',
    district: 'Idukki',
    status: 'active',
    phase: 'design',
    project_value: 7200000,
    amount_received: 3600000,
    amount_spent: 890000,
    start_date: '2024-06-01',
    end_date: '2025-05-31',
    officer_id: 'po_002',
    officer_name: 'Priya Nair',
    officer_email: 'priya.nair@hma.org',
    email_sent: true,
    created_at: '2024-05-10T10:00:00Z',
    updated_at: '2024-11-25T11:00:00Z',
    tasks_count: 6,
    tasks_completed: 1,
    pending_approvals: 1,
  },
  {
    id: 'proj_003',
    name: 'Livelihood Training Centre — Malappuram',
    description:
      'Construction and equipping of a vocational training centre for skill development of youth in Malappuram.',
    funding_agency: 'NRLM',
    implementing_partner: 'Kudumbashree',
    location: 'Malappuram, Kerala',
    district: 'Malappuram',
    status: 'active',
    phase: 'implementation',
    project_value: 2800000,
    amount_received: 2800000,
    amount_spent: 2200000,
    start_date: '2023-09-01',
    end_date: '2024-08-31',
    officer_id: 'po_001',
    officer_name: 'Arjun Sharma',
    officer_email: 'arjun.sharma@hma.org',
    email_sent: true,
    created_at: '2023-08-15T08:00:00Z',
    updated_at: '2024-08-01T16:00:00Z',
    tasks_count: 10,
    tasks_completed: 9,
    pending_approvals: 0,
  },
  {
    id: 'proj_004',
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
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    officer_id: 'po_004',
    officer_name: 'Kavitha Reddy',
    officer_email: 'k.reddy@hma.org',
    email_sent: false,
    created_at: '2024-12-01T09:00:00Z',
    updated_at: '2024-12-01T09:00:00Z',
    tasks_count: 0,
    tasks_completed: 0,
    pending_approvals: 0,
  },
  {
    id: 'proj_005',
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
    start_date: '2023-01-01',
    end_date: '2023-12-31',
    officer_id: null,
    officer_name: null,
    officer_email: null,
    email_sent: false,
    created_at: '2022-12-10T07:00:00Z',
    updated_at: '2024-01-05T12:00:00Z',
    tasks_count: 12,
    tasks_completed: 12,
    pending_approvals: 0,
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

  list({ search = '', status = '', phase = '', pageSize = 50 } = {}) {
    let items = read(PROJECTS_KEY)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.officer_name?.toLowerCase().includes(q) ||
          p.funding_agency?.toLowerCase().includes(q),
      )
    }
    if (status) items = items.filter((p) => p.status === status)
    if (phase) items = items.filter((p) => p.phase === phase)
    items = [...items].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    return { items: items.slice(0, pageSize), total: items.length }
  },

  getById(id) {
    return read(PROJECTS_KEY).find((p) => p.id === id) || null
  },

  create(data) {
    const projects = read(PROJECTS_KEY)
    const newProject = {
      id: uid(),
      ...data,
      status: data.status || 'pipeline',
      phase: data.phase || 'pipeline',
      amount_spent: 0,
      tasks_count: 0,
      tasks_completed: 0,
      pending_approvals: 0,
      email_sent: false,
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

  getStats() {
    const items = read(PROJECTS_KEY)
    const totalValue = items.reduce((s, p) => s + (p.project_value || 0), 0)
    const totalReceived = items.reduce((s, p) => s + (p.amount_received || 0), 0)
    const totalSpent = items.reduce((s, p) => s + (p.amount_spent || 0), 0)
    return {
      total: items.length,
      active: items.filter((p) => p.status === 'active').length,
      pipeline: items.filter((p) => p.status === 'pipeline').length,
      completed: items.filter((p) => p.status === 'completed').length,
      pendingApprovals: items.reduce((s, p) => s + (p.pending_approvals || 0), 0),
      totalValue,
      totalReceived,
      totalSpent,
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
