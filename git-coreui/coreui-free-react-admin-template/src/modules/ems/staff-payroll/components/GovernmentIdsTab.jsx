import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CCol, CForm, CFormInput, CFormLabel, CRow, CSpinner } from '@coreui/react'
import api from '../../../services/api'

const GovernmentIdsTab = ({ employeeId, identification, canEdit, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    pan_number: identification?.pan_number || '',
    aadhar_number: identification?.aadhar_number || '',
    uan_number: identification?.uan_number || '',
    esi_number: identification?.esi_number || '',
    pf_number: identification?.pf_number || '',
    passport_number: identification?.passport_number || '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put(`/employees/${employeeId}/identification`, form)
      setEditing(false)
      onSave()
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CForm onSubmit={handleSave}>
      {error && <CAlert color="danger">{error}</CAlert>}
      <CRow className="g-3">
        {[
          { key: 'pan_number', label: 'PAN Number', placeholder: 'ABCDE1234F' },
          { key: 'aadhar_number', label: 'Aadhar Number', placeholder: '12-digit number' },
          { key: 'uan_number', label: 'UAN Number', placeholder: '12-digit UAN' },
          { key: 'esi_number', label: 'ESI Number', placeholder: '17-character ESI' },
          { key: 'pf_number', label: 'PF Number', placeholder: 'PF account number' },
          { key: 'passport_number', label: 'Passport Number', placeholder: 'A1234567' },
        ].map(({ key, label, placeholder }) => (
          <CCol md={4} key={key}>
            <CFormLabel>{label}</CFormLabel>
            <CFormInput
              value={form[key]}
              onChange={set(key)}
              disabled={!editing}
              placeholder={placeholder}
            />
          </CCol>
        ))}
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
  )
}

GovernmentIdsTab.propTypes = {
  employeeId: PropTypes.string.isRequired,
  identification: PropTypes.object,
  canEdit: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default GovernmentIdsTab
