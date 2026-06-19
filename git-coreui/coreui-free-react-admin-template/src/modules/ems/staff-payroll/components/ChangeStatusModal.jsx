import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import api from '../../../services/api'

const STATUS_COLORS = {
  Active: 'success',
  Inactive: 'secondary',
  Resigned: 'danger',
  Retired: 'warning',
}
const STATUSES = ['Active', 'Inactive', 'Resigned', 'Retired']
const REQUIRES_EXIT = ['Resigned', 'Retired']

const ChangeStatusModal = ({ visible, onClose, employeeId, currentStatus, onSave }) => {
  const [status, setStatus] = useState(currentStatus)
  const [exitDate, setExitDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const needsExitDate = REQUIRES_EXIT.includes(status)

  const handleSave = async (e) => {
    e.preventDefault()
    if (needsExitDate && !exitDate) {
      setError('Exit date is required for this status')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.patch(`/employees/${employeeId}/status`, {
        status,
        exit_date: exitDate || undefined,
        remarks: remarks || undefined,
      })
      onSave()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setStatus(currentStatus)
    setExitDate('')
    setRemarks('')
    setError('')
    onClose()
  }

  return (
    <CModal visible={visible} onClose={handleClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>Change Employee Status</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSave}>
        <CModalBody>
          {error && <CAlert color="danger">{error}</CAlert>}

          <div className="mb-3">
            <span className="text-body-secondary small">Current Status: </span>
            <CBadge color={STATUS_COLORS[currentStatus] || 'secondary'} className="ms-1">
              {currentStatus}
            </CBadge>
          </div>

          <div className="mb-3">
            <CFormLabel className="fw-semibold">
              New Status <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect value={status} onChange={(e) => setStatus(e.target.value)} required>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </CFormSelect>
          </div>

          {needsExitDate && (
            <div className="mb-3">
              <CFormLabel className="fw-semibold">
                Exit Date <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                required
              />
            </div>
          )}

          <div className="mb-3">
            <CFormLabel>Remarks</CFormLabel>
            <CFormInput
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional reason for status change"
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" type="button" onClick={handleClose} disabled={saving}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={saving || status === currentStatus}>
            {saving && <CSpinner size="sm" className="me-2" />}
            Update Status
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

ChangeStatusModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  employeeId: PropTypes.string.isRequired,
  currentStatus: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default ChangeStatusModal
