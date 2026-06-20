// localStorage-based task assignment store.
// Project Officers create tasks and assign them to Field Personnel.
// Field Personnel submit daily reports against these tasks.

const KEY = 'hma_tasks'

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

export const TASK_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

// Demo personnel list (shared across task and report modules)
export const FIELD_PERSONNEL_LIST = [
  { id: 'fp_001', name: 'Rajesh Kumar' },
  { id: 'fp_002', name: 'Anita Sharma' },
  { id: 'fp_003', name: 'Vikram Patel' },
  { id: 'fp_004', name: 'Priya Nair' },
  { id: 'fp_005', name: 'Suresh Reddy' },
]

export const localTasks = {
  // ── list ────────────────────────────────────────────────────────────────────
  list({ search = '', status = '', assignee = '', page = 1, pageSize = 50 } = {}) {
    let rows = readAll()

    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assigned_to_name?.toLowerCase().includes(q),
      )
    }
    if (status) rows = rows.filter((t) => t.status === status)
    if (assignee) rows = rows.filter((t) => t.assigned_to === assignee)

    // Sort newest first
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const total = rows.length
    const total_pages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    return { items: rows.slice(start, start + pageSize), total, total_pages }
  },

  // ── getById ─────────────────────────────────────────────────────────────────
  getById(id) {
    return readAll().find((t) => t.id === id) || null
  },

  // ── getByAssignee ───────────────────────────────────────────────────────────
  getByAssignee(userId, { status = '' } = {}) {
    let rows = readAll().filter((t) => t.assigned_to === userId)
    if (status) rows = rows.filter((t) => t.status === status)
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return rows
  },

  // ── getActiveTasks (for report form dropdown) ───────────────────────────────
  getActiveTasks(userId = '') {
    let rows = readAll().filter((t) => t.status === TASK_STATUS.ACTIVE)
    if (userId) rows = rows.filter((t) => t.assigned_to === userId)
    return rows
  },

  // ── create ──────────────────────────────────────────────────────────────────
  create(data) {
    const rows = readAll()
    const ts = now()

    const personnel = FIELD_PERSONNEL_LIST.find((p) => p.id === data.assigned_to)

    const task = {
      id: uid(),
      title: data.title,
      description: data.description || '',
      project_name: data.project_name || 'General Project',
      assigned_to: data.assigned_to,
      assigned_to_name: personnel?.name || data.assigned_to_name || 'Unknown',
      assigned_by: data.assigned_by || 'project_officer',
      assigned_at: ts,
      due_date: data.due_date || null,
      status: TASK_STATUS.ACTIVE,
      created_at: ts,
      updated_at: ts,
    }

    writeAll([...rows, task])
    return task
  },

  // ── update ──────────────────────────────────────────────────────────────────
  update(id, data) {
    const rows = readAll()
    const idx = rows.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Task not found')

    const personnel = data.assigned_to
      ? FIELD_PERSONNEL_LIST.find((p) => p.id === data.assigned_to)
      : null

    rows[idx] = {
      ...rows[idx],
      ...data,
      assigned_to_name: personnel?.name || rows[idx].assigned_to_name,
      updated_at: now(),
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── complete ────────────────────────────────────────────────────────────────
  complete(id) {
    const rows = readAll()
    const idx = rows.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Task not found')

    rows[idx] = {
      ...rows[idx],
      status: TASK_STATUS.COMPLETED,
      updated_at: now(),
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── cancel ──────────────────────────────────────────────────────────────────
  cancel(id) {
    const rows = readAll()
    const idx = rows.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Task not found')

    rows[idx] = {
      ...rows[idx],
      status: TASK_STATUS.CANCELLED,
      updated_at: now(),
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── delete ──────────────────────────────────────────────────────────────────
  delete(id) {
    const rows = readAll()
    const idx = rows.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Task not found')
    rows.splice(idx, 1)
    writeAll(rows)
  },

  // ── seed demo data ──────────────────────────────────────────────────────────
  seedDemoData() {
    if (readAll().length > 0) return

    const demoTasks = [
      {
        title: 'Plot A3 Foundation Survey',
        description: 'Conduct soil inspection and document foundation readiness for Plot A3. Take geo-tagged photos of the site.',
        project_name: 'Medical College Construction',
        assigned_to: 'fp_001',
        due_date: '2026-06-20',
      },
      {
        title: 'Block C Excavation',
        description: 'Oversee excavation work at Block C. Submit daily labor charges and site progress photos.',
        project_name: 'Medical College Construction',
        assigned_to: 'fp_003',
        due_date: '2026-06-25',
      },
      {
        title: 'Material Procurement — Block B Phase 2',
        description: 'Purchase cement, steel, and aggregate for Block B construction phase 2. Submit all purchase bills.',
        project_name: 'Highway Expansion Phase 2',
        assigned_to: 'fp_002',
        due_date: '2026-06-22',
      },
      {
        title: 'Safety Audit — All Sites',
        description: 'Conduct safety compliance audit across all active sites. Document any violations with photos.',
        project_name: 'City Hospital Renovation',
        assigned_to: 'fp_004',
        due_date: '2026-06-21',
      },
      {
        title: 'Equipment Maintenance Log',
        description: 'Inspect and log maintenance needs for heavy equipment at warehouse. Submit repair cost estimates.',
        project_name: 'Highway Expansion Phase 2',
        assigned_to: 'fp_005',
        due_date: '2026-06-23',
      },
    ]

    demoTasks.forEach((t) => this.create(t))

    // Complete one task for demo variety
    const all = readAll()
    if (all.length >= 2) {
      this.complete(all[1].id)
    }
  },
}
