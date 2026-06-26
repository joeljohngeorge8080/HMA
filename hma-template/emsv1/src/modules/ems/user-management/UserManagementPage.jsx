import React, { useState, useEffect, useCallback } from 'react'
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
import { cilPlus, cilTrash, cilPeople } from '@coreui/icons'

import {
  getRegisteredUsers,
  addRegisteredUser,
  removeRegisteredUser,
  ASSIGNABLE_ROLES,
} from '../../../services/localUsers'
import useAuth from '../../../hooks/useAuth'
import { ROLE } from '../../../constants/roles'

const ROLE_COLORS = {
  [ROLE.ADMIN]: 'danger',
  [ROLE.CEO]: 'dark',
  [ROLE.HEADS]: 'primary',
  [ROLE.HR]: 'info',
  [ROLE.FINANCE]: 'success',
  [ROLE.PROJECT_COORDINATOR]: 'warning',
  [ROLE.PROJECT_ASSOCIATE]: 'secondary',
  [ROLE.PROJECT_OFFICER]: 'secondary',
  [ROLE.FIELD_PERSONNEL]: 'secondary',
  [ROLE.BACKEND_TEAM]: 'secondary',
  [ROLE.EMPLOYEE]: 'light',
}

const EMPTY_FORM = { full_name: '', google_email: '', role: ROLE.EMPLOYEE }

const UserManagementPage = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === ROLE.ADMIN

  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const refresh = useCallback(() => setUsers(getRegisteredUsers()), [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAdd = (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      addRegisteredUser({ ...form, added_by: user?.full_name || 'admin' })
      setSuccess(`${form.full_name} has been registered successfully.`)
      setShowModal(false)
      setForm(EMPTY_FORM)
      refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    removeRegisteredUser(deleteTarget.id)
    setDeleteTarget(null)
    refresh()
  }

  const canDelete = (u) => {
    if (u.id === 'USR000') return false
    if (!isAdmin && u.role === ROLE.ADMIN) return false
    return u.google_email !== user?.google_email
  }

  return (
    <>
      <CRow className="mb-3 align-items-center">
        <CCol>
          <h4 className="mb-0 d-flex align-items-center gap-2">
            <CIcon icon={cilPeople} size="lg" />
            User Management
          </h4>
          <p className="text-body-secondary mb-0 small mt-1">
            Only registered Google accounts can log in to HMA IEMS.
          </p>
        </CCol>
        <CCol xs="auto">
          <CButton color="primary" onClick={() => { setShowModal(true); setError('') }}>
            <CIcon icon={cilPlus} className="me-1" />
            Add User
          </CButton>
        </CCol>
      </CRow>

      {success && (
        <CAlert color="success" dismissible onClose={() => setSuccess('')} className="mb-3">
          {success}
        </CAlert>
      )}

      <CCard>
        <CCardHeader className="fw-semibold">Registered Users ({users.length})</CCardHeader>
        <CCardBody className="p-0">
          <CTable hover responsive className="mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Name</CTableHeaderCell>
                <CTableHeaderCell>Google Email</CTableHeaderCell>
                <CTableHeaderCell>Role</CTableHeaderCell>
                <CTableHeaderCell>Added By</CTableHeaderCell>
                <CTableHeaderCell>Date Added</CTableHeaderCell>
                <CTableHeaderCell></CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {users.map((u) => (
                <CTableRow key={u.id}>
                  <CTableDataCell className="fw-medium">{u.full_name}</CTableDataCell>
                  <CTableDataCell className="text-body-secondary">{u.google_email}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={ROLE_COLORS[u.role] || 'secondary'}>{u.role}</CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-body-secondary small">{u.added_by}</CTableDataCell>
                  <CTableDataCell className="text-body-secondary small">
                    {new Date(u.added_at).toLocaleDateString()}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {canDelete(u) && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )}
                  </CTableDataCell>
                </CTableRow>
              ))}
              {users.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={6} className="text-center text-body-secondary py-4">
                    No users registered yet.
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>

      {/* ── Add User Modal ── */}
      <CModal visible={showModal} onClose={() => setShowModal(false)}>
        <CModalHeader>
          <CModalTitle>Register New User</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleAdd}>
          <CModalBody>
            {error && (
              <CAlert color="danger" className="mb-3">
                {error}
              </CAlert>
            )}
            <div className="mb-3">
              <CFormLabel>Full Name</CFormLabel>
              <CFormInput
                placeholder="e.g. John Doe"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Google Email</CFormLabel>
              <CFormInput
                type="email"
                placeholder="name@gmail.com"
                value={form.google_email}
                onChange={(e) => setForm((f) => ({ ...f, google_email: e.target.value }))}
                required
              />
              <div className="form-text">
                This must match the user's Google account exactly.
              </div>
            </div>
            <div className="mb-3">
              <CFormLabel>Role</CFormLabel>
              <CFormSelect
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                required
              >
                {(isAdmin ? [ROLE.ADMIN, ...ASSIGNABLE_ROLES] : ASSIGNABLE_ROLES).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </CFormSelect>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={saving}>
              {saving && <CSpinner size="sm" className="me-1" />}
              Register User
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* ── Delete Confirm Modal ── */}
      <CModal visible={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <CModalHeader>
          <CModalTitle>Remove User</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Remove <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.google_email}) from
          the system? They will no longer be able to log in.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDelete}>
            Remove
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default UserManagementPage
