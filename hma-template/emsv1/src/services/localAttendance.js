// localStorage-based attendance store.
// Mirrors: attendance_uploads, attendance_records, attendance_monthly_summary
// Falls back to this when the FastAPI backend is not running.

import { localHolidays } from './localHolidays'
import {
  classifyLateEntry,
  classifyEarlyOut,
  applyWeekendHolidayCorrection,
  validateAttendanceIntegrity,
  computeMonthCoverage,
  computeLateMinutes,
  computeEarlyMinutes,
  computeMonthlyDeductionDetails,
} from './attendanceCalc'
import {
  FREE_LATE_UNITS,
  HALF_DAY_THRESHOLD_MIN,
  EARLY_OUT_HALF_DAY_THRESHOLD_MIN,
} from '../constants/attendancePolicy'

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
const pad2 = (n) => String(n).padStart(2, '0')
// Duration-style "HH:MM" formatter, matching Pace's own late_by string shape.
const fmtHHMM = (min) => (min == null ? null : `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`)

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}
const write = (key, data) => localStorage.setItem(key, JSON.stringify(data))

// ── private helpers ───────────────────────────────────────────────────────────

// Rebuild all employee summaries for a given year+month from current records.
// Called after any bulk-update that changes statuses (e.g. holiday application).
const _rebuildMonthSummaries = (year, month) => {
  const ts = now()
  const allRecords = read(KEYS.records).filter((r) => r.year === year && r.month === month)
  const byEmployee = {}
  for (const r of allRecords) {
    if (!byEmployee[r.employee_id]) byEmployee[r.employee_id] = []
    byEmployee[r.employee_id].push(r)
  }
  const existingSummaries = read(KEYS.summaries)
  const otherSummaries = existingSummaries.filter((s) => !(s.year === year && s.month === month))
  const newSummaries = Object.entries(byEmployee).map(([empId, recs]) => {
    const old = existingSummaries.find(
      (s) => s.employee_id === empId && s.year === year && s.month === month,
    )
    return {
      id: old?.id || uid(),
      upload_id: old?.upload_id || null,
      employee_id: empId,
      year,
      month,
      created_at: old?.created_at || ts,
      ...buildSummary(recs),
      updated_at: ts,
    }
  })
  write(KEYS.summaries, [...otherSummaries, ...newSummaries])
}

// Applies all auto-correction rules to one candidate record before it's
// persisted. Weekend rule only touches 'Absent'; late-entry/early-out rules
// only act on 'Present'; all are no-ops otherwise, so call order doesn't
// matter and re-running this on an already-corrected record is idempotent —
// that's what makes the one-time backfill safe.
//
// Lateness/earliness are derived from in_time/out_time against the official
// shift window, NOT trusted from the punch machine's own "Late By"/"Early By"
// export columns — those have been found to sit blank or unreliable even
// when the punch times themselves are clearly outside the official window.
// The `*ByFallbackMinutes` args (the parsed Pace values) are only used when
// in_time/out_time themselves are missing.
const _applyRecordPolicy = (
  status,
  inTime,
  outTime,
  lateByFallbackMinutes,
  earlyByFallbackMinutes,
  dateStr,
) => {
  const holiday = localHolidays.getDefaultHoliday(dateStr)
  const weekend = applyWeekendHolidayCorrection(status, !!holiday)

  const derivedLateMinutes = computeLateMinutes(inTime)
  const lateMinutes = derivedLateMinutes != null ? derivedLateMinutes : lateByFallbackMinutes || 0
  const late = classifyLateEntry(weekend.status, lateMinutes)

  const derivedEarlyMinutes = computeEarlyMinutes(outTime)
  const earlyMinutes =
    derivedEarlyMinutes != null ? derivedEarlyMinutes : earlyByFallbackMinutes || 0
  const early = classifyEarlyOut(late.status, earlyMinutes)

  const autoCorrections = []
  if (weekend.corrected) {
    autoCorrections.push({
      reason: `Default holiday (${holiday?.name}) — Absent corrected to Weekly Off`,
    })
  }
  if (late.reclassifiedToHalfDay) {
    autoCorrections.push({
      reason: `>${HALF_DAY_THRESHOLD_MIN} min late while Present — reclassified to Half Day`,
    })
  }
  if (early.reclassifiedToHalfDay) {
    autoCorrections.push({
      reason: `>${EARLY_OUT_HALF_DAY_THRESHOLD_MIN} min early punch-out while Present — reclassified to Half Day`,
    })
  }
  // lateMinutes/earlyMinutes are kept for display (e.g. "arrived 75 min late
  // → Half Day") even when status was reclassified — buildSummary already
  // gates its own counting on status === 'Present', so this never leaks into
  // payroll math for a non-Present day.
  return { status: early.status, lateMinutes, earlyMinutes, autoCorrections }
}

// ── helpers ───────────────────────────────────────────────────────────────────

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
    weeklyOffWorked = 0,
    lateDays = 0,
    lateMinTotal = 0,
    lateUnitsTotal = 0,
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
    // WOP/WO½P: scheduled weekly-off worked (full or half day) — reported
    // as part of "Weekly Off" (WO = WO + WOP) without touching present_count.
    if (r.is_weekly_off_type && r.status !== 'Weekly Off') {
      weeklyOffWorked++
    }
    // Late units only ever count on Present days — Absent/Half Day records
    // must never contribute (a record with a stray late_by_minutes value on
    // any other status should not reduce anyone's free-unit pool). Any
    // Present record here is already guaranteed ≤120 min late by
    // _applyRecordPolicy's half-day reclassification, so no upper-bound
    // guard is needed before counting units.
    if (r.status === 'Present' && r.late_by_minutes > 0) {
      lateDays++
      lateMinTotal += r.late_by_minutes
      lateUnitsTotal += Math.ceil(r.late_by_minutes / 15)
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

  // Monthly two-stage deduction pass (free pool, then per-day bracket rate)
  // — needs records in chronological order since the free pool is consumed
  // by whichever late/early days occur first in the month.
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date))
  const deductionDetails = computeMonthlyDeductionDetails(sortedRecords)

  return {
    present_count: present,
    absent_count: absent,
    half_day_count: halfDay,
    weekly_off_count: weeklyOff,
    weekly_off_worked_count: weeklyOffWorked,
    holiday_count: holiday,
    leave_count: leave,
    late_days: lateDays,
    late_hours: fmtDuration(lateMinTotal),
    late_minutes_total: lateMinTotal,
    late_units: lateUnitsTotal,
    excess_late_units: Math.max(0, lateUnitsTotal - FREE_LATE_UNITS),
    late_deduction_hours: deductionDetails.lateDeductionHours,
    early_deduction_hours: deductionDetails.earlyDeductionHours,
    early_days: earlyDays,
    early_hours: fmtDuration(earlyMinTotal),
    total_work_duration: fmtDuration(workMinTotal),
    total_overtime: fmtDuration(otMinTotal),
    avg_working_hours: fmtDuration(avgWorkMin),
    total_records: records.length,
  }
}

// ── integrity / coverage (private, reused by saveImport + public exports) ────

const _getIntegrityWarnings = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate()
  return read(KEYS.summaries)
    .filter((s) => s.year === Number(year) && s.month === Number(month))
    .map((s) => ({
      employee_id: s.employee_id,
      ...validateAttendanceIntegrity({
        presentCount: s.present_count,
        absentCount: s.absent_count,
        halfDayCount: 0, // half_day is already folded into present_count
        leaveCount: s.leave_count,
        weeklyOffCount: s.weekly_off_count,
        holidayCount: s.holiday_count,
        daysInMonth,
      }),
    }))
    .filter((w) => !w.valid)
}

const _getMonthCoverage = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate()
  const allDates = Array.from(
    { length: daysInMonth },
    (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`,
  )
  const holidayMap = localHolidays.getMonthMap(year, month)
  const defaultHolidaySet = new Set(
    Object.keys(holidayMap).filter((d) => holidayMap[d].type !== 'custom'),
  )
  const recordedDateSet = new Set(
    read(KEYS.records)
      .filter((r) => r.year === Number(year) && r.month === Number(month))
      .map((r) => r.date),
  )
  return computeMonthCoverage(allDates, defaultHolidaySet, recordedDateSet)
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
  // Called after parse + user confirms. Upserts records by employee_id+date so
  // a partial (daily/weekly) re-upload for a month merges into what's already
  // there instead of wiping it, applies the weekend/holiday + half-day policy
  // corrections, then rebuilds the month's summaries from ALL of its records.
  saveImport({ fileName, year, month, uploadedBy, parsedRows }) {
    const ts = now()
    const uploadId = uid()

    // Collapse duplicate employee_id+date rows within this file — last wins.
    const dedupedRows = new Map()
    for (const r of parsedRows) {
      if (r._valid === false) continue
      dedupedRows.set(`${r.employee_id}|${r.date}`, r)
    }

    // Upsert into the FULL existing record set (not just this year+month) —
    // only the matched employee+date keys change, everything else survives.
    const existingByKey = new Map()
    for (const rec of read(KEYS.records)) {
      existingByKey.set(`${rec.employee_id}|${rec.date}`, rec)
    }

    let newRecordCount = 0
    const touchedEmployees = new Set()

    for (const [key, r] of dedupedRows) {
      const policy = _applyRecordPolicy(
        r.status,
        r.in_time,
        r.out_time,
        toMinutes(r.late_by),
        toMinutes(r.early_by),
        r.date,
      )
      const existing = existingByKey.get(key)

      const autoCorrectionEntries = policy.autoCorrections.map((c) => ({
        id: uid(),
        old_status: r.status,
        new_status: policy.status,
        reason: c.reason,
        corrected_by: 'System (Attendance Policy)',
        corrected_at: ts,
      }))

      existingByKey.set(key, {
        id: existing?.id || uid(),
        upload_id: uploadId,
        employee_id: r.employee_id,
        employee_name: r.employee_name || '',
        date: r.date,
        year,
        month,
        status: policy.status,
        in_time: r.in_time || null,
        out_time: r.out_time || null,
        work_duration: r.work_duration || null,
        work_duration_minutes: toMinutes(r.work_duration),
        // Derived from in_time vs. official shift start (see _applyRecordPolicy),
        // not Pace's own "Late By" export column — see the comment above.
        late_by: policy.lateMinutes > 0 ? fmtHHMM(policy.lateMinutes) : null,
        late_by_minutes: policy.lateMinutes || 0,
        // Pace's own WO/WOP/WO½P coding — see attendanceParser.js. Kept
        // alongside `status` so weekly-off reporting can count WO+WOP without
        // disturbing present_count (used for payroll).
        is_weekly_off_type: !!r.is_weekly_off_type,
        // Derived from out_time vs. official shift end (see _applyRecordPolicy),
        // not Pace's own "Early By" export column, for the same reason as late_by.
        early_by: policy.earlyMinutes > 0 ? fmtHHMM(policy.earlyMinutes) : null,
        early_by_minutes: policy.earlyMinutes || 0,
        overtime: r.overtime || null,
        overtime_minutes: toMinutes(r.overtime),
        shift: r.shift || '',
        corrections: [...(existing?.corrections || []), ...autoCorrectionEntries],
        created_at: existing?.created_at || ts,
        updated_at: ts,
      })
      touchedEmployees.add(r.employee_id)
      if (!existing) newRecordCount++
    }

    const uploadDoc = {
      id: uploadId,
      file_name: fileName,
      year,
      month,
      total_records: dedupedRows.size,
      valid_records: dedupedRows.size,
      total_employees: touchedEmployees.size,
      uploaded_by: uploadedBy || 'HR',
      uploaded_at: ts,
      status: 'Completed',
    }

    write(KEYS.records, Array.from(existingByKey.values()))
    // Uploads are appended, never deleted, so partial/repeated uploads for a
    // month all remain visible in Upload History.
    write(KEYS.uploads, [...read(KEYS.uploads), uploadDoc])
    _rebuildMonthSummaries(year, month)

    return {
      uploadId,
      totalRecords: dedupedRows.size,
      totalEmployees: touchedEmployees.size,
      newRecords: newRecordCount,
      integrityWarnings: _getIntegrityWarnings(year, month),
    }
  },

  // ── records ──────────────────────────────────────────────────────────────────

  listRecords({ employeeId, year, month, date, page = 1, pageSize = 30 } = {}) {
    let rows = read(KEYS.records)
    if (employeeId) rows = rows.filter((r) => r.employee_id === employeeId)
    if (year) rows = rows.filter((r) => r.year === Number(year))
    if (month) rows = rows.filter((r) => r.month === Number(month))
    if (date) rows = rows.filter((r) => r.date === date)
    // When filtering by a single date, sort by employee ID for easy scanning;
    // otherwise sort newest-first so recent records surface at the top.
    rows = rows.sort((a, b) =>
      date ? a.employee_id.localeCompare(b.employee_id) : b.date.localeCompare(a.date),
    )
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

  applyCorrection(
    recordId,
    { new_status, new_in_time, new_out_time, leave_type, reason, corrected_by },
  ) {
    const rows = read(KEYS.records)
    const idx = rows.findIndex((r) => r.id === recordId)
    if (idx === -1) throw new Error('Record not found')

    const old = rows[idx]
    const ts = now()
    const resolvedStatus = new_status || old.status

    const correction = {
      id: uid(),
      old_status: old.status,
      new_status: resolvedStatus,
      old_leave_type: old.leave_type || null,
      new_leave_type: resolvedStatus === 'On Leave' ? leave_type || null : null,
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
      leave_type: correction.new_leave_type,
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

  // ── integrity / coverage ──────────────────────────────────────────────────
  // Flags any employee-month whose recorded days exceed the calendar days in
  // that month — should never fire under normal upsert operation; a signal
  // of a data/parsing bug if it does.
  getIntegrityWarnings(year, month) {
    return _getIntegrityWarnings(year, month)
  },

  // Working-days coverage for a month (how many non-holiday dates have at
  // least one record yet, and which are still missing) — lets HR see whether
  // a series of daily/weekly uploads has fully covered the month.
  getMonthCoverage(year, month) {
    return _getMonthCoverage(year, month)
  },

  // Publicly expose the existing rebuild helper (previously private-only) —
  // purely additive, no existing call site destructures this module.
  rebuildMonthSummaries(year, month) {
    return _rebuildMonthSummaries(year, month)
  },

  // ── holiday calendar integration ─────────────────────────────────────────────
  // Called by GeneralCalendar when HR adds a custom holiday.
  // Flips every Absent record on that date to Holiday so no deduction is applied.
  // Stores the original status so revertHolidayFromDate can undo the change.
  applyHolidayToDate(date, holidayName) {
    const d = new Date(date + 'T00:00:00')
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const rows = read(KEYS.records)
    const ts = now()
    let count = 0
    const updated = rows.map((r) => {
      if (r.date !== date || r.status !== 'Absent') return r
      count++
      return {
        ...r,
        pre_holiday_status: r.status,
        status: 'Holiday',
        corrections: [
          ...(r.corrections || []),
          {
            id: uid(),
            old_status: r.status,
            new_status: 'Holiday',
            reason: `Company holiday: ${holidayName}`,
            corrected_by: 'Holiday Calendar',
            corrected_at: ts,
          },
        ],
        updated_at: ts,
      }
    })
    if (count > 0) {
      write(KEYS.records, updated)
      _rebuildMonthSummaries(year, month)
    }
    return count
  },

  // Called by GeneralCalendar when HR removes a custom holiday.
  // Reverts only records that were changed by applyHolidayToDate (have pre_holiday_status set).
  revertHolidayFromDate(date) {
    const d = new Date(date + 'T00:00:00')
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const rows = read(KEYS.records)
    const ts = now()
    let count = 0
    const updated = rows.map((r) => {
      if (r.date !== date || !r.pre_holiday_status) return r
      count++
      const original = r.pre_holiday_status
      return {
        ...r,
        status: original,
        pre_holiday_status: undefined,
        corrections: [
          ...(r.corrections || []),
          {
            id: uid(),
            old_status: 'Holiday',
            new_status: original,
            reason: 'Holiday removed from calendar',
            corrected_by: 'Holiday Calendar',
            corrected_at: ts,
          },
        ],
        updated_at: ts,
      }
    })
    if (count > 0) {
      write(KEYS.records, updated)
      _rebuildMonthSummaries(year, month)
    }
    return count
  },

  isValidStatus,
}

// ── one-time backfill ──────────────────────────────────────────────────────
// Runs the weekend/holiday + half-day + in_time-derived-lateness policy over
// whatever attendance data is already sitting in this browser (imported
// before this policy existed). Flag-guarded so it only ever runs once, and
// safe to re-run regardless (every underlying rule is an idempotent no-op
// once already applied) — same pattern as seedLocalEmployees.js's migrations.
//
// v3 bump: v1 only corrected status; v2 also recomputed late_by/late_by_minutes
// from in_time instead of trusting Pace's own (sometimes blank) Late By column;
// v3 additionally recomputes early_by/early_by_minutes from out_time and
// applies the >120min half-day thresholds and the new late/early bracket
// deduction schedule — bumping the flag key makes this re-run even for
// browsers that already completed v1/v2.
const WEEKEND_HOLIDAY_BACKFILL_FLAG = 'hma_attendance_weekend_holiday_backfill_v3'

export const applyWeekendHolidayBackfill = () => {
  if (localStorage.getItem(WEEKEND_HOLIDAY_BACKFILL_FLAG)) return
  try {
    const rows = read(KEYS.records)
    const affectedMonths = new Set()
    const ts = now()

    const updated = rows.map((r) => {
      const policy = _applyRecordPolicy(
        r.status,
        r.in_time,
        r.out_time,
        r.late_by_minutes,
        r.early_by_minutes,
        r.date,
      )
      const statusChanged = policy.status !== r.status
      const lateChanged = (policy.lateMinutes || 0) !== (r.late_by_minutes || 0)
      const earlyChanged = (policy.earlyMinutes || 0) !== (r.early_by_minutes || 0)
      if (!statusChanged && !lateChanged && !earlyChanged) return r

      affectedMonths.add(`${r.year}-${r.month}`)
      const reasons = policy.autoCorrections.map((c) => c.reason)
      // A pure lateness/earliness fix (status unchanged) isn't covered by any
      // reason above — record it explicitly so the audit trail explains why
      // late_by/early_by changed on an otherwise-untouched record.
      if (!statusChanged && lateChanged) {
        reasons.push(
          `Late-by recomputed from in_time vs. official shift start (was ${r.late_by_minutes || 0} min, now ${policy.lateMinutes} min) — punch machine's own Late By column was unreliable`,
        )
      }
      if (!statusChanged && earlyChanged) {
        reasons.push(
          `Early-by recomputed from out_time vs. official shift end (was ${r.early_by_minutes || 0} min, now ${policy.earlyMinutes} min) — punch machine's own Early By column was unreliable`,
        )
      }
      const autoCorrectionEntries = reasons.map((reason) => ({
        id: uid(),
        old_status: r.status,
        new_status: policy.status,
        reason,
        corrected_by: 'System (Attendance Policy Backfill)',
        corrected_at: ts,
      }))
      return {
        ...r,
        status: policy.status,
        late_by: policy.lateMinutes > 0 ? fmtHHMM(policy.lateMinutes) : null,
        late_by_minutes: policy.lateMinutes || 0,
        early_by: policy.earlyMinutes > 0 ? fmtHHMM(policy.earlyMinutes) : null,
        early_by_minutes: policy.earlyMinutes || 0,
        corrections: [...(r.corrections || []), ...autoCorrectionEntries],
        updated_at: ts,
      }
    })

    write(KEYS.records, updated)
    for (const key of affectedMonths) {
      const [y, m] = key.split('-').map(Number)
      _rebuildMonthSummaries(y, m)
    }
    localStorage.setItem(WEEKEND_HOLIDAY_BACKFILL_FLAG, '1')
  } catch (err) {
    console.warn('[applyWeekendHolidayBackfill] Failed:', err)
  }
}
