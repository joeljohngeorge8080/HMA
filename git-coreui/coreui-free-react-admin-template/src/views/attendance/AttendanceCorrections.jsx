import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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
import { cilArrowLeft, cilPencil, cilWarning } from '@coreui/icons'
import { useSelector } from 'react-redux'

import { usePermission } from '../../hooks/usePermission'
import { MODULE } from '../../constants/modules'
import api from '../../services/api'
import { localAttendance } from '../../services/localAttendance'

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

const STATUSES = ['Present', 'Absent', 'Half Day', 'On Leave', 'Holiday', 'Weekly Off']
const STATUS_COLORS = {
  Present: 'success',
  Absent: 'danger',
  'Half Day': 'warning',
  'Weekly Off': 'secondary',
  Holiday: 'info',
  'On Leave': 'primary',
}

const PAGE_SIZE = 20

const AttendanceCorrections = () => {
  const navigate = useNavigate()
  const canEdit = usePermission(MODULE.ATTENDANCE, 'edit')
  const currentUser = useSelector((s) => s.user)

  const [year, setYear] = useState(thisYear)
  const [month, setMonth] = useState(thisMonth)
  const [empSearch, setEmpSearch] = useState('')
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [selected, setSelected] = useState(null)
  const [corrForm, setCorrForm] = useState({
    new_status: '',
    new_in_time: '',
    new_out_time: '',
    reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [corrError, setCorrError] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          year,
          month,
          page,
          page_size: PAGE_SIZE,
        })
        if (empSearch) params.set('employee_id', empSearch)
        const { data } = await api.get(`/attendance/records?${params}`)
        setRecords(data.items || [])
        setTotal(data.total || 0)
      } catch {
        const result = localAttendance.listRecords({
          year,
          month,
          employeeId: empSearch || undefined,
          page,
          pageSize: PAGE_SIZE,
        })
        setRecords(result.items)
        setTotal(result.total)
      } finally {
        setLoading(false)
      }
    }
    loadRecords()
  }, [year, month, page, empSearch, refreshTick])

  const openCorrection = (rec) => {
    setSelected(rec)
    setCorrForm({
      new_status: rec.status,
      new_in_time: rec.in_time || '',
      new_out_time: rec.out_time || '',
      reason: '',
    })
    setCorrError('')
  }

  const handleSaveCorrection = async (e) => {
    e.preventDefault()
    if (!corrForm.reason.trim()) {
      setCorrError('Reason is required for every correction.')
      return
    }
    setSaving(true)
    setCorrError('')
    try {
      try {
        await api.patch(`/attendance/records/${selected.id}/correct`, {
          ...corrForm,
          corrected_by: currentUser?.employee_id,
        })
      } catch {
        localAttendance.applyCorrection(selected.id, {
          ...corrForm,
          corrected_by: currentUser?.full_name || currentUser?.employee_id || 'HR',
        })
      }
      setSelected(null)
      setRefreshTick((t) => t + 1)
    } catch (err) {
      setCorrError(err.message || 'Failed to apply correction')
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return (
      <CAlert color="danger">
        <strong>Access Denied.</strong> Only HR may perform attendance corrections.
      </CAlert>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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

      <h4 className="mb-3">Attendance Corrections</h4>

      <CAlert color="warning" className="small mb-3 py-2">
        <CIcon icon={cilWarning} className="me-1" />
        Every correction is permanently logged. Original values are preserved in the audit trail.
        Only HR may perform corrections.
      </CAlert>

      {/* Filters */}
      <CCard className="mb-4">
        <CCardBody className="py-3">
          <CRow className="g-2 align-items-end">
            <CCol md={2}>
              <label className="fw-semibold small mb-1 d-block">Month</label>
              <CFormSelect
                size="sm"
                value={month}
                onChange={(e) => {
                  setMonth(Number(e.target.value))
                  setPage(1)
                }}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={1}>
              <label className="fw-semibold small mb-1 d-block">Year</label>
              <CFormSelect
                size="sm"
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value))
                  setPage(1)
                }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <label className="fw-semibold small mb-1 d-block">Employee ID</label>
              <CFormInput
                size="sm"
                placeholder="Filter by Employee ID"
                value={empSearch}
                onChange={(e) => {
                  setEmpSearch(e.target.value)
                  setPage(1)
                }}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Records table */}
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <strong>
            Attendance Records — {MONTHS[month - 1]} {year}
          </strong>
          <span className="text-body-secondary small">{total} records</span>
        </CCardHeader>
        <CCardBody className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <CSpinner color="primary" size="sm" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-body-secondary small m-3">
              No records found. Import attendance first.
            </p>
          ) : (
            <CTable hover responsive bordered small className="mb-0">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Employee ID</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>In Time</CTableHeaderCell>
                  <CTableHeaderCell>Out Time</CTableHeaderCell>
                  <CTableHeaderCell>Late By</CTableHeaderCell>
                  <CTableHeaderCell>Corrections</CTableHeaderCell>
                  <CTableHeaderCell></CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {records.map((rec) => (
                  <CTableRow key={rec.id}>
                    <CTableDataCell className="fw-semibold">{rec.employee_id}</CTableDataCell>
                    <CTableDataCell>{rec.date}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLORS[rec.status] || 'secondary'}>{rec.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{rec.in_time || '—'}</CTableDataCell>
                    <CTableDataCell>{rec.out_time || '—'}</CTableDataCell>
                    <CTableDataCell>
                      {rec.late_by ? <CBadge color="warning">{rec.late_by}</CBadge> : '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      {(rec.corrections || []).length > 0 ? (
                        <CBadge color="info">{rec.corrections.length}</CBadge>
                      ) : (
                        <span className="text-body-secondary">—</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        color="warning"
                        variant="outline"
                        size="sm"
                        onClick={() => openCorrection(rec)}
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
              <span className="text-body-secondary small">
                Page {page} of {totalPages}
              </span>
              <div className="d-flex gap-1">
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </CButton>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </CButton>
              </div>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Correction Modal */}
      <CModal visible={Boolean(selected)} onClose={() => setSelected(null)} backdrop="static">
        <CModalHeader>
          <CModalTitle>
            Correct Attendance — {selected?.employee_id} on {selected?.date}
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSaveCorrection}>
          <CModalBody>
            {corrError && <CAlert color="danger">{corrError}</CAlert>}

            {selected && (
              <div className="mb-3 p-2 rounded border small">
                <strong>Current: </strong>
                <CBadge color={STATUS_COLORS[selected.status] || 'secondary'} className="me-2">
                  {selected.status}
                </CBadge>
                {selected.in_time && <span className="me-2">In: {selected.in_time}</span>}
                {selected.out_time && <span>Out: {selected.out_time}</span>}
              </div>
            )}

            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel className="fw-semibold">
                  New Status <span className="text-danger">*</span>
                </CFormLabel>
                <CFormSelect
                  value={corrForm.new_status}
                  onChange={(e) => setCorrForm((f) => ({ ...f, new_status: e.target.value }))}
                  required
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel>In Time (corrected)</CFormLabel>
                <CFormInput
                  type="time"
                  value={corrForm.new_in_time}
                  onChange={(e) => setCorrForm((f) => ({ ...f, new_in_time: e.target.value }))}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Out Time (corrected)</CFormLabel>
                <CFormInput
                  type="time"
                  value={corrForm.new_out_time}
                  onChange={(e) => setCorrForm((f) => ({ ...f, new_out_time: e.target.value }))}
                />
              </CCol>
              <CCol md={12}>
                <CFormLabel className="fw-semibold">
                  Reason <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  value={corrForm.reason}
                  onChange={(e) => setCorrForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Required — describe why this correction is needed"
                  required
                />
              </CCol>
            </CRow>

            {/* Previous corrections */}
            {selected?.corrections?.length > 0 && (
              <div className="mt-3">
                <div className="fw-semibold small text-body-secondary mb-1">Correction History</div>
                {selected.corrections.map((c) => (
                  <div key={c.id} className="small border rounded p-2 mb-1">
                    <CBadge color={STATUS_COLORS[c.old_status] || 'secondary'} className="me-1">
                      {c.old_status}
                    </CBadge>
                    →
                    <CBadge color={STATUS_COLORS[c.new_status] || 'secondary'} className="mx-1">
                      {c.new_status}
                    </CBadge>
                    by {c.corrected_by} — {c.reason}
                  </div>
                ))}
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton
              type="button"
              color="secondary"
              onClick={() => setSelected(null)}
              disabled={saving}
            >
              Cancel
            </CButton>
            <CButton type="submit" color="warning" disabled={saving}>
              {saving && <CSpinner size="sm" className="me-2" />}
              Apply Correction
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default AttendanceCorrections
