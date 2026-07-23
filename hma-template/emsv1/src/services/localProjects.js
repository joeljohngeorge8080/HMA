/**
 * localProjects.js — Local-storage backed mock service for Projects & Project Officers.
 * Merged version supporting both Project Associate and Project Officer flows.
 *
 * Seed data sourced from: /docs/Projects sdp .csv
 */
import { SDP_PROJECTS } from './sdpProjectsData'
import {
  computeWorkingPool,
  monthsInRange,
  sumPlanTotal,
  validatePlanTotal,
  computeFlatMonthlyRate,
  computeCascadeAdjustments,
  validatePlanTotalWithCascade,
  computeActualVsPlannedTransfers,
  computeEffectivePoolMonthly,
} from './monthlyApportionment'

const PROJECTS_KEY = 'hma_projects_v12' // bumped → multi-officer + project_associate_id scoping
const OFFICERS_KEY = 'hma_project_officers_v7'

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

/**
 * Broadcast a DOM event so any mounted component in the SAME tab can react
 * immediately, and write a tiny heartbeat key to localStorage so the native
 * `storage` event fires in OTHER tabs — enabling cross-tab sync.
 */
const notify = () => {
  window.dispatchEvent(new CustomEvent('hma_projects_changed'))
  // Writing any key triggers the native `storage` event in other open tabs
  localStorage.setItem('hma_projects_sync_at', Date.now().toString())
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
  {
    id: 'po_csv_01',
    name: 'Dr. Arjuna V Nath',
    email: 'arjuna.nath@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_01'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'po_csv_02',
    name: 'Syamili.M',
    email: 'syamili.m@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_02', 'sdp_05', 'sdp_16', 'sdp_17'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'po_csv_03',
    name: 'Shone Kiran K.S.',
    email: 'shone.kiran@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_03'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'po_csv_04',
    name: 'Anjali A.S.',
    email: 'anjali.as@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_04', 'sdp_14'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'po_csv_05',
    name: 'K Anakha Soman',
    email: 'anakha.soman@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_06'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'po_csv_06',
    name: 'Dr. Bhavya RJ',
    email: 'bhavya.rj@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_07'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'po_csv_07',
    name: 'Rejitha Ravi',
    email: 'rejitha.ravi@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_08', 'sdp_09'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'po_csv_08',
    name: 'Rakhi Mohan',
    email: 'rakhi.mohan@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_10', 'sdp_11'],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'po_csv_09',
    name: 'Swathy Krishna',
    email: 'swathy.krishna@hma.org',
    phone: '',
    designation: 'Project Officer',
    status: 'active',
    projects_assigned: ['sdp_12', 'sdp_13'],
    created_at: '2026-01-01T00:00:00Z',
  },
]

/** Map officer name → officer id for quick lookup */
const OFFICER_BY_NAME = Object.fromEntries(
  DEMO_OFFICERS.map((o) => [o.name.trim().toLowerCase(), o]),
)

/** Resolve the phase string from CSV phases array */
const resolvePhase = (phases = [], csvStatus) => {
  const lower = (csvStatus || '').toLowerCase()
  if (lower === 'completed') return 'completed'
  if (lower === 'approved') return 'approved'
  // find the active phase
  const activePhase = phases.find((ph) => (ph.status || '').toLowerCase() === 'ongoing')
  if (activePhase) {
    const phLower = (activePhase.phase || '').toLowerCase()
    if (phLower.includes('design') || phLower.includes('initiation')) return 'design_and_initiation'
    if (phLower.includes('implement')) return 'implementation'
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
    actual_date:
      (ph.status || '').toLowerCase() === 'completed' ? parseSdpDate(ph.pending_date) : null,
    uc_status:
      (ph.status || '').toLowerCase() === 'completed'
        ? 'Approved'
        : (ph.status || '').toLowerCase() === 'ongoing'
          ? 'Submitted'
          : 'Pending',
  }))

  // Build risks from phase risk fields
  const risks = (p.phases || [])
    .filter((ph) => ph.risk)
    .map((ph, idx) => ({
      id: `r_${p.id}_${idx + 1}`,
      title: ph.risk,
      severity: 'Medium',
      status: 'Open',
    }))

  // Amount received = sum of received installments
  const amountReceived = (p.installments || [])
    .filter((i) => i.status === 'Received')
    .reduce((s, i) => s + (i.amount || 0), 0)

  // Assign demo projects round-robin to 2 demo PAs based on SDP project index
  // po_csv_01..04 → PA1, po_csv_05..09 → PA2 (split by project id numeric suffix)
  const sdpIdx = parseInt((p.id || '').replace(/\D/g, ''), 10) || 0
  const demoPaId = sdpIdx <= 9 ? 'PA_DEMO_001' : 'PA_DEMO_002'

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
    status:
      statusLower === 'ongoing'
        ? 'ongoing'
        : statusLower === 'approved'
          ? 'approved'
          : statusLower === 'completed'
            ? 'completed'
            : 'pipeline',
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
    // Legacy single-officer fields (kept for backward compat)
    officer_id: officer ? officer.id : null,
    assigned_officer_id: officer ? officer.id : null,
    officer_name: p.project_officer || null,
    officer_email: officer ? officer.email : null,
    // Multi-officer support
    officer_ids: officer ? [officer.id] : [],
    // Project Associate who owns/manages this project
    project_associate_id: demoPaId,
    email_sent: !!p.project_officer,
    field_personnel: p.field_team
      ? p.field_team
          .split(',')
          .map((name) => ({ name: name.trim(), email: '', status: 'active', invited_at: now() }))
          .filter((fp) => fp.name)
      : [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: now(),

    tasks_count: (p.phases || []).length,
    tasks_completed: (p.phases || []).filter(
      (ph) => (ph.status || '').toLowerCase() === 'completed',
    ).length,
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

  list({ search = '', status = '', phase = '', officerId = '', paId = '', dept = '', page = 1, pageSize = 50 } = {}) {
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
      items = items.filter(
        (p) =>
          p.officer_id === officerId ||
          p.assigned_officer_id === officerId ||
          (p.officer_ids || []).includes(officerId),
      )
    // Department filter: maps to project_type categories
    if (dept === 'community_development') {
      items = items.filter((p) => {
        const t = (p.project_type || '').toLowerCase()
        return t.includes('consultancy') || t.includes('community') || t.includes('m cup') || t.includes('mcup')
      })
    } else if (dept === 'public_health') {
      items = items.filter((p) => {
        const t = (p.project_type || '').toLowerCase()
        return t.includes('public health') || t.includes('health')
      })
    }
    // Scope to a specific Project Associate's projects
    if (paId) items = items.filter((p) => p.project_associate_id === paId)

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
    const officerIds = data.officer_ids && data.officer_ids.length > 0
      ? data.officer_ids
      : data.officer_id ? [data.officer_id] : []
    const primaryOfficerId = officerIds[0] || null
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
      // Multi-officer support
      officer_ids: officerIds,
      // Legacy single-officer fields kept for backward compat
      assigned_officer_id: primaryOfficerId,
      officer_id: primaryOfficerId,
      // PA who owns this project
      project_associate_id: data.project_associate_id || null,
      field_personnel: [],
      tasks_count: 0,
      tasks_completed: 0,
      pending_approvals: 0,
      email_sent: false,

      pool_pct_adjustments: [], // [{ from_month, hr_pct, core_pct }]
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
    const updated = { ...projects[idx], ...data, updated_at: now() }

    projects[idx] = updated
    write(PROJECTS_KEY, projects)
    notify()
    return projects[idx]
  },

  /** Permanently removes a project. Irreversible — callers must confirm first. */
  remove(id) {
    const projects = read(PROJECTS_KEY)
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Project not found')
    const [removed] = projects.splice(idx, 1)
    write(PROJECTS_KEY, projects)
    notify()
    return removed
  },

  // ── Monthly Planning ────────────────────────────────────────────────────────

  /**
   * Builds project.monthly_plan from one or more independently-planned
   * "blocks" — each a contiguous month range with its own Design/
   * Implementation/Monitoring phase breakdown, replicated identically
   * across every month in that block's range. Months not covered by any
   * block start as empty stubs (no phases, ₹0 total) — nothing is
   * auto-computed or pre-filled; a PO/PA adds real task lines afterwards
   * via "Add Line", which themselves start at ₹0 planned/actual.
   *
   * - If blocks cover every month, the blocked total must equal the
   *   working pool exactly (no remainder exists to spread either way) or
   *   this throws.
   * - Throws if a block falls outside the project's duration, if two
   *   blocks claim the same month, or if the blocked total alone already
   *   exceeds the working pool.
   * - Persists both `monthly_plan` (the derived per-month array consumed
   *   by the rest of the app) and `plan_blocks` (the raw block
   *   definitions, so the editor can reload and revise them later).
   */
  generateMonthlyPlan(projectId, blocks) {
    const projects = read(PROJECTS_KEY)
    const idx = projects.findIndex((p) => p.id === projectId)
    if (idx === -1) throw new Error('Project not found')
    const project = projects[idx]

    const months = monthsInRange(project.start_date, project.end_date)
    if (months.length === 0) {
      throw new Error('Project must have a start_date and end_date before generating a plan')
    }
    const monthSet = new Set(months)

    const stampedBlocks = blocks.map((b) => ({
      id: b.id || `blk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      startMonth: b.startMonth,
      endMonth: b.endMonth,
      phases: b.phases.map((ph) => ({ ...ph, amount: parseFloat(ph.amount) || 0 })),
    }))

    const blockedMonthEntries = []
    const claimedBy = {}

    for (const block of stampedBlocks) {
      const blockMonths = monthsInRange(block.startMonth, block.endMonth)
      if (blockMonths.length === 0) {
        throw new Error(`Block has an invalid month range (${block.startMonth}–${block.endMonth}).`)
      }
      for (const m of blockMonths) {
        if (!monthSet.has(m)) {
          throw new Error(
            `Block ${block.startMonth}–${block.endMonth} falls outside the project's duration ` +
              `(${months[0]}–${months[months.length - 1]}).`,
          )
        }
        if (claimedBy[m]) {
          throw new Error(
            `Month ${m} is covered by more than one block ` +
              `(${claimedBy[m]} and ${block.startMonth}–${block.endMonth}).`,
          )
        }
        claimedBy[m] = `${block.startMonth}–${block.endMonth}`
      }
      const total = Math.round(block.phases.reduce((s, ph) => s + ph.amount, 0) * 100) / 100
      for (const m of blockMonths) {
        blockedMonthEntries.push({ month: m, phases: block.phases.map((ph) => ({ ...ph })), total })
      }
    }

    const workingPool = computeWorkingPool(project)
    const blockedTotal = sumPlanTotal(blockedMonthEntries)
    const remainingMonths = months.filter((m) => !claimedBy[m])

    let monthlyPlan

    if (remainingMonths.length === 0) {
      monthlyPlan = months.map((m) => blockedMonthEntries.find((e) => e.month === m))
      const { valid, planTotal, diff } = validatePlanTotal(monthlyPlan, workingPool)
      if (!valid) {
        throw new Error(
          `Plan total (${planTotal}) does not match the project baseline (${workingPool}) — ` +
            `difference of ${diff}. Adjust the block amounts and try again.`,
        )
      }
      projects[idx] = {
        ...project,
        monthly_plan: monthlyPlan,
        plan_blocks: stampedBlocks,
        updated_at: now(),
      }
      write(PROJECTS_KEY, projects)
      notify()
      return projects[idx]
    }

    if (blockedTotal > workingPool) {
      throw new Error(
        `Blocked months' total (₹${blockedTotal}) already exceeds the project baseline ` +
          `(₹${workingPool}) — reduce block amounts.`,
      )
    }

    // Months not covered by any block start as empty stubs — no auto-computed
    // "Planned budget" line item, no pre-filled amount. A PO/PA adds a real
    // task via "Add Line" (handleAddPhase in MonthlyPlanPanel), which starts
    // at ₹0 planned/actual, so nothing is invented until a real task exists.
    const remainingEntries = remainingMonths.map((month) => ({
      month,
      phases: [],
      total: 0,
    }))

    monthlyPlan = months.map(
      (m) =>
        blockedMonthEntries.find((e) => e.month === m) ||
        remainingEntries.find((e) => e.month === m),
    )

    projects[idx] = {
      ...project,
      monthly_plan: monthlyPlan,
      plan_blocks: stampedBlocks,
      updated_at: now(),
    }
    write(PROJECTS_KEY, projects)
    notify()
    return projects[idx]
  },

  /**
   * Replaces one month's phase line items. Does not block on an unbalanced
   * total (single-month edits routinely go out of balance mid-edit) — the
   * returned `validation` field tells the caller whether the *overall* plan
   * still balances, so the UI can flag it live.
   */
  /**
   * Replaces one month's phase line items, then recomputes the whole
   * project's auto_cascade pool_adjustments from scratch against the
   * updated plan (any month's Project total exceeding its baseline share
   * automatically pulls from HR/Core — see computeCascadeAdjustments).
   * Manual adjustments (and any legacy adjustment without an auto_cascade
   * source tag) are preserved untouched. Does not block on an unbalanced
   * total (single-month edits routinely go out of balance mid-edit) — the
   * returned `validation` field (cascade-aware) tells the caller whether
   * the *overall* plan still balances, so the UI can flag it live.
   */
  updateMonthPlan(projectId, month, phases) {
    const projects = read(PROJECTS_KEY)
    const idx = projects.findIndex((p) => p.id === projectId)
    if (idx === -1) throw new Error('Project not found')
    const project = projects[idx]
    const plan = project.monthly_plan || []
    const mIdx = plan.findIndex((m) => m.month === month)
    if (mIdx === -1) throw new Error(`Month ${month} not found in plan`)

    const total =
      Math.round(phases.reduce((s, ph) => s + (parseFloat(ph.amount) || 0), 0) * 100) / 100
    const updatedPlan = [...plan]
    updatedPlan[mIdx] = { ...updatedPlan[mIdx], phases, total }

    const preservedAdjustments = (project.pool_adjustments || []).filter(
      (a) => a.source !== 'auto_cascade' && a.source !== 'actual_pull',
    )
    const cascadeAdjustments = computeCascadeAdjustments({
      ...project,
      monthly_plan: updatedPlan,
    }).map((a) => ({
      id: `padj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ...a,
      reason: 'Auto-funded from Project overage',
      createdBy: 'System',
      createdAt: now(),
    }))
    const actualPullAdjustments = computeActualVsPlannedTransfers({
      ...project,
      monthly_plan: updatedPlan,
      pool_adjustments: preservedAdjustments,
    }).map((a) => ({
      id: `padj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ...a,
      createdBy: 'System',
      createdAt: now(),
    }))
    const poolAdjustments = [
      ...preservedAdjustments,
      ...cascadeAdjustments,
      ...actualPullAdjustments,
    ]

    projects[idx] = {
      ...project,
      monthly_plan: updatedPlan,
      pool_adjustments: poolAdjustments,
      updated_at: now(),
    }
    write(PROJECTS_KEY, projects)
    notify()

    const validation = validatePlanTotalWithCascade(
      updatedPlan,
      computeWorkingPool(projects[idx]),
      poolAdjustments,
    )
    return { project: projects[idx], validation }
  },

  /**
   * Re-derives all auto_cascade and actual_pull pool_adjustments from the
   * project's current stored monthly_plan, then writes the result back to
   * localStorage. Manual adjustments are preserved. This is the correct
   * implementation for the "Refresh figures" button — it re-runs the full
   * cascade logic so that any desync between the stored plan and computed
   * adjustments (e.g. after external data changes or in-flight edits from
   * another component) is corrected and reflected in the returned project.
   */
  recomputePlan(projectId) {
    const projects = read(PROJECTS_KEY)
    const idx = projects.findIndex((p) => p.id === projectId)
    if (idx === -1) return null
    const project = projects[idx]
    if (!project.monthly_plan?.length) return project

    const preservedAdjustments = (project.pool_adjustments || []).filter(
      (a) => a.source !== 'auto_cascade' && a.source !== 'actual_pull',
    )
    const cascadeAdjustments = computeCascadeAdjustments(project).map((a) => ({
      id: `padj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ...a,
      reason: 'Auto-funded from Project overage',
      createdBy: 'System',
      createdAt: now(),
    }))
    const actualPullAdjustments = computeActualVsPlannedTransfers({
      ...project,
      pool_adjustments: preservedAdjustments,
    }).map((a) => ({
      id: `padj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ...a,
      createdBy: 'System',
      createdAt: now(),
    }))
    const poolAdjustments = [
      ...preservedAdjustments,
      ...cascadeAdjustments,
      ...actualPullAdjustments,
    ]

    projects[idx] = {
      ...project,
      pool_adjustments: poolAdjustments,
      updated_at: now(),
    }
    write(PROJECTS_KEY, projects)
    notify()
    return projects[idx]
  },

  /**
   * Directly sets a pool's effective figure for one month by upserting a
   * single manual pool_adjustment — replacing any prior manual adjustment
   * for that exact pool+month (not stacking). `newAmount` is the desired
   * effective value; the stored adjustment amount is however much that
   * differs from the flat rate (delta = flat − newAmount). Delta can be
   * negative (a manual top-up above the flat rate) — not clamped,
   * consistent with this codebase's existing pool-adjustment behavior. If
   * the delta rounds to within half a paisa of zero, any existing manual
   * adjustment for that pool+month is removed instead of storing a no-op
   * record (back to the flat rate).
   */
  setManualPoolAdjustment(projectId, { pool, month, newAmount, createdBy }) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')

    const validPools = ['admin', 'hr', 'core']
    if (!validPools.includes(pool)) throw new Error('Pool must be admin, hr, or core.')
    if (!month) throw new Error('A month is required.')

    const months = monthsInRange(projects[pIdx].start_date, projects[pIdx].end_date)
    if (!months.includes(month)) throw new Error(`${month} is outside the project's duration.`)

    const flat = computeFlatMonthlyRate(projects[pIdx], pool)
    const nonManualWithdrawn = (projects[pIdx].pool_adjustments || [])
      .filter((a) => a.pool === pool && a.month === month && a.source !== 'manual')
      .reduce((s, a) => s + (a.amount || 0), 0)
    const delta = Math.round((flat - nonManualWithdrawn - (parseFloat(newAmount) || 0)) * 100) / 100

    const withoutExistingManual = (projects[pIdx].pool_adjustments || []).filter(
      (a) => !(a.source === 'manual' && a.pool === pool && a.month === month),
    )

    const nextAdjustments =
      Math.abs(delta) < 0.01
        ? withoutExistingManual
        : [
            ...withoutExistingManual,
            {
              id: `padj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              pool,
              month,
              amount: delta,
              source: 'manual',
              reason: 'Direct edit',
              createdBy: createdBy || 'Unknown',
              createdAt: now(),
            },
          ]

    projects[pIdx].pool_adjustments = nextAdjustments
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  // ── Send-to-EMS Allocations ──────────────────────────────────────────────────

  /**
   * PO confirms sending one month's pool amount to EMS — this is what
   * unlocks HR to log actual expenses against that exact project+pool+
   * month in EMS → Project Expenses (capped at this amount there). Upserts
   * (replaces any prior sent record for the same pool+month, not stacking).
   * A month/pool that's never sent stays at 0 in EMS — that's the PO's
   * restriction; there's no separate "restrict" action beyond simply not
   * sending.
   */
  sendPoolAllocation(projectId, { pool, month, amount, sentBy }) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')

    const validPools = ['admin', 'hr', 'core']
    if (!validPools.includes(pool)) throw new Error('Pool must be admin, hr, or core.')
    if (!month) throw new Error('A month is required.')

    const months = monthsInRange(projects[pIdx].start_date, projects[pIdx].end_date)
    if (!months.includes(month)) throw new Error(`${month} is outside the project's duration.`)

    const amt = parseFloat(amount) || 0
    if (amt <= 0) throw new Error('Sent amount must be greater than zero.')

    const withoutExisting = (projects[pIdx].sent_allocations || []).filter(
      (a) => !(a.pool === pool && a.month === month),
    )
    const record = {
      id: `sent_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      pool,
      month,
      amount: amt,
      sentBy: sentBy || 'Unknown',
      sentAt: now(),
    }

    projects[pIdx].sent_allocations = [...withoutExisting, record]
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  /** Reverses a send — the pool+month goes back to unavailable in EMS. */
  revokePoolAllocation(projectId, { pool, month }) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    projects[pIdx].sent_allocations = (projects[pIdx].sent_allocations || []).filter(
      (a) => !(a.pool === pool && a.month === month),
    )
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  // ── Actual-vs-Planned Reallocation (Case 1 automatic, Case 2 manual) ────────

  /**
   * Case 2 "Send to HR/Core": splits a month's Project surplus 50/50 into
   * HR and Core's effective monthly figures via the existing
   * setManualPoolAdjustment — no new schema. Each call adds its half on
   * top of whatever that pool's current effective figure already is
   * (not a flat overwrite), so a pre-existing manual HR/Core edit for
   * that month is preserved and topped up, not replaced outright.
   */
  sendSurplusToPools(projectId, { month, surplus, createdBy }) {
    const amt = parseFloat(surplus) || 0
    if (amt <= 0) throw new Error('No surplus available to send for this month.')
    const half = Math.round((amt / 2) * 100) / 100
    const otherHalf = Math.round((amt - half) * 100) / 100

    const project = localProjects.getById(projectId)
    if (!project) throw new Error('Project not found')

    const hrCurrent = computeEffectivePoolMonthly(project, 'hr', month)
    const afterHr = localProjects.setManualPoolAdjustment(projectId, {
      pool: 'hr',
      month,
      newAmount: hrCurrent + half,
      createdBy,
    })
    const coreCurrent = computeEffectivePoolMonthly(afterHr, 'core', month)
    return localProjects.setManualPoolAdjustment(projectId, {
      pool: 'core',
      month,
      newAmount: coreCurrent + otherHalf,
      createdBy,
    })
  },

  /**
   * Case 2 "Send to next month": pushes a month's Project surplus into
   * next month's effective planned Project total, as a paired
   * pool: 'project' adjustment (same sign convention/shape as the
   * automatic 'actual_pull' transfers) — but source-tagged distinctly
   * since this one is PO-triggered and persists until explicitly
   * revoked, not recomputed-and-replaced on every edit.
   */
  sendSurplusToNextMonth(projectId, { month, surplus, createdBy }) {
    const amt = parseFloat(surplus) || 0
    if (amt <= 0) throw new Error('No surplus available to send for this month.')

    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const project = projects[pIdx]

    const months = monthsInRange(project.start_date, project.end_date)
    const monthIdx = months.indexOf(month)
    if (monthIdx === -1) throw new Error(`${month} is outside the project's duration.`)
    const nextMonth = months[monthIdx + 1]
    if (!nextMonth) throw new Error('There is no next month to send this surplus to.')

    const withoutExistingSurplusTransfer = (project.pool_adjustments || []).filter(
      (a) =>
        !(a.source === 'actual_surplus_next_month' && (a.month === month || a.month === nextMonth)),
    )
    const record = (targetMonth, amount, counterMonth, reason) => ({
      id: `padj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      pool: 'project',
      month: targetMonth,
      amount,
      source: 'actual_surplus_next_month',
      counterMonth,
      reason,
      createdBy: createdBy || 'Unknown',
      createdAt: now(),
    })

    projects[pIdx] = {
      ...project,
      pool_adjustments: [
        ...withoutExistingSurplusTransfer,
        record(month, amt, nextMonth, `PO-sent surplus to ${nextMonth}`),
        record(nextMonth, -amt, month, `PO-sent surplus from ${month}`),
      ],
      updated_at: now(),
    }
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  /** Reverses a Case-2 "Send to next month" transfer — removes both paired records. */
  revokeActualSurplusTransfer(projectId, { month }) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const project = projects[pIdx]

    // Find the LAST (most recent) outgoing transfer from this month so that
    // we always revoke the tail of the chain. Outgoing entries have amount < 0.
    const outgoing = (project.pool_adjustments || []).filter(
      (a) => a.source === 'actual_surplus_next_month' && a.month === month && (a.amount || 0) < 0,
    )
    if (!outgoing.length) return project

    const existing = outgoing[outgoing.length - 1]
    const counterMonth = existing.counterMonth

    // Remove the outgoing entry from `month` AND the matching incoming entry from `counterMonth`.
    // Match by both month sides so partial duplicates don't linger.
    projects[pIdx] = {
      ...project,
      pool_adjustments: (project.pool_adjustments || []).filter(
        (a) =>
          !(
            a.source === 'actual_surplus_next_month' &&
            (a.month === month || a.month === counterMonth)
          ),
      ),
      updated_at: now(),
    }
    write(PROJECTS_KEY, projects)
    notify()
    return projects[pIdx]
  },

  // ── Pool % Adjustment API ──────────────────────────────────────────────────────

  /**
   * Upsert a pool % adjustment for a project from a given month onwards.
   * Reducing hr_pct/core_pct increases the project direct budget for that month+.
   * @param {string} projectId
   * @param {{ from_month: string, hr_pct: number, core_pct: number }} adjustment
   */
  addPoolPctAdjustment(projectId, { from_month, hr_pct, core_pct }) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    const existing = projects[pIdx].pool_pct_adjustments || []
    // Replace any existing entry for the same month, then push new one
    const filtered = existing.filter((a) => a.from_month !== from_month)
    filtered.push({
      from_month,
      hr_pct: Math.max(0, Math.min(100, parseFloat(hr_pct) || 0)),
      core_pct: Math.max(0, Math.min(100, parseFloat(core_pct) || 0)),
    })
    filtered.sort((a, b) => a.from_month.localeCompare(b.from_month))
    projects[pIdx].pool_pct_adjustments = filtered
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    return projects[pIdx]
  },

  removePoolPctAdjustment(projectId, from_month) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')
    projects[pIdx].pool_pct_adjustments = (projects[pIdx].pool_pct_adjustments || []).filter(
      (a) => a.from_month !== from_month,
    )
    projects[pIdx].updated_at = now()
    write(PROJECTS_KEY, projects)
    return projects[pIdx]
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
    return this.assignOfficers(projectId, [officerId])
  },

  /**
   * Assigns multiple officers to a project (replaces existing officer list).
   * Also keeps legacy officer_id/officer_name fields in sync.
   */
  assignOfficers(projectId, officerIds) {
    const projects = read(PROJECTS_KEY)
    const pIdx = projects.findIndex((p) => p.id === projectId)
    if (pIdx === -1) throw new Error('Project not found')

    const validIds = (officerIds || []).filter(Boolean)
    const officers = validIds
      .map((id) => localOfficers.getById(id))
      .filter(Boolean)

    const primaryOfficer = officers[0] || null

    projects[pIdx].officer_ids = validIds
    // Legacy compat: keep single-officer fields pointing to the first officer
    projects[pIdx].officer_id = primaryOfficer ? primaryOfficer.id : null
    projects[pIdx].assigned_officer_id = primaryOfficer ? primaryOfficer.id : null
    projects[pIdx].officer_name = primaryOfficer ? primaryOfficer.name : null
    projects[pIdx].officer_email = primaryOfficer ? primaryOfficer.email : null
    projects[pIdx].email_sent = officers.length > 0 // simulate SES
    projects[pIdx].updated_at = now()

    write(PROJECTS_KEY, projects)
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

  getStats(filterItems) {
    const items = filterItems || read(PROJECTS_KEY)
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

  /** Same as getStats() but scoped to a specific Project Associate's projects. */
  getStatsForPA(paId) {
    const items = read(PROJECTS_KEY).filter((p) => p.project_associate_id === paId)
    return this.getStats(items)
  },
}

// ─── Project Officers API ──────────────────────────────────────────────────────

export const localOfficers = {
  _getOfficersFromStaff() {
    const employees = read('hma_employees') || []
    const allProjects = read(PROJECTS_KEY)
    return employees
      .filter((e) => (e.employment?.designation || '').toLowerCase().includes('project officer'))
      .map((e) => ({
        id: e.id,
        name: e.employee_name,
        email: e.contact?.working_email || e.contact?.personal_email || '',
        phone: e.contact?.mobile || '',
        designation: e.employment?.designation || 'Project Officer',
        status: (e.status || 'active').toLowerCase(),
        projects_assigned: allProjects
          .filter(
            (p) =>
              p.officer_id === e.id ||
              (p.officer_ids || []).includes(e.id),
          )
          .map((p) => p.id),
        created_at: e.created_at || now(),
      }))
  },

  list({ search = '', status = '' } = {}) {
    let items = this._getOfficersFromStaff()
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

  /**
   * Returns only officers assigned to at least one project that belongs to `paId`.
   * Used to scope the Project Officers page for a logged-in Project Associate.
   */
  listForPA(paId, { search = '', status = '' } = {}) {
    const allProjects = read(PROJECTS_KEY).filter((p) => p.project_associate_id === paId)
    // Collect all officer IDs referenced in the PA's projects
    const officerIdSet = new Set()
    allProjects.forEach((p) => {
      ;(p.officer_ids || []).forEach((id) => officerIdSet.add(id))
      if (p.officer_id) officerIdSet.add(p.officer_id)
    })
    let items = this._getOfficersFromStaff().filter((o) => officerIdSet.has(o.id))
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
    return this._getOfficersFromStaff().find((o) => o.id === id) || null
  },

  create(data) {
    throw new Error('Project Officers must be created via Staff & Payroll')
  },

  update(id, data) {
    throw new Error('Update Project Officers via Staff & Payroll')
  },

  getAvailable() {
    return this._getOfficersFromStaff().filter((o) => o.status === 'active')
  },

  getProjectsForOfficer(officerId) {
    return read(PROJECTS_KEY).filter(
      (p) =>
        p.officer_id === officerId ||
        p.assigned_officer_id === officerId ||
        (p.officer_ids || []).includes(officerId),
    )
  },
}
