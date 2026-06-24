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
  Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

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

  const daysInMonth = new Date(year, month, 0).getDate()

  // Build salary lookup from localEmployees keyed by employee_id text
  const salaryMap = useMemo(() => {
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
      const empInfo = salaryMap[s.employee_id] || { name: '—', salary: 0 }
      const salary = empInfo.salary

      // Working days = calendar days minus weekly offs
      const weeklyOff = s.weekly_off_count || 0
      const workingDays = Math.max(1, daysInMonth - weeklyOff)
      const dailyRate = salary / workingDays

      const absentDays = s.absent_count || 0
      const halfDays = s.half_day_count || 0
      const lateDays = s.late_days || 0

      const absentDeduction = absentDays * dailyRate
      const halfDayDeduction = halfDays * (dailyRate / 2)
      const lateDeduction = lateDays * (dailyRate / 4) // quarter-day per late
      const totalDeduction = absentDeduction + halfDayDeduction + lateDeduction
      const netPayable = Math.max(0, salary - totalDeduction)

      return {
        employee_id: s.employee_id,
        name: empInfo.name,
        salary,
        workingDays,
        dailyRate,
        absentDays,
        halfDays,
        lateDays,
        absentDeduction,
        halfDayDeduction,
        lateDeduction,
        totalDeduction,
        netPayable,
      }
    })
  }, [summaries, salaryMap, daysInMonth])

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
        { salary: 0, absentDeduction: 0, halfDayDeduction: 0, lateDeduction: 0, totalDeduction: 0, netPayable: 0 },
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
        No attendance data for {MONTHS[month - 1]} {year}. Import attendance to calculate deductions.
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
        Daily rate = monthly salary ÷ (calendar days − weekly offs).&nbsp;
        Absent deduction = absent days × daily rate.&nbsp;
        Half-day deduction = half days × ½ daily rate.&nbsp;
        Late deduction = late days × ¼ daily rate.
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
                <CTableHeaderCell>Employee ID</CTableHeaderCell>
                <CTableHeaderCell>Name</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Gross Salary</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Working Days</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Daily Rate</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Absent</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-danger">Absent Ded.</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Half Days</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-danger">Half-Day Ded.</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Late</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-danger">Late Ded.</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-danger">Total Ded.</CTableHeaderCell>
                <CTableHeaderCell className="text-end text-success">Net Payable</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rows.map((r) => (
                <CTableRow key={r.employee_id}>
                  <CTableDataCell className="fw-semibold">{r.employee_id}</CTableDataCell>
                  <CTableDataCell>{r.name}</CTableDataCell>
                  <CTableDataCell className="text-end">{fmt(r.salary)}</CTableDataCell>
                  <CTableDataCell className="text-center">{r.workingDays}</CTableDataCell>
                  <CTableDataCell className="text-end small text-body-secondary">
                    {fmt(r.dailyRate)}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {r.absentDays > 0 ? (
                      <span className="text-danger fw-semibold">{r.absentDays}</span>
                    ) : (
                      <span className="text-body-secondary">0</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    {r.absentDeduction > 0 ? fmt(r.absentDeduction) : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {r.halfDays > 0 ? (
                      <span className="text-warning fw-semibold">{r.halfDays}</span>
                    ) : (
                      <span className="text-body-secondary">0</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-danger">
                    {r.halfDayDeduction > 0 ? fmt(r.halfDayDeduction) : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {r.lateDays > 0 ? (
                      <span className="text-warning fw-semibold">{r.lateDays}</span>
                    ) : (
                      <span className="text-body-secondary">0</span>
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
