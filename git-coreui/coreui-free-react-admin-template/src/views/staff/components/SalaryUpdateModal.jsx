import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
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
} from '@coreui/react'
import api from '../../../services/api'

const INCREMENT_OPTIONS = [
  { label: '3%', value: 3 },
  { label: '6%', value: 6 },
  { label: '8%', value: 8 },
]

const fmt = (n) =>
  Number(n).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })

const SalaryUpdateModal = ({ visible, onClose, employeeId, currentSalary, onSave }) => {
  const [pct, setPct] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const salary = parseFloat(currentSalary) || 0
  const selectedPct = parseFloat(pct) || 0
  const incrementAmount = (salary * selectedPct) / 100
  const newSalary = salary + incrementAmount
  const hasPreview = selectedPct > 0

  const today = new Date().toISOString().split('T')[0]

  const handleSave = async (e) => {
    e.preventDefault()
    if (!pct) {
      setError('Please select an increment percentage')
      return
    }
    if (!effectiveDate) {
      setError('Effective date is required')
      return
    }
    if (effectiveDate < today) {
      setError('Effective date cannot be in the past')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post(`/employees/${employeeId}/salary-increment`, {
        increment_percentage: parseFloat(pct),
        effective_date: effectiveDate,
        remarks: remarks || undefined,
      })
      onSave()
      handleClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to apply salary increment')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setPct('')
    setEffectiveDate('')
    setRemarks('')
    setError('')
    onClose()
  }

  return (
    <CModal visible={visible} onClose={handleClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>Update Salary</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSave}>
        <CModalBody>
          {error && <CAlert color="danger">{error}</CAlert>}

          <div className="mb-4 p-3 rounded bg-body-secondary">
            <div className="small text-body-secondary mb-1">Current Salary</div>
            <div className="fs-4 fw-bold text-success">{fmt(salary)}</div>
          </div>

          <CRow className="g-3 mb-3">
            <CCol md={6}>
              <CFormLabel className="fw-semibold">
                Increment Percentage <span className="text-danger">*</span>
              </CFormLabel>
              <CFormSelect value={pct} onChange={(e) => setPct(e.target.value)} required>
                <option value="">Select %</option>
                {INCREMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel className="fw-semibold">
                Effective Date <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                type="date"
                min={today}
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </CCol>
          </CRow>

          <div className="mb-3">
            <CFormLabel>Remarks</CFormLabel>
            <CFormInput
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks for audit trail"
            />
          </div>

          {hasPreview && (
            <CCard className="border-success">
              <CCardBody className="py-3">
                <div className="small fw-semibold text-body-secondary mb-2">Increment Preview</div>
                <CRow className="text-center g-2">
                  <CCol xs={4}>
                    <div className="small text-body-secondary">Current Salary</div>
                    <div className="fw-semibold">{fmt(salary)}</div>
                  </CCol>
                  <CCol xs={4}>
                    <div className="small text-body-secondary">Increment ({selectedPct}%)</div>
                    <div className="fw-semibold text-warning">+{fmt(incrementAmount)}</div>
                  </CCol>
                  <CCol xs={4}>
                    <div className="small text-body-secondary">New Salary</div>
                    <div className="fw-bold text-success fs-6">{fmt(newSalary)}</div>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" type="button" onClick={handleClose} disabled={saving}>
            Cancel
          </CButton>
          <CButton color="success" type="submit" disabled={saving || !hasPreview}>
            {saving && <CSpinner size="sm" className="me-2" />}
            Apply Increment
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

SalaryUpdateModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  employeeId: PropTypes.string.isRequired,
  currentSalary: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onSave: PropTypes.func.isRequired,
}

export default SalaryUpdateModal
