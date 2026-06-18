import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import api from '../../../services/api'

const emptyAddr = (type) => ({
  address_type: type,
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  resident_location: '',
})

const AddressForm = ({ employeeId, type, initial, canEdit, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(initial || emptyAddr(type))
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put(`/employees/${employeeId}/addresses`, form)
      setEditing(false)
      onSave()
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CCard className="mb-3">
      <CCardHeader>
        <strong>{type} Address</strong>
      </CCardHeader>
      <CCardBody>
        <CForm onSubmit={handleSave}>
          {error && <CAlert color="danger">{error}</CAlert>}
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Address Line 1 *</CFormLabel>
              <CFormInput
                value={form.address_line1}
                onChange={set('address_line1')}
                disabled={!editing}
                required
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Address Line 2</CFormLabel>
              <CFormInput
                value={form.address_line2}
                onChange={set('address_line2')}
                disabled={!editing}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>City</CFormLabel>
              <CFormInput value={form.city} onChange={set('city')} disabled={!editing} />
            </CCol>
            <CCol md={4}>
              <CFormLabel>State *</CFormLabel>
              <CFormInput value={form.state} onChange={set('state')} disabled={!editing} required />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Pincode</CFormLabel>
              <CFormInput value={form.pincode} onChange={set('pincode')} disabled={!editing} />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Resident Location</CFormLabel>
              <CFormInput
                value={form.resident_location}
                onChange={set('resident_location')}
                disabled={!editing}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Country</CFormLabel>
              <CFormInput value={form.country} onChange={set('country')} disabled={!editing} />
            </CCol>
          </CRow>
          {canEdit && (
            <div className="mt-3 d-flex gap-2">
              {editing ? (
                <>
                  <CButton color="primary" type="submit" disabled={saving}>
                    {saving && <CSpinner size="sm" className="me-2" />}
                    Save
                  </CButton>
                  <CButton
                    color="secondary"
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </CButton>
                </>
              ) : (
                <CButton color="primary" type="button" onClick={() => setEditing(true)}>
                  Edit
                </CButton>
              )}
            </div>
          )}
        </CForm>
      </CCardBody>
    </CCard>
  )
}

AddressForm.propTypes = {
  employeeId: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  initial: PropTypes.object,
  canEdit: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
}

const AddressTab = ({ employeeId, addresses, canEdit, onSave }) => {
  const present = addresses?.find((a) => a.address_type === 'Present')
  const permanent = addresses?.find((a) => a.address_type === 'Permanent')
  return (
    <>
      <AddressForm
        employeeId={employeeId}
        type="Present"
        initial={present}
        canEdit={canEdit}
        onSave={onSave}
      />
      <AddressForm
        employeeId={employeeId}
        type="Permanent"
        initial={permanent}
        canEdit={canEdit}
        onSave={onSave}
      />
    </>
  )
}

AddressTab.propTypes = {
  employeeId: PropTypes.string.isRequired,
  addresses: PropTypes.array,
  canEdit: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default AddressTab
