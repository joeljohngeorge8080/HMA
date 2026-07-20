import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { localSalaryDetails } from '../../../../services/localSalaryDetails'
import { localAttendance } from '../../../../services/localAttendance'
import { computeCTC, STATE_PT_MAP } from '../ctcUtils'

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

const _thisYear = new Date().getFullYear()
const _thisMonth = new Date().getMonth() + 1
const YEARS = Array.from({ length: 5 }, (_, i) => _thisYear - 2 + i)

const fmt = (n, decimals = 2) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

// Default inputs for a month with no saved record yet.
const emptyInputs = (daysInMonth, currentSalary) => ({
  idealBasic: currentSalary ? String(currentSalary) : '',
  stateForPT: '',
  ptAuto: true,
  ptOverride: '',
  recovery: '0',
  tnd: String(daysInMonth),
  tndw: '',
  centreInchargeAllowance: '0',
  rsoAllowance: '0',
  invoiceNo: '',
  hcNo: '',
  remarks: '',
})

const inputsFromRecord = (record, daysInMonth) => ({
  idealBasic: String(record.idealBasic ?? ''),
  stateForPT: record.stateForPT || '',
  ptAuto: record.ptAuto !== false,
  ptOverride: record.ptOverride != null ? String(record.ptOverride) : '',
  recovery: String(record.recovery ?? '0'),
  tnd: String(record.tnd ?? daysInMonth),
  tndw: record.tndw != null ? String(record.tndw) : '',
  centreInchargeAllowance: String(record.centreInchargeAllowance ?? '0'),
  rsoAllowance: String(record.rsoAllowance ?? '0'),
  invoiceNo: record.invoiceNo || '',
  hcNo: record.hcNo || '',
  remarks: record.remarks || '',
})

// ─── One editable row: label + a single input/select cell ───────────────────
const InputRow = ({ label, children }) => (
  <CTableRow>
    <CTableDataCell className="text-body-secondary small" style={{ width: '55%' }}>
      {label}
    </CTableDataCell>
    <CTableDataCell>{children}</CTableDataCell>
  </CTableRow>
)
InputRow.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node }

// ─── One read-only computed row ──────────────────────────────────────────────
const CalcRow = ({ label, value, bold, sub }) => (
  <CTableRow>
    <CTableDataCell
      className={sub ? 'small text-body-secondary' : 'small'}
      style={{ width: '55%', paddingLeft: sub ? '1.5rem' : undefined }}
    >
      {label}
    </CTableDataCell>
    <CTableDataCell className={bold ? 'fw-bold' : ''}>₹ {fmt(value)}</CTableDataCell>
  </CTableRow>
)
CalcRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number,
  bold: PropTypes.bool,
  sub: PropTypes.bool,
}

// ─── Section header row spanning both columns ────────────────────────────────
const SectionRow = ({ label }) => (
  <CTableRow color="light">
    <CTableDataCell colSpan={2} className="fw-semibold small text-uppercase py-1">
      {label}
    </CTableDataCell>
  </CTableRow>
)
SectionRow.propTypes = { label: PropTypes.string.isRequired }

const MonthlySalaryDetailsTab = ({ employeeId, currentSalary, canEdit }) => {
  const [viewYear, setViewYear] = useState(_thisYear)
  const [viewMonth, setViewMonth] = useState(_thisMonth)
  const [inputs, setInputs] = useState(() =>
    emptyInputs(new Date(_thisYear, _thisMonth, 0).getDate(), currentSalary),
  )
  const [hasRecord, setHasRecord] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveMsg, setSaveMsg] = useState('')

  // Load (or default) the record for the selected month whenever the
  // employee or the selected month/year changes.
  useEffect(() => {
    setLoading(true)
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
    const record = localSalaryDetails.get(employeeId, viewYear, viewMonth)
    if (record) {
      setInputs(inputsFromRecord(record, daysInMonth))
      setHasRecord(true)
    } else {
      setInputs(emptyInputs(daysInMonth, currentSalary))
      setHasRecord(false)
    }
    setSaveMsg('')
    setLoading(false)
  }, [employeeId, viewYear, viewMonth, currentSalary])

  const setField = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setInputs((prev) => ({ ...prev, [key]: val }))
  }

  const derivedPT = inputs.stateForPT ? (STATE_PT_MAP[inputs.stateForPT] ?? 0) : 0
  const effectivePT = inputs.ptAuto ? derivedPT : Number(inputs.ptOverride) || 0

  const calc = inputs.idealBasic
    ? computeCTC({
        idealBasic: Number(inputs.idealBasic),
        tnd: Number(inputs.tnd),
        tndw: Number(inputs.tndw) || 0,
        pt: effectivePT,
        recovery: Number(inputs.recovery) || 0,
        centreInchargeAllowance: Number(inputs.centreInchargeAllowance) || 0,
        rsoAllowance: Number(inputs.rsoAllowance) || 0,
      })
    : null

  // Pull TND (days in month) / TNDW (days present) from Attendance, same
  // half-day correction SalaryTab.jsx's live calculator already applies.
  const loadFromAttendance = () => {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
    let summary = localAttendance.getSummary(employeeId, viewYear, viewMonth)
    if (!summary) {
      const { items } = localAttendance.listRecords({
        employeeId,
        year: viewYear,
        month: viewMonth,
        pageSize: 200,
      })
      if (items.length > 0) {
        summary = {
          present_count: items.filter((r) => r.status === 'Present').length,
          half_day_count: items.filter((r) => r.status === 'Half Day').length,
        }
      }
    }
    if (summary) {
      const tndwVal =
        (Number(summary.present_count) || 0) - (Number(summary.half_day_count) || 0) * 0.5
      setInputs((prev) => ({ ...prev, tnd: String(daysInMonth), tndw: String(tndwVal) }))
      setSaveMsg('Loaded TND/TNDW from Attendance. Review and Save to keep it.')
    } else {
      setInputs((prev) => ({ ...prev, tnd: String(daysInMonth) }))
      setSaveMsg('No attendance data found for this month.')
    }
  }

  // Copies the previous month's salary STRUCTURE (basic, allowances, PT
  // settings) — not TND/TNDW (attendance is month-specific) or remarks.
  const copyFromPreviousMonth = () => {
    const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1
    const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear
    const record = localSalaryDetails.get(employeeId, prevYear, prevMonth)
    if (!record) {
      setSaveMsg(`No saved record for ${MONTHS[prevMonth - 1]} ${prevYear} to copy from.`)
      return
    }
    setInputs((prev) => ({
      ...prev,
      idealBasic: String(record.idealBasic ?? ''),
      stateForPT: record.stateForPT || '',
      ptAuto: record.ptAuto !== false,
      ptOverride: record.ptOverride != null ? String(record.ptOverride) : '',
      recovery: String(record.recovery ?? '0'),
      centreInchargeAllowance: String(record.centreInchargeAllowance ?? '0'),
      rsoAllowance: String(record.rsoAllowance ?? '0'),
      invoiceNo: record.invoiceNo || '',
      hcNo: record.hcNo || '',
    }))
    setSaveMsg(
      `Copied salary structure from ${MONTHS[prevMonth - 1]} ${prevYear}. Review and Save to keep it.`,
    )
  }

  const handleSave = () => {
    localSalaryDetails.upsert(employeeId, viewYear, viewMonth, {
      idealBasic: Number(inputs.idealBasic) || 0,
      stateForPT: inputs.stateForPT,
      ptAuto: inputs.ptAuto,
      ptOverride: Number(inputs.ptOverride) || 0,
      recovery: Number(inputs.recovery) || 0,
      tnd: Number(inputs.tnd) || 0,
      tndw: Number(inputs.tndw) || 0,
      centreInchargeAllowance: Number(inputs.centreInchargeAllowance) || 0,
      rsoAllowance: Number(inputs.rsoAllowance) || 0,
      invoiceNo: inputs.invoiceNo,
      hcNo: inputs.hcNo,
      remarks: inputs.remarks,
    })
    setHasRecord(true)
    setSaveMsg(`Saved for ${MONTHS[viewMonth - 1]} ${viewYear}.`)
  }

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <span className="fw-semibold text-body-secondary small">Salary details for:</span>
        <CFormSelect
          size="sm"
          value={viewMonth}
          onChange={(e) => setViewMonth(Number(e.target.value))}
          style={{ width: 140 }}
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </CFormSelect>
        <CFormSelect
          size="sm"
          value={viewYear}
          onChange={(e) => setViewYear(Number(e.target.value))}
          style={{ width: 90 }}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </CFormSelect>
        {hasRecord ? (
          <CBadge color="success">Saved</CBadge>
        ) : (
          <CBadge color="secondary">Not yet saved</CBadge>
        )}
      </div>

      <CAlert color="secondary" className="small mb-3 py-2">
        A separate, historical record per month — independent of the &ldquo;Salary&rdquo;
        tab&rsquo;s current CTC. Saving here does not change the employee&rsquo;s current salary.
      </CAlert>

      {saveMsg && (
        <CAlert color="info" className="small py-2" dismissible onClose={() => setSaveMsg('')}>
          {saveMsg}
        </CAlert>
      )}

      {loading ? (
        <div className="text-center py-4">
          <CSpinner color="primary" size="sm" />
        </div>
      ) : (
        <>
          {canEdit && (
            <div className="d-flex gap-2 mb-3">
              <CButton size="sm" color="secondary" variant="outline" onClick={loadFromAttendance}>
                Load TND/TNDW from Attendance
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={copyFromPreviousMonth}
              >
                Copy Structure from Previous Month
              </CButton>
            </div>
          )}

          <CCard>
            <CCardHeader>
              <strong>
                Monthly Salary Sheet — {MONTHS[viewMonth - 1]} {viewYear}
              </strong>
            </CCardHeader>
            <CCardBody className="p-0">
              <CTable bordered small className="mb-0">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Field</CTableHeaderCell>
                    <CTableHeaderCell>Value</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  <SectionRow label="Manual Inputs" />
                  <InputRow label="Ideal Basic (₹)">
                    <CFormInput
                      size="sm"
                      type="number"
                      value={inputs.idealBasic}
                      onChange={setField('idealBasic')}
                      disabled={!canEdit}
                    />
                  </InputRow>
                  <InputRow label="State (for PT)">
                    <CFormSelect
                      size="sm"
                      value={inputs.stateForPT}
                      onChange={setField('stateForPT')}
                      disabled={!canEdit}
                    >
                      <option value="">— Select —</option>
                      {Object.keys(STATE_PT_MAP).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </CFormSelect>
                  </InputRow>
                  <InputRow label="PT (₹)">
                    <div className="d-flex align-items-center gap-2">
                      <CFormCheck
                        label="Auto"
                        checked={inputs.ptAuto}
                        onChange={setField('ptAuto')}
                        disabled={!canEdit}
                      />
                      <CFormInput
                        size="sm"
                        type="number"
                        value={inputs.ptAuto ? derivedPT : inputs.ptOverride}
                        onChange={setField('ptOverride')}
                        disabled={!canEdit || inputs.ptAuto}
                        style={{ maxWidth: 140 }}
                      />
                    </div>
                  </InputRow>
                  <InputRow label="Recovery (₹)">
                    <CFormInput
                      size="sm"
                      type="number"
                      value={inputs.recovery}
                      onChange={setField('recovery')}
                      disabled={!canEdit}
                    />
                  </InputRow>
                  <InputRow label="TND — Total Days in Month">
                    <CFormInput
                      size="sm"
                      type="number"
                      value={inputs.tnd}
                      onChange={setField('tnd')}
                      disabled={!canEdit}
                    />
                  </InputRow>
                  <InputRow label="TNDW — Days Present">
                    <CFormInput
                      size="sm"
                      type="number"
                      value={inputs.tndw}
                      onChange={setField('tndw')}
                      disabled={!canEdit}
                    />
                  </InputRow>
                  <InputRow label="Centre Incharge Allowance (₹)">
                    <CFormInput
                      size="sm"
                      type="number"
                      value={inputs.centreInchargeAllowance}
                      onChange={setField('centreInchargeAllowance')}
                      disabled={!canEdit}
                    />
                  </InputRow>
                  <InputRow label="RSO Allowance (₹)">
                    <CFormInput
                      size="sm"
                      type="number"
                      value={inputs.rsoAllowance}
                      onChange={setField('rsoAllowance')}
                      disabled={!canEdit}
                    />
                  </InputRow>
                  <InputRow label="Invoice No.">
                    <CFormInput
                      size="sm"
                      value={inputs.invoiceNo}
                      onChange={setField('invoiceNo')}
                      disabled={!canEdit}
                    />
                  </InputRow>
                  <InputRow label="HC No.">
                    <CFormInput
                      size="sm"
                      value={inputs.hcNo}
                      onChange={setField('hcNo')}
                      disabled={!canEdit}
                    />
                  </InputRow>
                  <InputRow label="Remarks">
                    <CFormInput
                      size="sm"
                      value={inputs.remarks}
                      onChange={setField('remarks')}
                      disabled={!canEdit}
                    />
                  </InputRow>

                  {calc && (
                    <>
                      <SectionRow label="Ideal Components" />
                      <CalcRow label="Ideal HRA" value={calc.idealHRA} />
                      <CalcRow label="Ideal OA" value={calc.idealOA} />
                      <CalcRow label="Ideal Gross" value={calc.idealGross} bold />

                      <SectionRow label="Actual Components (Prorated)" />
                      <CalcRow label="Actual Basic" value={calc.actualBasic} />
                      <CalcRow label="Actual HRA" value={calc.actualHRA} />
                      <CalcRow label="Actual OA" value={calc.actualOA} />
                      <CalcRow label="Actual Gross" value={calc.actualGross} bold />

                      <SectionRow label="Employee Deductions" />
                      <CalcRow label="EPFO" value={calc.empEPFO} sub />
                      <CalcRow label="ESIC" value={calc.empESIC} sub />
                      <CalcRow label="PT" value={calc.ptAmt} sub />
                      <CalcRow label="Recovery" value={calc.recoveryAmt} sub />
                      <CalcRow label="LWF" value={calc.empLWF} sub />
                      <CalcRow label="Group Insurance" value={calc.groupInsurance} sub />
                      <CalcRow label="Total Deduction" value={calc.totalDeduction} bold />
                      <CalcRow label="Net Salary" value={calc.netSalary} bold />

                      <SectionRow label="Employer Contributions" />
                      <CalcRow label="Employer PF" value={calc.employerPF} sub />
                      <CalcRow label="PF Admin" value={calc.pfAdmin} sub />
                      <CalcRow label="EDLI" value={calc.edli} sub />
                      <CalcRow label="Employer ESIC" value={calc.employerESIC} sub />
                      <CalcRow label="Employer LWF" value={calc.employerLWF} sub />
                      <CalcRow
                        label="Total Employer Contribution"
                        value={calc.totalEmployerContribution}
                        bold
                      />

                      <SectionRow label="CTC & Invoice Summary" />
                      <CalcRow label="CTC" value={calc.ctc} bold />
                      <CalcRow label="Service Charges" value={calc.serviceCharges} sub />
                      <CalcRow label="Invoice Amount" value={calc.invoiceAmount} sub />
                      <CalcRow label="IGST" value={calc.igst} sub />
                      <CalcRow label="Total Invoice Amount" value={calc.totalInvoiceAmount} bold />
                    </>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>

          {canEdit && (
            <div className="d-flex gap-2 mt-3">
              <CButton color="success" onClick={handleSave} disabled={!inputs.idealBasic}>
                Save {MONTHS[viewMonth - 1]} {viewYear}
              </CButton>
            </div>
          )}
        </>
      )}
    </>
  )
}

MonthlySalaryDetailsTab.propTypes = {
  employeeId: PropTypes.string.isRequired,
  currentSalary: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  canEdit: PropTypes.bool,
}

export default MonthlySalaryDetailsTab
