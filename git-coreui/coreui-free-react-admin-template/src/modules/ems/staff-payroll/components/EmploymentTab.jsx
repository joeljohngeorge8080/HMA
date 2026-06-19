import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react'
import api from '../../../services/api'

const CATEGORY_OPTIONS = ['Permanent', 'FTC', 'TPC']
const STATUS_OPTIONS = ['Active', 'Inactive', 'Resigned', 'Retired']

const EmploymentTab = ({ profile, canEdit, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    designation: profile.designation,
    department: profile.department,
    employee_category: profile.employee_category,
    state_for_pt: profile.state_for_pt,
    joining_date: profile.joining_date,
    status: profile.status,
    exit_date: profile.exit_date || '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put(`/employees/${profile.id}`, {
        designation: form.designation,
        department: form.department,
        employee_category: form.employee_category,
        state_for_pt: form.state_for_pt,
        joining_date: form.joining_date,
      })
      if (form.status !== profile.status) {
        await api.patch(`/employees/${profile.id}/status`, {
          status: form.status,
          exit_date: form.exit_date || undefined,
        })
      }
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
        <CCol md={6}>
          <CFormLabel>Designation *</CFormLabel>
          <CFormInput
            value={form.designation}
            onChange={set('designation')}
            disabled={!editing}
            required
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Department *</CFormLabel>
          <CFormInput
            value={form.department}
            onChange={set('department')}
            disabled={!editing}
            required
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Employee Category *</CFormLabel>
          <CFormSelect
            value={form.employee_category}
            onChange={set('employee_category')}
            disabled={!editing}
            required
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <CFormLabel>State for PT *</CFormLabel>
          <CFormInput
            value={form.state_for_pt}
            onChange={set('state_for_pt')}
            disabled={!editing}
            required
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Joining Date *</CFormLabel>
          <CFormInput
            type="date"
            value={form.joining_date}
            onChange={set('joining_date')}
            disabled={!editing}
            required
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Status *</CFormLabel>
          <CFormSelect value={form.status} onChange={set('status')} disabled={!editing} required>
            {STATUS_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </CFormSelect>
        </CCol>
        {(form.status === 'Resigned' || form.status === 'Retired') && (
          <CCol md={4}>
            <CFormLabel>Exit Date *</CFormLabel>
            <CFormInput
              type="date"
              value={form.exit_date}
              onChange={set('exit_date')}
              disabled={!editing}
              required
            />
          </CCol>
        )}
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

EmploymentTab.propTypes = {
  profile: PropTypes.object.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default EmploymentTab
