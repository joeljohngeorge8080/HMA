// localStorage-based daily report store.
// Mirrors the DRD Report Object schema.
// Swap out by replacing `localReports.*` calls with real API calls once the backend is running.

const KEY = 'hma_daily_reports'

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

export const REPORT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  DECLINED: 'declined',
  RESUBMITTED: 'resubmitted',
  APPROVED: 'approved',
}

export const localReports = {
  // ── list ────────────────────────────────────────────────────────────────────
  list({
    search = '',
    status = '',
    personnel = '',
    dateFrom = '',
    dateTo = '',
    page = 1,
    pageSize = 25,
  } = {}) {
    let rows = readAll()

    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.bill_topic?.toLowerCase().includes(q) ||
          r.submitted_by_name?.toLowerCase().includes(q) ||
          r.task_title?.toLowerCase().includes(q),
      )
    }
    if (status) rows = rows.filter((r) => r.status === status)
    if (personnel) rows = rows.filter((r) => r.submitted_by === personnel)
    if (dateFrom) rows = rows.filter((r) => r.report_date >= dateFrom)
    if (dateTo) rows = rows.filter((r) => r.report_date <= dateTo)

    // Sort newest first
    rows.sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at))

    const total = rows.length
    const total_pages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    return { items: rows.slice(start, start + pageSize), total, total_pages }
  },

  // ── getById ─────────────────────────────────────────────────────────────────
  getById(id) {
    return readAll().find((r) => r.id === id) || null
  },

  // ── create (submit) ─────────────────────────────────────────────────────────
  create(data) {
    const rows = readAll()
    const ts = now()

    const report = {
      id: uid(),
      submitted_by: data.submitted_by || 'current_user',
      submitted_by_name: data.submitted_by_name || 'Field Personnel',
      submitted_at: ts,
      bill_topic: data.bill_topic,
      amount: parseFloat(data.amount) || 0,
      report_date: data.report_date || ts.split('T')[0],
      report_time: data.report_time || ts.split('T')[1]?.slice(0, 5) || '09:00',
      notes: data.notes || '',
      geo_photos: data.geo_photos || [],
      bill_uploads: data.bill_uploads || [],
      task_id: data.task_id || null,
      task_title: data.task_title || '',
      status: REPORT_STATUS.SUBMITTED,
      decline_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      forwarded_to_backend_at: null,
      created_at: ts,
      updated_at: ts,
    }

    writeAll([...rows, report])
    return report
  },

  // ── saveDraft ───────────────────────────────────────────────────────────────
  saveDraft(data) {
    const rows = readAll()
    const ts = now()

    const report = {
      id: data.id || uid(),
      submitted_by: data.submitted_by || 'current_user',
      submitted_by_name: data.submitted_by_name || 'Field Personnel',
      submitted_at: null,
      bill_topic: data.bill_topic || '',
      amount: parseFloat(data.amount) || 0,
      report_date: data.report_date || ts.split('T')[0],
      report_time: data.report_time || '',
      notes: data.notes || '',
      geo_photos: data.geo_photos || [],
      bill_uploads: data.bill_uploads || [],
      task_id: data.task_id || null,
      task_title: data.task_title || '',
      status: REPORT_STATUS.DRAFT,
      decline_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      forwarded_to_backend_at: null,
      created_at: ts,
      updated_at: ts,
    }

    // If draft already exists, update it
    const existing = rows.findIndex((r) => r.id === report.id)
    if (existing !== -1) {
      rows[existing] = { ...rows[existing], ...report, updated_at: ts }
      writeAll(rows)
      return rows[existing]
    }

    writeAll([...rows, report])
    return report
  },

  // ── approve ─────────────────────────────────────────────────────────────────
  approve(id, reviewerId = 'project_officer') {
    const rows = readAll()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Report not found')

    const ts = now()
    rows[idx] = {
      ...rows[idx],
      status: REPORT_STATUS.APPROVED,
      reviewed_by: reviewerId,
      reviewed_at: ts,
      forwarded_to_backend_at: ts,
      updated_at: ts,
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── decline ─────────────────────────────────────────────────────────────────
  decline(id, reviewerId = 'project_officer', reason = '') {
    const rows = readAll()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Report not found')

    if (!reason.trim()) throw new Error('Decline reason is required')

    const ts = now()
    rows[idx] = {
      ...rows[idx],
      status: REPORT_STATUS.DECLINED,
      decline_reason: reason,
      reviewed_by: reviewerId,
      reviewed_at: ts,
      updated_at: ts,
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── resubmit ────────────────────────────────────────────────────────────────
  resubmit(id, data) {
    const rows = readAll()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Report not found')

    const ts = now()
    rows[idx] = {
      ...rows[idx],
      bill_topic: data.bill_topic ?? rows[idx].bill_topic,
      amount: data.amount !== undefined ? parseFloat(data.amount) : rows[idx].amount,
      report_date: data.report_date ?? rows[idx].report_date,
      report_time: data.report_time ?? rows[idx].report_time,
      notes: data.notes ?? rows[idx].notes,
      geo_photos: data.geo_photos ?? rows[idx].geo_photos,
      bill_uploads: data.bill_uploads ?? rows[idx].bill_uploads,
      task_id: data.task_id ?? rows[idx].task_id,
      task_title: data.task_title ?? rows[idx].task_title,
      status: REPORT_STATUS.RESUBMITTED,
      decline_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      submitted_at: ts,
      updated_at: ts,
    }

    writeAll(rows)
    return rows[idx]
  },

  // ── delete (drafts only) ────────────────────────────────────────────────────
  deleteDraft(id) {
    const rows = readAll()
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Report not found')
    if (rows[idx].status !== REPORT_STATUS.DRAFT) {
      throw new Error('Only drafts can be deleted')
    }
    rows.splice(idx, 1)
    writeAll(rows)
  },

  // ── notification counts ─────────────────────────────────────────────────────
  getNotificationCounts(role = '') {
    const rows = readAll()
    if (role === 'Field Personnel') {
      return {
        declined: rows.filter((r) => r.status === REPORT_STATUS.DECLINED).length,
        total: rows.filter((r) => r.status === REPORT_STATUS.DECLINED).length,
      }
    }
    if (role === 'Project Officer') {
      return {
        pending: rows.filter(
          (r) =>
            r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.RESUBMITTED,
        ).length,
        total: rows.filter(
          (r) =>
            r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.RESUBMITTED,
        ).length,
      }
    }
    return { total: 0 }
  },

  // ── seed demo data ──────────────────────────────────────────────────────────
  seedDemoData() {
    if (readAll().length > 0) return // Don't seed if data exists

    const demoReports = [
      {
        submitted_by: 'fp_001',
        submitted_by_name: 'Rajesh Kumar',
        bill_topic: 'Site Survey — Plot A3 Foundation',
        amount: 2500,
        report_date: '2026-06-17',
        report_time: '10:30',
        notes: 'Completed foundation soil inspection. Photos attached.',
        task_id: 'task_001',
        task_title: 'Plot A3 Foundation Survey',
      },
      {
        submitted_by: 'fp_002',
        submitted_by_name: 'Anita Sharma',
        bill_topic: 'Material Purchase — Cement bags',
        amount: 18500,
        report_date: '2026-06-18',
        report_time: '14:15',
        notes: '50 cement bags for Block B construction phase 2.',
      },
      {
        submitted_by: 'fp_001',
        submitted_by_name: 'Rajesh Kumar',
        bill_topic: 'Transportation — Equipment delivery',
        amount: 4200,
        report_date: '2026-06-18',
        report_time: '09:00',
        notes: 'Heavy equipment delivery from warehouse to site.',
      },
      {
        submitted_by: 'fp_003',
        submitted_by_name: 'Vikram Patel',
        bill_topic: 'Labour Charges — Daily wage workers',
        amount: 12000,
        report_date: '2026-06-19',
        report_time: '17:00',
        notes: '8 workers × ₹1500/day for excavation work.',
        task_id: 'task_002',
        task_title: 'Block C Excavation',
      },
      {
        submitted_by: 'fp_002',
        submitted_by_name: 'Anita Sharma',
        bill_topic: 'Safety Equipment — PPE kits',
        amount: 6800,
        report_date: '2026-06-19',
        report_time: '11:45',
        notes: 'Purchased 20 PPE kits for new site workers. Mandatory safety compliance.',
      },
    ]

    demoReports.forEach((r) => this.create(r))

    // Set some different statuses for demo variety
    const all = readAll()
    if (all.length >= 5) {
      this.approve(all[0].id, 'po_001')
      this.decline(all[2].id, 'po_001', 'Receipt image is blurry. Please re-upload a clear photo of the transport bill.')
    }
  },
}
