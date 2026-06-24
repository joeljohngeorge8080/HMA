import React, { useMemo } from 'react'
import { CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilUserFollow,
  cilCalendar,
  cilWarning,
  cilCash,
  cilChartPie,
} from '@coreui/icons'
import { CWidgetStatsA } from '@coreui/react'

import { localEmployees } from '../../../services/localEmployees'
import { localAttendance } from '../../../services/localAttendance'
import { localGeneralExpenses } from '../../../services/localGeneralExpenses'

const fmt = (n) =>
  Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const Dashboard = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { totalEmployees, activeEmployees } = useMemo(() => {
    const all = localEmployees.list({ pageSize: 2000 })
    const active = localEmployees.list({ status: 'Active', pageSize: 2000 })
    return { totalEmployees: all.total, activeEmployees: active.total }
  }, [])

  const attendanceAgg = useMemo(
    () => localAttendance.getMonthlySummaryAggregate(year, month),
    [year, month],
  )

  const expenseActual = useMemo(() => {
    try {
      const analysis = localGeneralExpenses.analysis.get(year)
      const monthEntry = analysis.monthly_summary.find((m) => m.month === month)
      return monthEntry ? monthEntry.actual_total : 0
    } catch {
      return 0
    }
  }, [year, month])

  const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  return (
    <>
      <h4 className="mb-4">EMS Dashboard</h4>

      {/* Employees row */}
      <CRow className="g-3 mb-3">
        <CCol xs={12} sm={6} xl={3}>
          <CWidgetStatsA
            color="primary"
            value={String(totalEmployees)}
            title="Total Employees"
            icon={<CIcon icon={cilPeople} height={52} className="my-4 text-white text-opacity-75" />}
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <CWidgetStatsA
            color="success"
            value={String(activeEmployees)}
            title="Active Employees"
            icon={<CIcon icon={cilUserFollow} height={52} className="my-4 text-white text-opacity-75" />}
          />
        </CCol>

        {/* Attendance row */}
        <CCol xs={12} sm={6} xl={3}>
          <CWidgetStatsA
            color="info"
            value={attendanceAgg ? String(attendanceAgg.total_employees) : '—'}
            title={`Attendance Imported · ${monthLabel}`}
            icon={<CIcon icon={cilCalendar} height={52} className="my-4 text-white text-opacity-75" />}
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <CWidgetStatsA
            color="warning"
            value={attendanceAgg ? String(attendanceAgg.total_late_days) : '—'}
            title={`Late Days · ${monthLabel}`}
            icon={<CIcon icon={cilWarning} height={52} className="my-4 text-white text-opacity-75" />}
          />
        </CCol>
      </CRow>

      {/* Expenses row */}
      <CRow className="g-3">
        <CCol xs={12} sm={6} xl={3}>
          <CWidgetStatsA
            color="danger"
            value={expenseActual > 0 ? fmt(expenseActual) : '—'}
            title={`General Expenses · ${monthLabel}`}
            icon={<CIcon icon={cilCash} height={52} className="my-4 text-white text-opacity-75" />}
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <CWidgetStatsA
            color="secondary"
            value={attendanceAgg ? String(attendanceAgg.has_absent) : '—'}
            title={`Employees with Absences · ${monthLabel}`}
            icon={<CIcon icon={cilChartPie} height={52} className="my-4 text-white text-opacity-75" />}
          />
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
