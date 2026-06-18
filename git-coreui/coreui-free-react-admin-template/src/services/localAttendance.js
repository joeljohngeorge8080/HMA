// localStorage-based attendance store.
// Mirrors: attendance_uploads, attendance_records, attendance_monthly_summary
// Falls back to this when the FastAPI backend is not running.

const KEYS = {
  uploads: 'hma_attendance_uploads',
  records: 'hma_attendance_records',
  summaries: 'hma_attendance_summaries',
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const now = () => new Date().toISOString()

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}
const write = (key, data) => localStorage.setItem(key, JSON.stringify(data))

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_ORDER = ['Present', 'Half Day', 'Absent', 'On Leave', 'Holiday', 'Weekly Off']
const isValidStatus = (s) => STATUS_ORDER.includes(s)

// Parse "HH:MM" or "HH:MM:SS" → total minutes from midnight
const toMinutes = (str) => {
  if (!str) return null
  const parts = str.split(':').map(Number)
  return parts[0] * 60 + (parts[1] || 0)
}

// Format minutes as "H h MM m"
const fmtDuration = (min) => {
  if (min == null || isNaN(min)) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// Build monthly summary from a set of records for one employee-month
const buildSummary = (records) => {
  let present = 0,
    absent = 0,
    weeklyOff = 0,
    holiday = 0,
    leave = 0,
    halfDay = 0,
    lateDays = 0,
    lateMinTotal = 0,
    earlyDays = 0,
    earlyMinTotal = 0,
    workMinTotal = 0,
    otMinTotal = 0

  for (const r of records) {
    switch (r.status) {
      case 'Present':
        present++
        break
      case 'Half Day':
        halfDay++
        present++
        break
      case 'Absent':
        absent++
        break
      case 'On Leave':
        leave++
        break
      case 'Holiday':
        holiday++
        break
      case 'Weekly Off':
        weeklyOff++
        break
    }
    if (r.late_by_minutes > 0) {
      lateDays++
      lateMinTotal += r.late_by_minutes
    }
    if (r.early_by_minutes > 0) {
      earlyDays++
      earlyMinTotal += r.early_by_minutes
    }
    if (r.work_duration_minutes != null) workMinTotal += r.work_duration_minutes
    if (r.overtime_minutes != null) otMinTotal += r.overtime_minutes
  }

  const workingDays = present + absent + halfDay + leave
  const avgWorkMin = workingDays > 0 ? Math.round(workMinTotal / workingDays) : 0

  return {
    present_count: present,
    absent_count: absent,
    half_day_count: halfDay,
    weekly_off_count: weeklyOff,
    holiday_count: holiday,
    leave_count: leave,
    late_days: lateDays,
    late_hours: fmtDuration(lateMinTotal),
    late_minutes_total: lateMinTotal,
    early_days: earlyDays,
    early_hours: fmtDuration(earlyMinTotal),
    total_work_duration: fmtDuration(workMinTotal),
    total_overtime: fmtDuration(otMinTotal),
    avg_working_hours: fmtDuration(avgWorkMin),
    total_records: records.length,
  }
}

// ── public API ────────────────────────────────────────────────────────────────

export const localAttendance = {
  // ── uploads ─────────────────────────────────────────────────────────────────

  listUploads({ year, month } = {}) {
    let rows = read(KEYS.uploads)
    if (year) rows = rows.filter((u) => u.year === Number(year))
    if (month) rows = rows.filter((u) => u.month === Number(month))
    return rows.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
  },

  getUpload(uploadId) {
    return read(KEYS.uploads).find((u) => u.id === uploadId) || null
  },

  // ── saveImport ───────────────────────────────────────────────────────────────
  // Called after parse + user confirms. Saves upload + all records + summaries.
  saveImport({ fileName, year, month, uploadedBy, parsedRows }) {
    const ts = now()
    const uploadId = uid()

    // De-duplicate: remove any existing records for same year+month if re-uploading
    const existingRecords = read(KEYS.records).filter(
      (r) => !(r.year === year && r.month === month),
    )
    const existingSummaries = read(KEYS.summaries).filter(
      (s) => !(s.year === year && s.month === month),
    )
    const existingUploads = read(KEYS.uploads).filter(
      (u) => !(u.year === year && u.month === month),
    )

    // Create record rows
    const newRecords = parsedRows
      .filter((r) => r._valid !== false)
      .map((r) => ({
        id: uid(),
        upload_id: uploadId,
        employee_id: r.employee_id,
        employee_name: r.employee_name || '',
        date: r.date,
        year,
        month,
        status: r.status,
        in_time: r.in_time || null,
        out_time: r.out_time || null,
        work_duration: r.work_duration || null,
        work_duration_minutes: toMinutes(r.work_duration),
        late_by: r.late_by || null,
        late_by_minutes: toMinutes(r.late_by),
        early_by: r.early_by || null,
        early_by_minutes: toMinutes(r.early_by),
        overtime: r.overtime || null,
        overtime_minutes: toMinutes(r.overtime),
        shift: r.shift || '',
        corrections: [],
        created_at: ts,
      }))

    // Group records by employee → build per-employee monthly summary
    const byEmployee = {}
    for (const rec of newRecords) {
      if (!byEmployee[rec.employee_id]) byEmployee[rec.employee_id] = []
      byEmployee[rec.employee_id].push(rec)
    }

    const newSummaries = Object.entries(byEmployee).map(([empId, recs]) => ({
      id: uid(),
      upload_id: uploadId,
      employee_id: empId,
      year,
      month,
      ...buildSummary(recs),
      created_at: ts,
    }))

    // Build overall upload-level stats
    const totalEmployees = Object.keys(byEmployee).length
    const uploadDoc = {
      id: uploadId,
      file_name: fileName,
      year,
      month,
      total_records: newRecords.length,
      valid_records: newRecords.length,
      total_employees: totalEmployees,
      uploaded_by: uploadedBy || 'HR',
      uploaded_at: ts,
      status: 'Completed',
    }

    write(KEYS.uploads, [...existingUploads, uploadDoc])
    write(KEYS.records, [...existingRecords, ...newRecords])
    write(KEYS.summaries, [...existingSummaries, ...newSummaries])

    return { uploadId, totalRecords: newRecords.length, totalEmployees }
  },

  // ── records ──────────────────────────────────────────────────────────────────

  listRecords({ employeeId, year, month, page = 1, pageSize = 30 } = {}) {
    let rows = read(KEYS.records)
    if (employeeId) rows = rows.filter((r) => r.employee_id === employeeId)
    if (year) rows = rows.filter((r) => r.year === Number(year))
    if (month) rows = rows.filter((r) => r.month === Number(month))
    rows = rows.sort((a, b) => b.date.localeCompare(a.date))
    const total = rows.length
    const start = (page - 1) * pageSize
    return { items: rows.slice(start, start + pageSize), total }
  },

  // ── summaries ─────────────────────────────────────────────────────────────────

  getSummary(employeeId, year, month) {
    return (
      read(KEYS.summaries).find(
        (s) => s.employee_id === employeeId && s.year === Number(year) && s.month === Number(month),
      ) || null
    )
  },

  getLatestSummary(employeeId) {
    const rows = read(KEYS.summaries)
      .filter((s) => s.employee_id === employeeId)
      .sort((a, b) => b.year - a.year || b.month - a.month)
    return rows[0] || null
  },

  listMonthlySummaries({ year, month } = {}) {
    let rows = read(KEYS.summaries)
    if (year) rows = rows.filter((s) => s.year === Number(year))
    if (month) rows = rows.filter((s) => s.month === Number(month))
    return rows
  },

  // ── corrections ──────────────────────────────────────────────────────────────

  applyCorrection(recordId, { new_status, new_in_time, new_out_time, reason, corrected_by }) {
    const rows = read(KEYS.records)
    const idx = rows.findIndex((r) => r.id === recordId)
    if (idx === -1) throw new Error('Record not found')

    const old = rows[idx]
    const ts = now()

    const correction = {
      id: uid(),
      old_status: old.status,
      new_status: new_status || old.status,
      old_in_time: old.in_time,
      new_in_time: new_in_time || old.in_time,
      old_out_time: old.out_time,
      new_out_time: new_out_time || old.out_time,
      reason: reason || '',
      corrected_by: corrected_by || 'HR',
      corrected_at: ts,
    }

    rows[idx] = {
      ...old,
      status: correction.new_status,
      in_time: correction.new_in_time,
      out_time: correction.new_out_time,
      corrections: [...(old.corrections || []), correction],
      updated_at: ts,
    }

    write(KEYS.records, rows)

    // Rebuild monthly summary for this employee+month
    const allRecords = read(KEYS.records).filter(
      (r) =>
        r.employee_id === rows[idx].employee_id &&
        r.year === rows[idx].year &&
        r.month === rows[idx].month,
    )
    const summaries = read(KEYS.summaries)
    const sIdx = summaries.findIndex(
      (s) =>
        s.employee_id === rows[idx].employee_id &&
        s.year === rows[idx].year &&
        s.month === rows[idx].month,
    )
    if (sIdx !== -1) {
      summaries[sIdx] = {
        ...summaries[sIdx],
        ...buildSummary(allRecords),
        updated_at: ts,
      }
      write(KEYS.summaries, summaries)
    }

    return rows[idx]
  },

  // ── department summary (for dashboard cards) ──────────────────────────────────
  getMonthlySummaryAggregate(year, month) {
    const rows = read(KEYS.summaries).filter(
      (s) => s.year === Number(year) && s.month === Number(month),
    )
    if (rows.length === 0) return null
    // Count employees (not days) — each metric answers "how many employees had this?"
    return {
      total_employees: rows.length,
      clean_count: rows.filter(
        (s) => (s.absent_count || 0) === 0 && (s.late_minutes_total || 0) === 0,
      ).length,
      has_absent: rows.filter((s) => (s.absent_count || 0) > 0).length,
      has_late: rows.filter((s) => (s.late_days || 0) > 0).length,
      has_leave: rows.filter((s) => (s.leave_count || 0) > 0).length,
      // Day-level totals (for reference, not shown on main cards)
      total_absent_days: rows.reduce((sum, s) => sum + (s.absent_count || 0), 0),
      total_late_days: rows.reduce((sum, s) => sum + (s.late_days || 0), 0),
    }
  },

  isValidStatus,
}
