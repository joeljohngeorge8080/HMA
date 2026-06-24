import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import api from '../../../services/api'
import { localAttendance } from '../../../services/localAttendance'
import { localEmployees } from '../../../services/localEmployees'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const fmt = (n) =>
  Number(n).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })

const DeductionSummary = ({ year, month }) => {
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/attendance/summaries?year=${year}&month=${month}`)
        setSummaries(res.data.items || [])
      } catch {
        setSummaries(localAttendance.listMonthlySummaries({ year, month }))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year, month])

  // Build salary + name lookup keyed by employee_id text (e.g. "EMP001")
  const empMap = useMemo(() => {
    const map = {}
    try {
      const { items } = localEmployees.list({ pageSize: 1000 })
      for (const emp of items) {
        map[emp.employee_id] = {
          name: emp.employee_name || [emp.first_name, emp.last_name].filter(Boolean).join(' '),
          salary: parseFloat(emp.current_salary || 0),
        }
      }
    } catch {
      // silent
    }
    return map
  }, [])

  const rows = useMemo(() => {
    return summaries.map((s) => {
      const info = empMap[s.employee_id] || { name: '—', salary: 0 }
      const salary = info.salary

      const absentCount = s.absent_count || 0
      const halfDayCount = s.half_day_count || 0  // already counted inside present_count
      const excessLateUnits = s.excess_late_units || 0  // units beyond 7 free

      // Daily Salary = Monthly Salary / Total Days in Month (per business rules)
      const daysInMonth = new Date(year, month, 0).getDate()
      const perDayRate = salary / daysInMonth

      // LOP (Loss of Pay) = absent days + half-day entries count as 0.5 each
      // Paid leaves are NOT deducted
      const absentDeduction = absentCount * perDayRate
      const halfDayDeduction = halfDayCount * (perDayRate / 2)

      // Late deduction: per business rules — only excess units (beyond 7 free) are deducted
      // 1 unit = 15 min; hourly rate = perDayRate / 8; 15-min deduction = perDayRate / 32
      const lateDeduction = excessLateUnits * (perDayRate / 32)

      const totalDeduction = absentDeduction + halfDayDeduction + lateDeduction
      const netPayable = Math.max(0, salary - totalDeduction)

      return {
        key: s.id || s.employee_id,
        employee_id: s.employee_id,
        name: info.name,
        salary,
        daysInMonth,
        perDayRate,
        halfDayCount,
        absentCount,
        excessLateUnits,
        absentDeduction,
        halfDayDeduction,
        lateDeduction,
        totalDeduction,
        netPayable,
      }
    })
  }, [summaries, empMap])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          salary: acc.salary + r.salary,
          absentDeduction: acc.absentDeduction + r.absentDeduction,
          halfDayDeduction: acc.halfDayDeduction + r.halfDayDeduction,
          lateDeduction: acc.lateDeduction + r.lateDeduction,
          totalDeduction: acc.totalDeduction + r.totalDeduction,
          netPayable: acc.netPayable + r.netPayable,
        }),
        {
          salary: 0,
          absentDeduction: 0,
          halfDayDeduction: 0,
          lateDeduction: 0,
          totalDeduction: 0,
          netPayable: 0,
        },
      ),
    [rows],
  )

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="text-body-secondary mt-3">
        No attendance data for {MONTHS[month - 1]} {year}. Import attendance to calculate
        deductions.
      </p>
    )
  }

  return (
    <>
      {/* Summary strip */}
      <CRow className="g-3 mb-4">
        <CCol xs={6} md={3}>
          <CCard className="border-top border-top-primary border-3 h-100">
            <CCardBody className="text-center py-3">
              <div className="fs-6 fw-bold text-primary">{fmt(totals.salary)}</div>
              <div className="small text-body-secondary mt-1">Total Gross Salary</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="border-top border-top-danger border-3 h-100">
            <CCardBody className="text-center py-3">
              <div className="fs-6 fw-bold text-danger">{fmt(totals.totalDeduction)}</div>
              <div className="small text-body-secondary mt-1">Total Deductions</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="border-top border-top-success border-3 h-100">
            <CCardBody className="text-center py-3">
              <div className="fs-6 fw-bold text-success">{fmt(totals.netPayable)}</div>
              <div className="small text-body-secondary mt-1">Net Payable</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="border-top border-top-secondary border-3 h-100">
            <CCardBody className="text-center py-3">
              <div className="fs-5 fw-bold">{rows.length}</div>
              <div className="small text-body-secondary mt-1">Employees</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <p className="text-body-secondary small mb-3">
        <strong>Per-day rate</strong> = monthly salary ÷ total days in month.&nbsp;
        <strong>Absent deduction</strong> = absent days × per-day rate.&nbsp;
        <strong>Half-day deduction</strong> = half-day count × ½ per-day rate.&nbsp;
        <strong>Late deduction</strong> = excess units (beyond 7 free) × per-day rate ÷ 32
        (1 unit = 15 min; hourly rate = per-day ÷ 8; 15-min = hourly ÷ 4).&nbsp;
        Paid leave (CL/SL/OD/COFF) is not deducted.
      </p>

      <CCard>
        <CCardHeader>
          <strong>
            Deduction Details — {MONTHS[month - 1]} {year}
          </strong>
        </CCardHeader>
        <CCardBody className="p-0">
          <CTable hover responsive bordered small className="mb-0">
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Emp ID</CTableHeaderCell>
                <CTableHeaderCell>Name</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Gross Salary</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Days in Month</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Per-Day Rate</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Absent</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-danger">Absent Ded.</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Half Days</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-danger">Half-Day Ded.</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Late Units (excess)</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-danger">Late Ded.</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-danger">Total Ded.</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-success">Net Payable</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rows.map((r) => (
                <CTableRow key={r.key}>
                  <CTableDataCell className="fw-semibold">{r.employee_id}</CTableDataCell>
                  <CTableDataCell>{r.name}</CTableDataCell>
                  <CTableDataCell className="text-end">{fmt(r.salary)}</CTableDataCell>
                  <CTableDataCell className="text-center">{r.daysInMonth}</CTableDataCell>
                  <CTableDataCell className="text-end small text-body-secondary">
                    {fmt(r.perDayRate)}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {r.absentCount > 0 ? (
                      <span className="text-danger fw-semibold">{r.absentCount}</span>
                    ) : (
                      <span className="text-body-secondary">0</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    {r.absentDeduction > 0 ? fmt(r.absentDeduction) : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {r.halfDayCount > 0 ? (
                      <span className="text-warning fw-semibold">{r.halfDayCount}</span>
                    ) : (
                      <span className="text-body-secondary">0</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    {r.halfDayDeduction > 0 ? fmt(r.halfDayDeduction) : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {r.excessLateUnits > 0 ? (
                      <span className="text-warning fw-semibold">{r.excessLateUnits}</span>
                    ) : (
                      <span className="text-body-secondary">—</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    {r.lateDeduction > 0 ? fmt(r.lateDeduction) : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold text-danger">
                    {r.totalDeduction > 0 ? fmt(r.totalDeduction) : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-success">
                    {fmt(r.netPayable)}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
            <CTableFoot color="light">
              <CTableRow className="fw-bold">
                <CTableDataCell colSpan={2}>Total</CTableDataCell>
                <CTableDataCell className="text-end">{fmt(totals.salary)}</CTableDataCell>
                <CTableDataCell />
                <CTableDataCell />
                <CTableDataCell />
                <CTableDataCell className="text-end text-danger">
                  {fmt(totals.absentDeduction)}
                </CTableDataCell>
                <CTableDataCell />
                <CTableDataCell className="text-end text-danger">
                  {fmt(totals.halfDayDeduction)}
                </CTableDataCell>
                <CTableDataCell />
                <CTableDataCell className="text-end text-danger">
                  {fmt(totals.lateDeduction)}
                </CTableDataCell>
                <CTableDataCell className="text-end text-danger">
                  {fmt(totals.totalDeduction)}
                </CTableDataCell>
                <CTableDataCell className="text-end text-success">
                  {fmt(totals.netPayable)}
                </CTableDataCell>
              </CTableRow>
            </CTableFoot>
          </CTable>
        </CCardBody>
      </CCard>
    </>
  )
}

DeductionSummary.propTypes = {
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
}

export default DeductionSummary
