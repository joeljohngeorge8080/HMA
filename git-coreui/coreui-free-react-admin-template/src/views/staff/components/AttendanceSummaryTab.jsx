import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import api from '../../../services/api'
import { localAttendance } from '../../../services/localAttendance'

const SUMMARY_CARDS = [
  { key: 'present_count', label: 'Present Days', color: 'success' },
  { key: 'absent_count', label: 'Absent Days', color: 'danger' },
  { key: 'weekly_off_count', label: 'Weekly Off', color: 'secondary' },
  { key: 'late_days', label: 'Late Days', color: 'warning' },
  { key: 'avg_working_hours', label: 'Avg Working Hours', color: 'info' },
]

const STATUS_COLORS = {
  Present: 'success',
  Absent: 'danger',
  'Half Day': 'warning',
  'Weekly Off': 'secondary',
  Holiday: 'info',
  'On Leave': 'primary',
}

const AttendanceSummaryTab = ({ employeeId }) => {
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [summaryRes, historyRes] = await Promise.all([
          api.get(`/employees/${employeeId}/attendance-summary`),
          api.get(`/attendance?employee_id=${employeeId}&page_size=30`),
        ])
        setSummary(summaryRes.data)
        setHistory(historyRes.data.items || [])
      } catch {
        // Fall back to localStorage attendance store
        const latestSummary = localAttendance.getLatestSummary(employeeId)
        const { items } = localAttendance.listRecords({ employeeId, pageSize: 30 })
        setSummary(latestSummary)
        setHistory(items)
        if (!latestSummary && items.length === 0) {
          setError('No attendance data found. Import attendance data to see records here.')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [employeeId])

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner color="primary" size="sm" />
        <span className="ms-2 text-body-secondary">Loading attendance…</span>
      </div>
    )
  }

  return (
    <>
      <CAlert color="secondary" className="small mb-3 py-2">
        Attendance records are read-only in this view. Corrections must be submitted through the
        Attendance module.
      </CAlert>

      {error && !summary && history.length === 0 ? (
        <p className="text-body-secondary small">{error}</p>
      ) : (
        <>
          {/* Summary Cards */}
          <CRow className="g-3 mb-4">
            {SUMMARY_CARDS.map(({ key, label, color }) => (
              <CCol xs={6} md key={key}>
                <CCard className={`border-top border-top-${color} border-3 h-100`}>
                  <CCardBody className="text-center py-3">
                    <div className={`fs-3 fw-bold text-${color}`}>{summary?.[key] ?? '—'}</div>
                    <div className="small text-body-secondary mt-1">{label}</div>
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>

          {/* Attendance History */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <strong>Attendance History</strong>
            <span className="text-body-secondary small">Last 30 records</span>
          </div>

          {history.length === 0 ? (
            <p className="text-body-secondary small">No attendance records found.</p>
          ) : (
            <CTable hover responsive bordered small>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>In Time</CTableHeaderCell>
                  <CTableHeaderCell>Out Time</CTableHeaderCell>
                  <CTableHeaderCell>Working Hours</CTableHeaderCell>
                  <CTableHeaderCell>Late By</CTableHeaderCell>
                  <CTableHeaderCell>Corrections</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {history.map((rec) => (
                  <CTableRow key={rec.id}>
                    <CTableDataCell className="fw-semibold">{rec.date}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLORS[rec.status] || 'secondary'}>{rec.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{rec.in_time || '—'}</CTableDataCell>
                    <CTableDataCell>{rec.out_time || '—'}</CTableDataCell>
                    <CTableDataCell>
                      {rec.work_duration || rec.work_duration_minutes
                        ? rec.work_duration || `${Math.floor(rec.work_duration_minutes / 60)}h`
                        : '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      {rec.late_by ? <CBadge color="warning">{rec.late_by}</CBadge> : '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      {(rec.corrections || []).length > 0 ? (
                        <CBadge color="info">{rec.corrections.length}</CBadge>
                      ) : (
                        '—'
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </>
      )}
    </>
  )
}

AttendanceSummaryTab.propTypes = {
  employeeId: PropTypes.string.isRequired,
}

export default AttendanceSummaryTab
