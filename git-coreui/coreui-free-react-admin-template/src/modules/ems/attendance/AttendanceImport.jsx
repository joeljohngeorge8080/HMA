import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CProgress,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCheckCircle, cilCloudUpload, cilWarning, cilX } from '@coreui/icons'
import { useSelector } from 'react-redux'

import { usePermission } from '../../hooks/usePermission'
import { MODULE } from '../../constants/modules'
import { parseAttendanceExcel } from '../../services/attendanceParser'
import { localAttendance } from '../../services/localAttendance'
import { localEmployees } from '../../services/localEmployees'
import api from '../../services/api'

// ─── Business Rules constants (03_Business_Rules.md) ─────────────────────────
const FREE_LATE_UNITS = 7 // free units per month
const LATE_UNIT_MIN = 15 // 1 unit = 15 minutes
const HALF_DAY_THRESHOLD_MIN = 60 // ≥60 min late → Half Day (priority rule)
const HALF_DAY_DEDUCTION_HOURS = 4 // Half Day = 4 hrs deduction
const CL_MONTHLY_LIMIT = 1 // Casual Leave: 1 per month

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toMin = (hhmm) => {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const fmtHHMM = (totalMin) => {
  if (!totalMin) return '—'
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const fmtHrs = (min) => (min / 60).toFixed(2)

// Generate plain-language remarks explaining each deduction trigger.
// Salary figures are symbolic (× DS / × HS) since actual salary is in Payroll module.
const generateRemarks = (e) => {
  const remarks = []

  // ── Absent deduction ──────────────────────────────────────────────────────
  // Leave excess: on_leave > monthly limit → excess treated as Absent
  const leaveExcess = Math.max(0, e.on_leave - CL_MONTHLY_LIMIT)
  const effectiveAbsent = e.absent + leaveExcess

  if (e.on_leave > CL_MONTHLY_LIMIT) {
    remarks.push({
      type: 'leave',
      icon: '📋',
      label: 'Leave Exceeded',
      text:
        `Leave used: ${e.on_leave} day${e.on_leave > 1 ? 's' : ''} (monthly limit: ${CL_MONTHLY_LIMIT}). ` +
        `${leaveExcess} excess day${leaveExcess > 1 ? 's' : ''} treated as Absent.`,
    })
  }

  if (effectiveAbsent > 0) {
    remarks.push({
      type: 'absent',
      icon: '🔴',
      label: 'Absent Deduction',
      text:
        `${effectiveAbsent} absent day${effectiveAbsent > 1 ? 's' : ''}` +
        (leaveExcess > 0 ? ` (${e.absent} actual + ${leaveExcess} from excess leave)` : '') +
        ` → Deduction = ${effectiveAbsent} × Daily Salary (DS)`,
    })
  }

  // ── Half Day deduction (Priority Rule) ────────────────────────────────────
  // Pace-marked Half Days + HMA rule violations (≥60 min late but marked Present)
  const totalHalfDays = e.half_day + e.hd_violations.length

  if (totalHalfDays > 0) {
    const parts = []
    if (e.half_day > 0) parts.push(`${e.half_day} marked by Pace`)
    if (e.hd_violations.length > 0) {
      const dates = e.hd_violations.map((v) => `${v.date} (${v.late_by} late)`).join(', ')
      parts.push(
        `${e.hd_violations.length} HMA rule violation${e.hd_violations.length > 1 ? 's' : ''}: ${dates}`,
      )
    }
    remarks.push({
      type: 'halfday',
      icon: '🟠',
      label: 'Half Day Deduction',
      text:
        `${totalHalfDays} Half Day${totalHalfDays > 1 ? 's' : ''} (${parts.join(' + ')}). ` +
        `Rule: arrived ≥60 min late → 4-hr deduction (priority over late units). ` +
        `Deduction = ${totalHalfDays} × ${HALF_DAY_DEDUCTION_HOURS} × Hourly Salary (HS)`,
    })
  }

  // ── Late entry deduction (excess units only; HD days excluded by priority rule) ──
  if (e.excess_units > 0) {
    const excessHrs = fmtHrs(e.excess_units * LATE_UNIT_MIN)
    remarks.push({
      type: 'late',
      icon: '🟡',
      label: 'Late Entry Deduction',
      text:
        `Late units used: ${e.normal_late_units} (7 free). ` +
        `Excess: ${e.excess_units} unit${e.excess_units > 1 ? 's' : ''} ` +
        `(${e.excess_units} × 15 min = ${e.excess_units * LATE_UNIT_MIN} min = ${excessHrs} hrs). ` +
        `Deduction = ${excessHrs} × HS`,
    })
  } else if (e.normal_late_units > 0) {
    remarks.push({
      type: 'late_ok',
      icon: '🟢',
      label: 'Late Entry — Within Limit',
      text: `Late units used: ${e.normal_late_units} / 7 free. ` + `No deduction.`,
    })
  }

  if (remarks.filter((r) => ['absent', 'halfday', 'late'].includes(r.type)).length === 0) {
    remarks.push({
      type: 'clean',
      icon: '✅',
      label: 'No Deductions',
      text: 'Full salary. No absent days, no excess late units, no half-day triggers.',
    })
  }

  return remarks
}

// ─── Core summary builder ────────────────────────────────────────────────────
const buildEmployeeSummaries = (rows) => {
  const map = {}

  for (const r of rows) {
    if (!map[r.employee_id]) {
      map[r.employee_id] = {
        employee_id: r.employee_id,
        employee_name: r.employee_name,
        present: 0,
        absent: 0,
        half_day: 0,
        weekly_off: 0,
        holiday: 0,
        on_leave: 0,
        // Late split: normal (<60 min) vs half-day (≥60 min, priority rule applies)
        normal_late_days: 0,
        normal_late_minutes: 0, // <60 min late days → contribute to units
        hd_violations: [], // ≥60 min late but Pace marked Present → HD rule
        total_work_minutes: 0,
        work_days_with_duration: 0,
      }
    }

    const e = map[r.employee_id]

    switch (r.status) {
      case 'Present':
        e.present++
        break
      case 'Absent':
        e.absent++
        break
      case 'Half Day':
        e.half_day++
        break
      case 'Weekly Off':
        e.weekly_off++
        break
      case 'Holiday':
        e.holiday++
        break
      case 'On Leave':
        e.on_leave++
        break
    }

    if (r.late_by) {
      const lateMin = toMin(r.late_by)
      if (lateMin > 0) {
        if (lateMin >= HALF_DAY_THRESHOLD_MIN && r.status === 'Present') {
          // Priority Rule: ≥60 min late → Half Day; these minutes do NOT count as late units
          e.hd_violations.push({ date: r.date, late_by: r.late_by, lateMin })
        } else {
          // Normal late entry <60 min → counts toward 7 free units
          e.normal_late_days++
          e.normal_late_minutes += lateMin
        }
      }
    }

    if (r.work_duration) {
      const wMin = toMin(r.work_duration)
      if (wMin > 0) {
        e.total_work_minutes += wMin
        e.work_days_with_duration++
      }
    }
  }

  return Object.values(map)
    .map((e) => {
      const totalLateUnits = Math.ceil(e.normal_late_minutes / LATE_UNIT_MIN)
      const excessUnits = Math.max(0, totalLateUnits - FREE_LATE_UNITS)
      const avgWorkMin =
        e.work_days_with_duration > 0
          ? Math.round(e.total_work_minutes / e.work_days_with_duration)
          : 0

      const enriched = {
        ...e,
        normal_late_units: totalLateUnits,
        excess_units: excessUnits,
        free_units_remaining: Math.max(0, FREE_LATE_UNITS - totalLateUnits),
        total_half_days: e.half_day + e.hd_violations.length,
        effective_absent: e.absent + Math.max(0, e.on_leave - CL_MONTHLY_LIMIT),
        avg_work_hhmm: fmtHHMM(avgWorkMin),
        normal_late_hhmm: fmtHHMM(e.normal_late_minutes),
      }
      enriched.remarks = generateRemarks(enriched)
      enriched.has_deduction = enriched.remarks.some((r) =>
        ['absent', 'halfday', 'late'].includes(r.type),
      )
      return enriched
    })
    .sort((a, b) => a.employee_id.localeCompare(b.employee_id))
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const thisYear = new Date().getFullYear()
const thisMonth = new Date().getMonth() + 1
const YEARS = [thisYear - 1, thisYear, thisYear + 1]

const STATUS_COLORS = {
  Present: 'success',
  Absent: 'danger',
  'Half Day': 'warning',
  'Weekly Off': 'secondary',
  Holiday: 'info',
  'On Leave': 'primary',
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const Step = ({ n, label, active, done }) => (
  <div className="d-flex align-items-center gap-2">
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: done
          ? 'var(--cui-success)'
          : active
            ? 'var(--cui-primary)'
            : 'var(--cui-border-color)',
        color: done || active ? '#fff' : 'var(--cui-body-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {done ? '✓' : n}
    </div>
    <span className={`small ${active ? 'fw-semibold' : 'text-body-secondary'}`}>{label}</span>
  </div>
)

// ─── Deduction Summary component (Step 4) ────────────────────────────────────
// For each employee, looks up their current_salary from local store and
// calculates the exact deduction. Employees with no salary record show as
// "Salary not on file" — the total only sums rows where salary is known.
const DeductionSummary = ({ summaries, month, year }) => {
  const rows = summaries.map((e) => {
    // Working days = all days excluding weekly off + holidays
    const workingDays = e.present + e.absent + e.half_day + e.on_leave + e.hd_violations.length

    let salary = null
    try {
      const emp = localEmployees.getById(e.employee_id)
      salary = emp?.current_salary ? parseFloat(emp.current_salary) : null
    } catch {
      salary = null
    }

    let deduction = null
    if (salary !== null && workingDays > 0) {
      const ds = salary / workingDays // Daily Salary
      const hs = ds / 8 // Hourly Salary

      const absentDeduction = e.effective_absent * ds
      const hdDeduction = e.total_half_days * HALF_DAY_DEDUCTION_HOURS * hs
      const lateDeduction = ((e.excess_units * LATE_UNIT_MIN) / 60) * hs

      deduction = absentDeduction + hdDeduction + lateDeduction
    }

    return { ...e, salary, deduction, workingDays }
  })

  const knownRows = rows.filter((r) => r.deduction !== null)
  const missingCount = rows.length - knownRows.length
  const totalDeduction = knownRows.reduce((sum, r) => sum + r.deduction, 0)
  const deductionRows = rows.filter((r) => r.has_deduction)

  return (
    <CCard>
      <CCardHeader className="d-flex align-items-center justify-content-between">
        <strong>
          Salary Deduction Summary —{' '}
          {
            [
              '',
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
            ][month]
          }{' '}
          {year}
        </strong>
        <span className="text-body-secondary small">
          {deductionRows.length} of {rows.length} employees have deductions
        </span>
      </CCardHeader>
      <CCardBody className="p-0">
        {missingCount > 0 && (
          <div className="px-3 py-2 border-bottom bg-warning-subtle small text-dark">
            ⚠️ {missingCount} employee{missingCount > 1 ? 's' : ''} missing salary data — their
            deductions are excluded from the total. Add salary via Staff → Employee Profile → Salary
            tab.
          </div>
        )}

        <CTable hover bordered small className="mb-0">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell>Employee</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Monthly Salary</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Working Days</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Daily Salary (DS)</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Absent</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Half Days</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Excess Late</CTableHeaderCell>
              <CTableHeaderCell className="text-center fw-bold">Total Deduction</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {rows.map((r) => {
              const hasSalary = r.salary !== null && r.workingDays > 0
              const ds = hasSalary ? r.salary / r.workingDays : null
              const hs = ds ? ds / 8 : null
              const absentAmt = hasSalary ? r.effective_absent * ds : null
              const hdAmt = hasSalary ? r.total_half_days * HALF_DAY_DEDUCTION_HOURS * hs : null
              const lateAmt = hasSalary ? ((r.excess_units * LATE_UNIT_MIN) / 60) * hs : null

              return (
                <CTableRow
                  key={r.employee_id}
                  className={r.has_deduction && hasSalary ? 'table-danger' : ''}
                >
                  <CTableDataCell>
                    <div className="fw-semibold small">{r.employee_id}</div>
                    <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                      {r.employee_name}
                    </div>
                  </CTableDataCell>
                  <CTableDataCell className="text-center small">
                    {r.salary !== null ? (
                      `₹ ${r.salary.toLocaleString('en-IN')}`
                    ) : (
                      <span className="text-danger small">Not on file</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-center small text-body-secondary">
                    {r.workingDays}
                  </CTableDataCell>
                  <CTableDataCell className="text-center small">
                    {ds ? `₹ ${ds.toFixed(2)}` : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-center small">
                    {absentAmt > 0 ? (
                      <span className="text-danger">− ₹ {absentAmt.toFixed(2)}</span>
                    ) : (
                      <span className="text-body-secondary">—</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-center small">
                    {hdAmt > 0 ? (
                      <span className="text-dark">− ₹ {hdAmt.toFixed(2)}</span>
                    ) : (
                      <span className="text-body-secondary">—</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-center small">
                    {lateAmt > 0 ? (
                      <span className="text-dark">− ₹ {lateAmt.toFixed(2)}</span>
                    ) : (
                      <span className="text-body-secondary">—</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {r.deduction !== null ? (
                      r.deduction > 0 ? (
                        <CBadge color="danger">− ₹ {r.deduction.toFixed(2)}</CBadge>
                      ) : (
                        <CBadge color="success">No deduction</CBadge>
                      )
                    ) : (
                      <span className="text-body-secondary small">—</span>
                    )}
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
          <tfoot>
            <tr style={{ background: 'var(--cui-tertiary-bg, #f8f9fa)', fontWeight: 600 }}>
              <td colSpan={7} className="px-3 py-2 text-end">
                Total Deduction
                {missingCount > 0 && (
                  <span className="fw-normal text-body-secondary ms-2 small">
                    ({knownRows.length} of {rows.length} employees)
                  </span>
                )}
              </td>
              <td className="text-center px-3 py-2">
                {knownRows.length > 0 ? (
                  <span className="text-danger fs-6">
                    − ₹{' '}
                    {totalDeduction.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : (
                  <span className="text-body-secondary small">No salary data yet</span>
                )}
              </td>
            </tr>
          </tfoot>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

const STEPS = [
  'Select Period',
  'Upload & Validate',
  'Preview',
  'Employee Analysis',
  'Confirm & Import',
]

// ─── Main component ───────────────────────────────────────────────────────────

const AttendanceImport = () => {
  const navigate = useNavigate()
  const canEdit = usePermission(MODULE.ATTENDANCE, 'edit')
  const currentUser = useSelector((s) => s.user)

  const [step, setStep] = useState(0)
  const [year, setYear] = useState(thisYear)
  const [month, setMonth] = useState(thisMonth)

  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseErrors, setParseErrors] = useState([])
  const [parseWarnings, setParseWarnings] = useState([])
  const [parsedRows, setParsedRows] = useState([])
  const [periodMismatch, setPeriodMismatch] = useState(null)

  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [analysisFilter, setAnalysisFilter] = useState('all') // 'all' | 'deductions' | 'clean'

  const fileInputRef = useRef(null)

  if (!canEdit) {
    return (
      <CAlert color="danger">
        <strong>Access Denied.</strong> Only HR may import attendance.
      </CAlert>
    )
  }

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFileDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer?.files[0] || e.target.files[0]
    if (!dropped) return
    if (!dropped.name.match(/\.(xlsx|xls)$/i)) {
      setParseErrors(['Only .xlsx or .xls files are accepted.'])
      return
    }
    setFile(dropped)
    setParseErrors([])
    setParseWarnings([])
  }

  // ── Parse ────────────────────────────────────────────────────────────────────

  const handleParse = async () => {
    if (!file) return
    setParsing(true)
    setParseErrors([])
    setParsedRows([])
    setPeriodMismatch(null)
    try {
      const { rows, errors, warnings, detectedYear, detectedMonth } =
        await parseAttendanceExcel(file)
      setParseErrors(errors)
      setParseWarnings(warnings)
      setParsedRows(rows)

      if (errors.length === 0 && rows.length > 0) {
        if (detectedYear && detectedMonth) {
          if (detectedYear !== year || detectedMonth !== month) {
            setPeriodMismatch({ detectedYear, detectedMonth })
          }
          setYear(detectedYear)
          setMonth(detectedMonth)
        }
        setStep(2)
      }
    } catch (err) {
      setParseErrors([err.message])
    } finally {
      setParsing(false)
    }
  }

  // ── Confirm import ───────────────────────────────────────────────────────────

  const handleConfirmImport = async () => {
    setSaving(true)
    try {
      try {
        await api.post('/attendance/import', {
          file_name: file.name,
          year,
          month,
          rows: parsedRows,
        })
      } catch {
        localAttendance.saveImport({
          fileName: file.name,
          year,
          month,
          uploadedBy: currentUser?.full_name || currentUser?.employee_id || 'HR',
          parsedRows,
        })
      }
      setSaveResult({ success: true, count: parsedRows.length })
      setStep(4)
    } catch (err) {
      setSaveResult({ success: false, message: err.message })
      setStep(4)
    } finally {
      setSaving(false)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const statusCounts = parsedRows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  const uniqueEmployees = [...new Set(parsedRows.map((r) => r.employee_id))].length

  // Only computed when entering step 3 (employee analysis)
  const employeeSummaries = step >= 3 ? buildEmployeeSummaries(parsedRows) : []
  const withDeductions = employeeSummaries.filter((e) => e.has_deduction)
  const cleanEmployees = employeeSummaries.filter((e) => !e.has_deduction)
  const filteredSummaries =
    analysisFilter === 'deductions'
      ? withDeductions
      : analysisFilter === 'clean'
        ? cleanEmployees
        : employeeSummaries

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <CRow className="mb-3 align-items-center">
        <CCol>
          <CButton
            color="link"
            className="ps-0 text-decoration-none"
            onClick={() => navigate('/attendance')}
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Attendance
          </CButton>
        </CCol>
      </CRow>

      <h4 className="mb-3">Import Attendance Excel</h4>

      {/* Step indicator */}
      <CCard className="mb-4">
        <CCardBody className="py-3">
          <div className="d-flex gap-4 flex-wrap">
            {STEPS.map((label, i) => (
              <Step key={label} n={i + 1} label={label} active={step === i} done={step > i} />
            ))}
          </div>
          <CProgress
            value={((step + 1) / STEPS.length) * 100}
            className="mt-3"
            style={{ height: 4 }}
          />
        </CCardBody>
      </CCard>

      {/* ── Step 0: Select Period ─────────────────────────────────────────────── */}
      {step === 0 && (
        <CCard>
          <CCardHeader>
            <strong>Step 1 — Select Month &amp; Year</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-4">
              <CCol md={3}>
                <label className="fw-semibold small mb-1 d-block">Month</label>
                <CFormSelect value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <label className="fw-semibold small mb-1 d-block">Year</label>
                <CFormSelect value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
            <CButton color="primary" onClick={() => setStep(1)}>
              Continue →
            </CButton>
          </CCardBody>
        </CCard>
      )}

      {/* ── Step 1: Upload ────────────────────────────────────────────────────── */}
      {step === 1 && (
        <CCard>
          <CCardHeader>
            <strong>
              Step 2 — Upload Pace Excel File ({MONTHS[month - 1]} {year})
            </strong>
          </CCardHeader>
          <CCardBody>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--cui-border-color)',
                borderRadius: 8,
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--cui-tertiary-bg, #f8f9fa)',
              }}
            >
              <CIcon icon={cilCloudUpload} style={{ width: 40, height: 40, opacity: 0.4 }} />
              <div className="mt-2 fw-semibold">
                {file ? file.name : 'Drop your Excel file here, or click to browse'}
              </div>
              <div className="text-body-secondary small mt-1">Accepts .xlsx and .xls</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileDrop}
              />
            </div>

            {parseErrors.length > 0 && (
              <CAlert color="danger" className="mt-3">
                <CIcon icon={cilX} className="me-2" />
                <strong>Validation errors:</strong>
                <ul className="mb-0 mt-1">
                  {parseErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </CAlert>
            )}

            {parseWarnings.length > 0 && (
              <CAlert color="warning" className="mt-3 small">
                <CIcon icon={cilWarning} className="me-2" />
                <strong>Warnings ({parseWarnings.length}):</strong>
                <ul className="mb-0 mt-1">
                  {parseWarnings.slice(0, 5).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {parseWarnings.length > 5 && <li>…and {parseWarnings.length - 5} more</li>}
                </ul>
              </CAlert>
            )}

            <div className="d-flex gap-2 mt-3">
              <CButton color="secondary" variant="outline" onClick={() => setStep(0)}>
                ← Back
              </CButton>
              <CButton color="primary" onClick={handleParse} disabled={!file || parsing}>
                {parsing && <CSpinner size="sm" className="me-2" />}
                Validate &amp; Parse
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* ── Step 2: Raw Preview ───────────────────────────────────────────────── */}
      {step === 2 && (
        <CCard>
          <CCardHeader>
            <strong>
              Step 3 — Preview ({parsedRows.length} records, {uniqueEmployees} employees)
            </strong>
          </CCardHeader>
          <CCardBody>
            {periodMismatch ? (
              <CAlert color="warning" className="small mb-3 py-2">
                <CIcon icon={cilWarning} className="me-1" />
                Period mismatch: you selected{' '}
                <strong>
                  {MONTHS[month - 1]} {year}
                </strong>{' '}
                but the file contains data for{' '}
                <strong>
                  {MONTHS[periodMismatch.detectedMonth - 1]} {periodMismatch.detectedYear}
                </strong>
                . Period has been auto-corrected to match the file.
              </CAlert>
            ) : (
              <CAlert color="success" className="small mb-3 py-2">
                Period auto-detected from file:{' '}
                <strong>
                  {MONTHS[month - 1]} {year}
                </strong>
              </CAlert>
            )}

            <div className="d-flex flex-wrap gap-2 mb-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <CBadge
                  key={status}
                  color={STATUS_COLORS[status] || 'secondary'}
                  className="fs-6 px-3 py-1"
                >
                  {status}: {count}
                </CBadge>
              ))}
            </div>

            {parseWarnings.length > 0 && (
              <CAlert color="warning" className="small mb-3 py-2">
                <CIcon icon={cilWarning} className="me-1" />
                {parseWarnings.length} rows were skipped (duplicates or empty IDs).
              </CAlert>
            )}

            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              <CTable hover responsive bordered small>
                <CTableHead color="light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <CTableRow>
                    <CTableHeaderCell>Emp ID</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>In</CTableHeaderCell>
                    <CTableHeaderCell>Out</CTableHeaderCell>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableHeaderCell>Late By</CTableHeaderCell>
                    <CTableHeaderCell>OT</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {parsedRows.slice(0, 50).map((r, i) => (
                    <CTableRow key={i}>
                      <CTableDataCell className="fw-semibold">{r.employee_id}</CTableDataCell>
                      <CTableDataCell>{r.employee_name || '—'}</CTableDataCell>
                      <CTableDataCell>{r.date}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={STATUS_COLORS[r.status] || 'secondary'}>{r.status}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{r.in_time || '—'}</CTableDataCell>
                      <CTableDataCell>{r.out_time || '—'}</CTableDataCell>
                      <CTableDataCell>{r.work_duration || '—'}</CTableDataCell>
                      <CTableDataCell>
                        {r.late_by ? <CBadge color="warning">{r.late_by}</CBadge> : '—'}
                      </CTableDataCell>
                      <CTableDataCell>{r.overtime || '—'}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
            {parsedRows.length > 50 && (
              <p className="text-body-secondary small mt-2">
                Showing first 50 of {parsedRows.length} records.
              </p>
            )}

            <div className="d-flex gap-2 mt-3">
              <CButton color="secondary" variant="outline" onClick={() => setStep(1)}>
                ← Back
              </CButton>
              <CButton color="primary" onClick={() => setStep(3)}>
                Next: Employee Analysis →
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* ── Step 3: Employee Analysis ─────────────────────────────────────────── */}
      {step === 3 && (
        <>
          {/* Summary counts */}
          <CRow className="g-3 mb-3">
            <CCol xs={4}>
              <CCard className="border-top border-top-primary border-3 text-center h-100">
                <CCardBody className="py-2">
                  <div className="fs-3 fw-bold text-primary">{employeeSummaries.length}</div>
                  <div className="small text-body-secondary">Total Employees</div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={4}>
              <CCard className="border-top border-top-danger border-3 text-center h-100">
                <CCardBody className="py-2">
                  <div className="fs-3 fw-bold text-danger">{withDeductions.length}</div>
                  <div className="small text-body-secondary">Have Deductions</div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={4}>
              <CCard className="border-top border-top-success border-3 text-center h-100">
                <CCardBody className="py-2">
                  <div className="fs-3 fw-bold text-success">{cleanEmployees.length}</div>
                  <div className="small text-body-secondary">No Deductions</div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* Rules legend */}
          <CCard className="mb-3 border-start border-start-info border-3">
            <CCardBody className="py-2 px-3 small text-body-secondary">
              <strong className="text-body me-2">Rules applied:</strong>
              DS = Monthly Salary ÷ Working Days &nbsp;·&nbsp; HS = DS ÷ 8 &nbsp;·&nbsp; 7 free late
              units/month (1 unit = 15 min) &nbsp;·&nbsp; ≥60 min late = Half Day (HS × 4),
              overrides late unit rule
            </CCardBody>
          </CCard>

          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <strong>
                Employee Deduction Analysis — {MONTHS[month - 1]} {year}
              </strong>
              {/* Filter */}
              <div className="d-flex gap-1">
                {[
                  { key: 'all', label: `All (${employeeSummaries.length})` },
                  { key: 'deductions', label: `Has Deductions (${withDeductions.length})` },
                  { key: 'clean', label: `Clean (${cleanEmployees.length})` },
                ].map(({ key, label }) => (
                  <CButton
                    key={key}
                    size="sm"
                    color={analysisFilter === key ? 'primary' : 'secondary'}
                    variant={analysisFilter === key ? undefined : 'outline'}
                    onClick={() => setAnalysisFilter(key)}
                  >
                    {label}
                  </CButton>
                ))}
              </div>
            </CCardHeader>
            <CCardBody className="p-0">
              <CTable hover bordered small className="mb-0">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell style={{ minWidth: 160 }}>Employee</CTableHeaderCell>
                    <CTableHeaderCell style={{ minWidth: 160 }}>Attendance</CTableHeaderCell>
                    <CTableHeaderCell style={{ minWidth: 160 }}>Late Entry</CTableHeaderCell>
                    <CTableHeaderCell style={{ minWidth: 120 }}>Deductions</CTableHeaderCell>
                    <CTableHeaderCell style={{ minWidth: 300 }}>
                      Remarks (How &amp; Why)
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredSummaries.map((e) => (
                    <CTableRow key={e.employee_id}>
                      {/* Employee */}
                      <CTableDataCell>
                        <div className="fw-semibold small">{e.employee_id}</div>
                        <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                          {e.employee_name}
                        </div>
                      </CTableDataCell>

                      {/* Attendance compact */}
                      <CTableDataCell>
                        <div className="d-flex flex-wrap gap-1" style={{ fontSize: '0.75rem' }}>
                          <span className="text-success fw-semibold">{e.present}P</span>
                          {e.absent > 0 && <CBadge color="danger">{e.absent}A</CBadge>}
                          {e.total_half_days > 0 && (
                            <CBadge color="warning" className="text-dark">
                              {e.total_half_days}HD
                            </CBadge>
                          )}
                          {e.on_leave > 0 && <CBadge color="primary">{e.on_leave}L</CBadge>}
                          <span className="text-body-secondary">{e.weekly_off}WO</span>
                        </div>
                        <div className="text-body-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                          Avg: {e.avg_work_hhmm}
                        </div>
                      </CTableDataCell>

                      {/* Late entry */}
                      <CTableDataCell>
                        {e.normal_late_days === 0 && e.hd_violations.length === 0 ? (
                          <span className="text-body-secondary small">No late days</span>
                        ) : (
                          <div style={{ fontSize: '0.75rem' }}>
                            {e.normal_late_days > 0 && (
                              <div>
                                <span className="fw-semibold">{e.normal_late_days}</span> late day
                                {e.normal_late_days > 1 ? 's' : ''}
                                <span className="text-body-secondary ms-1">
                                  ({e.normal_late_hhmm})
                                </span>
                              </div>
                            )}
                            {e.normal_late_units > 0 && (
                              <div>
                                Units: {e.normal_late_units} / 7
                                {e.excess_units > 0 ? (
                                  <CBadge color="danger" className="ms-1">
                                    +{e.excess_units} excess
                                  </CBadge>
                                ) : (
                                  <CBadge color="success" className="ms-1">
                                    OK
                                  </CBadge>
                                )}
                              </div>
                            )}
                            {e.hd_violations.length > 0 && (
                              <CBadge color="warning" className="mt-1 text-dark">
                                {e.hd_violations.length} ≥60 min (HD rule)
                              </CBadge>
                            )}
                          </div>
                        )}
                      </CTableDataCell>

                      {/* Deduction badges */}
                      <CTableDataCell>
                        <div className="d-flex flex-column gap-1">
                          {e.remarks
                            .filter((r) => ['absent', 'halfday', 'late'].includes(r.type))
                            .map((r, i) => (
                              <CBadge
                                key={i}
                                color={
                                  r.type === 'absent'
                                    ? 'danger'
                                    : r.type === 'halfday'
                                      ? 'warning'
                                      : 'dark'
                                }
                                className={`text-start text-wrap${r.type === 'halfday' ? ' text-dark' : ''}`}
                                style={{ fontSize: '0.72rem', whiteSpace: 'normal' }}
                              >
                                {r.icon} {r.label}
                              </CBadge>
                            ))}
                          {!e.has_deduction && (
                            <CBadge color="success" style={{ fontSize: '0.72rem' }}>
                              No deductions
                            </CBadge>
                          )}
                        </div>
                      </CTableDataCell>

                      {/* Remarks */}
                      <CTableDataCell>
                        <div className="d-flex flex-column gap-2">
                          {e.remarks.map((r, i) => (
                            <div key={i} style={{ fontSize: '0.75rem' }}>
                              <span
                                className={
                                  r.type === 'absent'
                                    ? 'text-danger fw-semibold'
                                    : r.type === 'halfday'
                                      ? 'fw-semibold'
                                      : r.type === 'late'
                                        ? 'fw-semibold'
                                        : r.type === 'clean'
                                          ? 'text-success'
                                          : 'text-body-secondary'
                                }
                              >
                                {r.icon} {r.label}:{' '}
                              </span>
                              <span className="text-body-secondary">{r.text}</span>
                            </div>
                          ))}
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>

          <div className="d-flex gap-2 mt-3">
            <CButton color="secondary" variant="outline" onClick={() => setStep(2)}>
              ← Back
            </CButton>
            <CButton color="success" onClick={handleConfirmImport} disabled={saving}>
              {saving && <CSpinner size="sm" className="me-2" />}
              <CIcon icon={cilCheckCircle} className="me-1" />
              Confirm &amp; Import
            </CButton>
          </div>
        </>
      )}

      {/* ── Step 4: Done + Deduction Summary ─────────────────────────────────── */}
      {step === 4 && (
        <>
          {saveResult?.success ? (
            <>
              {/* Success banner */}
              <CCard className="mb-4 border-top border-top-success border-3">
                <CCardBody className="py-3 d-flex align-items-center gap-3">
                  <CIcon
                    icon={cilCheckCircle}
                    style={{ width: 40, height: 40, color: 'var(--cui-success)', flexShrink: 0 }}
                  />
                  <div>
                    <div className="fw-bold fs-6">Import Successful</div>
                    <div className="text-body-secondary small">
                      {saveResult.count} attendance records imported for {MONTHS[month - 1]} {year}.
                    </div>
                  </div>
                  <div className="ms-auto d-flex gap-2">
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => navigate('/attendance', { state: { year, month } })}
                    >
                      View Attendance
                    </CButton>
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep(0)
                        setFile(null)
                        setParsedRows([])
                        setParseErrors([])
                        setParseWarnings([])
                        setSaveResult(null)
                        setPeriodMismatch(null)
                      }}
                    >
                      Import Another
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>

              {/* Deduction Summary */}
              <DeductionSummary summaries={employeeSummaries} month={month} year={year} />
            </>
          ) : (
            <CCard>
              <CCardBody className="text-center py-5">
                <CIcon icon={cilX} style={{ width: 56, height: 56, color: 'var(--cui-danger)' }} />
                <h5 className="mt-3">Import Failed</h5>
                <p className="text-body-secondary">{saveResult?.message}</p>
                <CButton color="secondary" onClick={() => setStep(3)}>
                  ← Back
                </CButton>
              </CCardBody>
            </CCard>
          )}
        </>
      )}
    </>
  )
}

export default AttendanceImport
