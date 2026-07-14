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
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
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
import { cilPencil, cilPlus } from '@coreui/icons'

import api from '../../../../services/api'
import { localEmployees } from '../../../../services/localEmployees'
import { DESIGNATIONS } from '../../../../constants/employeeConstants'

const ALLOWED_INCREMENTS = [
  { value: '3', label: '3%' },
  { value: '6', label: '6%' },
  { value: '8', label: '8%' },
]

const SalaryTab = ({ employeeId, currentSalary, currentDesignation, canEdit, onSave }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [incrementPct, setIncrementPct] = useState('3')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [remarks, setRemarks] = useState('')

  // Direct salary edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSalary, setEditSalary] = useState('')
  const [editEffectiveDate, setEditEffectiveDate] = useState('')
  const [editRemarks, setEditRemarks] = useState('')
  const [editDesignation, setEditDesignation] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editFormError, setEditFormError] = useState('')

  // Increment state
  const [incDesignation, setIncDesignation] = useState('')

  const salary = Number(currentSalary)
  const preview = incrementPct
    ? {
        pct: Number(incrementPct),
        amount: ((salary * Number(incrementPct)) / 100).toFixed(2),
        newSalary: (salary + (salary * Number(incrementPct)) / 100).toFixed(2),
      }
    : null

  const editNewSalary = parseFloat(editSalary) || 0
  const editDiff = editNewSalary - salary

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/employees/${employeeId}/salary-history`)
      setHistory(data)
    } catch {
      const local = localEmployees.getById(employeeId)
      setHistory(local?.salary_history || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [employeeId])

  const handleApplyIncrement = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!effectiveDate) {
      setFormError('Effective date is required')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/employees/${employeeId}/salary-increment`, {
        increment_percentage: Number(incrementPct),
        effective_date: effectiveDate,
        remarks: remarks || undefined,
        new_designation: incDesignation.trim() || undefined,
      })
    } catch {
      try {
        localEmployees.applySalaryIncrement(employeeId, {
          increment_percentage: Number(incrementPct),
          effective_date: effectiveDate,
          remarks: remarks || undefined,
          new_designation: incDesignation.trim() || undefined,
        })
      } catch (localErr) {
        setFormError(localErr.message || 'Failed to apply increment')
        setSubmitting(false)
        return
      }
    }
    await fetchHistory()
    setShowModal(false)
    setRemarks('')
    setEffectiveDate('')
    setIncrementPct('3')
    setIncDesignation('')
    onSave()
    setSubmitting(false)
  }

  const handleDirectSalaryEdit = async (e) => {
    e.preventDefault()
    setEditFormError('')
    if (!editSalary || editNewSalary <= 0) {
      setEditFormError('Please enter a valid salary amount')
      return
    }
    if (!editEffectiveDate) {
      setEditFormError('Effective date is required')
      return
    }
    setEditSubmitting(true)
    try {
      await api.post(`/employees/${employeeId}/salary-update`, {
        new_salary: editNewSalary,
        effective_date: editEffectiveDate,
        remarks: editRemarks || undefined,
        new_designation: editDesignation.trim() || undefined,
      })
    } catch {
      try {
        localEmployees.updateSalaryDirect(employeeId, {
          new_salary: editNewSalary,
          effective_date: editEffectiveDate,
          remarks: editRemarks || undefined,
          new_designation: editDesignation.trim() || undefined,
        })
      } catch (localErr) {
        setEditFormError(localErr.message || 'Failed to update salary')
        setEditSubmitting(false)
        return
      }
    }
    await fetchHistory()
    setShowEditModal(false)
    setEditSalary('')
    setEditEffectiveDate('')
    setEditRemarks('')
    setEditDesignation('')
    onSave()
    setEditSubmitting(false)
  }

  return (
    <>
      {/* Current Salary Card */}
      <CCard className="mb-4 border-0 bg-body-secondary">
        <CCardBody>
          <CRow className="align-items-center">
            <CCol>
              <small className="text-body-secondary">Current Salary (CTC)</small>
              <h3 className="mb-0 text-success fw-bold">
                ₹{salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </CCol>
            {canEdit && (
              <CCol xs="auto" className="d-flex gap-2">
                <CButton
                  color="secondary"
                  onClick={() => {
                    setEditSalary(String(salary))
                    setShowEditModal(true)
                  }}
                >
                  <CIcon icon={cilPencil} className="me-1" />
                  Edit Salary
                </CButton>
                <CButton color="primary" onClick={() => setShowModal(true)}>
                  <CIcon icon={cilPlus} className="me-1" />
                  Apply Increment
                </CButton>
              </CCol>
            )}
          </CRow>
        </CCardBody>
      </CCard>

      {/* Salary History */}
      <CCard>
        <CCardHeader>
          <strong>Salary Increment History</strong>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-3">
              <CSpinner size="sm" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-body-secondary">No salary changes recorded.</p>
          ) : (
            <CTable hover responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Previous Salary</CTableHeaderCell>
                  <CTableHeaderCell>Increment %</CTableHeaderCell>
                  <CTableHeaderCell>Increment Amount</CTableHeaderCell>
                  <CTableHeaderCell>New Salary</CTableHeaderCell>
                  <CTableHeaderCell>Effective Date</CTableHeaderCell>
                  <CTableHeaderCell>Designation</CTableHeaderCell>
                  <CTableHeaderCell>Remarks</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {history.map((h) => (
                  <CTableRow key={h.id}>
                    <CTableDataCell>
                      {new Date(h.created_at).toLocaleDateString('en-IN')}
                    </CTableDataCell>
                    <CTableDataCell>
                      ₹{Number(h.previous_salary).toLocaleString('en-IN')}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="info">{h.increment_percentage}%</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-success">
                      +₹{Number(h.increment_amount).toLocaleString('en-IN')}
                    </CTableDataCell>
                    <CTableDataCell className="fw-semibold">
                      ₹{Number(h.new_salary).toLocaleString('en-IN')}
                    </CTableDataCell>
                    <CTableDataCell>{h.effective_date}</CTableDataCell>
                    <CTableDataCell>
                      {h.designation_changed_to ? (
                        <CBadge color="primary" shape="rounded-pill">
                          {h.designation_changed_to}
                        </CBadge>
                      ) : '—'}
                    </CTableDataCell>
                    <CTableDataCell>{h.remarks || '—'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* Direct Salary Edit Modal */}
      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Edit Salary</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleDirectSalaryEdit}>
          <CModalBody>
            {editFormError && <CAlert color="danger">{editFormError}</CAlert>}

            <div className="mb-3">
              <CFormLabel>Current Salary</CFormLabel>
              <p className="fw-bold text-success">
                ₹{salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="editSalary">New Salary (₹) *</CFormLabel>
              <CFormInput
                id="editSalary"
                type="number"
                min="0"
                step="0.01"
                value={editSalary}
                onChange={(e) => setEditSalary(e.target.value)}
                placeholder="Enter new salary amount"
                required
              />
            </div>

            {editNewSalary > 0 && editNewSalary !== salary && (
              <CCard className="mb-3 border-0 bg-body-secondary">
                <CCardBody className="py-2">
                  <CRow>
                    <CCol xs={6}>
                      <small className="text-body-secondary">Difference</small>
                      <p
                        className={`mb-0 fw-semibold ${editDiff >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {editDiff >= 0 ? '+' : ''}₹
                        {Math.abs(editDiff).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </CCol>
                    <CCol xs={6}>
                      <small className="text-body-secondary">New Salary</small>
                      <p className="mb-0 fw-bold">
                        ₹{editNewSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            )}

            <div className="mb-3">
              <CFormLabel htmlFor="editEffDate">Effective Date *</CFormLabel>
              <CFormInput
                id="editEffDate"
                type="date"
                value={editEffectiveDate}
                onChange={(e) => setEditEffectiveDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="editDesignation">
                New Designation
                <span className="text-body-secondary ms-2" style={{ fontSize: '0.78rem' }}>
                  (leave blank to keep current: {currentDesignation || '—'})
                </span>
              </CFormLabel>
              <CFormSelect
                id="editDesignation"
                value={editDesignation}
                onChange={(e) => setEditDesignation(e.target.value)}
              >
                <option value="">— Keep current ({currentDesignation || 'unchanged'}) —</option>
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </CFormSelect>
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="editRemarks">Remarks</CFormLabel>
              <CFormTextarea
                id="editRemarks"
                rows={3}
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Optional remarks for this salary change"
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={editSubmitting}
            >
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={editSubmitting}>
              {editSubmitting && <CSpinner size="sm" className="me-2" />}
              Save Salary
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Increment Modal */}
      <CModal visible={showModal} onClose={() => setShowModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Apply Salary Increment</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleApplyIncrement}>
          <CModalBody>
            {formError && <CAlert color="danger">{formError}</CAlert>}

            <div className="mb-3">
              <CFormLabel>Current Salary</CFormLabel>
              <p className="fw-bold text-success">
                ₹{salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="incPct">Increment Percentage *</CFormLabel>
              <CFormSelect
                id="incPct"
                value={incrementPct}
                onChange={(e) => setIncrementPct(e.target.value)}
                required
              >
                {ALLOWED_INCREMENTS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </div>

            {preview && (
              <CCard className="mb-3 border-0 bg-body-secondary">
                <CCardBody className="py-2">
                  <CRow>
                    <CCol xs={6}>
                      <small className="text-body-secondary">Increment Amount</small>
                      <p className="mb-0 fw-semibold text-success">
                        +₹{Number(preview.amount).toLocaleString('en-IN')}
                      </p>
                    </CCol>
                    <CCol xs={6}>
                      <small className="text-body-secondary">New Salary</small>
                      <p className="mb-0 fw-bold">
                        ₹{Number(preview.newSalary).toLocaleString('en-IN')}
                      </p>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            )}

            <div className="mb-3">
              <CFormLabel htmlFor="effDate">Effective Date *</CFormLabel>
              <CFormInput
                id="effDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="incDesignation">
                New Designation
                <span className="text-body-secondary ms-2" style={{ fontSize: '0.78rem' }}>
                  (leave blank to keep current: {currentDesignation || '—'})
                </span>
              </CFormLabel>
              <CFormSelect
                id="incDesignation"
                value={incDesignation}
                onChange={(e) => setIncDesignation(e.target.value)}
              >
                <option value="">— Keep current ({currentDesignation || 'unchanged'}) —</option>
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </CFormSelect>
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="remarks">Remarks</CFormLabel>
              <CFormTextarea
                id="remarks"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks for this increment"
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting && <CSpinner size="sm" className="me-2" />}
              Apply Increment
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

SalaryTab.propTypes = {
  employeeId: PropTypes.string.isRequired,
  currentSalary: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  currentDesignation: PropTypes.string,
  canEdit: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default SalaryTab
