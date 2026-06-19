import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
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
import { cilPlus } from '@coreui/icons'
import api from '../../../services/api'

const empty = {
  name: '',
  relationship: '',
  contact_number: '',
  date_of_birth: '',
  aadhar_number: '',
  pan_number: '',
}

const FamilyTab = ({ employeeId, familyMembers, canEdit, onSave }) => {
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(empty)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/employees/${employeeId}/family-members`, {
        ...form,
        date_of_birth: form.date_of_birth || undefined,
        aadhar_number: form.aadhar_number || undefined,
        pan_number: form.pan_number || undefined,
        contact_number: form.contact_number || undefined,
      })
      setShowModal(false)
      setForm(empty)
      onSave()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add family member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <strong>Family Members</strong>
        {canEdit && (
          <CButton color="primary" size="sm" onClick={() => setShowModal(true)}>
            <CIcon icon={cilPlus} className="me-1" />
            Add Member
          </CButton>
        )}
      </div>

      {!familyMembers?.length ? (
        <p className="text-body-secondary">No family members added.</p>
      ) : (
        <CTable hover responsive bordered>
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell>Name</CTableHeaderCell>
              <CTableHeaderCell>Relationship</CTableHeaderCell>
              <CTableHeaderCell>Contact</CTableHeaderCell>
              <CTableHeaderCell>Date of Birth</CTableHeaderCell>
              <CTableHeaderCell>Aadhar</CTableHeaderCell>
              <CTableHeaderCell>PAN</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {familyMembers.map((m) => (
              <CTableRow key={m.id}>
                <CTableDataCell className="fw-semibold">{m.name}</CTableDataCell>
                <CTableDataCell>{m.relationship}</CTableDataCell>
                <CTableDataCell>{m.contact_number || '—'}</CTableDataCell>
                <CTableDataCell>{m.date_of_birth || '—'}</CTableDataCell>
                <CTableDataCell>{m.aadhar_number || '—'}</CTableDataCell>
                <CTableDataCell>{m.pan_number || '—'}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      )}

      <CModal visible={showModal} onClose={() => setShowModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Add Family Member</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleAdd}>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Name *</CFormLabel>
                <CFormInput value={form.name} onChange={set('name')} required />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Relationship *</CFormLabel>
                <CFormInput
                  value={form.relationship}
                  onChange={set('relationship')}
                  placeholder="e.g. Father, Spouse"
                  required
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Contact Number</CFormLabel>
                <CFormInput value={form.contact_number} onChange={set('contact_number')} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Date of Birth</CFormLabel>
                <CFormInput
                  type="date"
                  value={form.date_of_birth}
                  onChange={set('date_of_birth')}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Aadhar Number</CFormLabel>
                <CFormInput
                  value={form.aadhar_number}
                  onChange={set('aadhar_number')}
                  placeholder="12 digits"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>PAN Number</CFormLabel>
                <CFormInput
                  value={form.pan_number}
                  onChange={set('pan_number')}
                  placeholder="ABCDE1234F"
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={saving}>
              {saving && <CSpinner size="sm" className="me-2" />}
              Add
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

FamilyTab.propTypes = {
  employeeId: PropTypes.string.isRequired,
  familyMembers: PropTypes.array,
  canEdit: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default FamilyTab
