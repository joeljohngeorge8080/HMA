import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
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
import { cilPencil, cilPlus, cilTrash } from '@coreui/icons'
import { usePermission } from '../../../hooks/usePermission'
import { MODULE } from '../../../constants/modules'
import { localInternships } from '../../../services/localInternships'

const INTERN_STATUSES = ['Active', 'Completed', 'Cancelled']
const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid']

const STATUS_COLORS = {
  Active: 'success',
  Completed: 'primary',
  Cancelled: 'secondary',
}
const PAY_COLORS = { Paid: 'success', Partial: 'warning', Pending: 'danger' }

const currency = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const EMPTY_FORM = {
  name: '',
  institution: '',
  department: '',
  start_date: '',
  end_date: '',
  supervisor: '',
  status: 'Active',
  amount_received: '',
  payment_status: 'Pending',
  remarks: '',
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const InternModal = ({ form, setForm, editTarget, onSave, onClose, saving, error }) => {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{editTarget ? 'Edit Intern' : 'Add Intern'}</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={saving} />
          </div>
          <div className="modal-body">
            {error && (
              <CAlert color="danger" className="py-2 mb-3">
                {error}
              </CAlert>
            )}

            {/* Basic Details */}
            <p className="fw-semibold text-body-secondary small text-uppercase mb-2 mt-1">
              Basic Details
            </p>
            <CRow className="g-3 mb-3">
              <CCol md={6}>
                <CFormLabel className="fw-semibold">
                  Intern Name <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Full name"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Institution / College</CFormLabel>
                <CFormInput
                  value={form.institution}
                  onChange={(e) => set('institution', e.target.value)}
                  placeholder="e.g. MES Medical College"
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-semibold">Department</CFormLabel>
                <CFormInput
                  value={form.department}
                  onChange={(e) => set('department', e.target.value)}
                  placeholder="e.g. Admin"
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-semibold">Start Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={form.start_date}
                  onChange={(e) => set('start_date', e.target.value)}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-semibold">End Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={form.end_date}
                  onChange={(e) => set('end_date', e.target.value)}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Supervisor</CFormLabel>
                <CFormInput
                  value={form.supervisor}
                  onChange={(e) => set('supervisor', e.target.value)}
                  placeholder="Reporting supervisor"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Status</CFormLabel>
                <CFormSelect value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {INTERN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            <hr className="my-2" />

            {/* Received Amount */}
            <p className="fw-semibold text-body-secondary small text-uppercase mb-2 mt-3">
              Received Amount
            </p>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel className="fw-semibold">Amount Received (₹)</CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount_received}
                  onChange={(e) => set('amount_received', e.target.value)}
                  placeholder="0"
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-semibold">Payment Status</CFormLabel>
                <CFormSelect
                  value={form.payment_status}
                  onChange={(e) => set('payment_status', e.target.value)}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={12}>
                <CFormLabel>Remarks</CFormLabel>
                <CFormTextarea
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => set('remarks', e.target.value)}
                  placeholder="Optional notes"
                />
              </CCol>
            </CRow>
          </div>
          <div className="modal-footer">
            <CButton color="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={onSave} disabled={saving}>
              {saving && <CSpinner size="sm" className="me-1" />}
              {editTarget ? 'Save Changes' : 'Add Intern'}
            </CButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────
const DeleteModal = ({ target, onConfirm, onClose }) => (
  <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Delete Intern</h5>
        </div>
        <div className="modal-body">
          Delete <strong>{target.name}</strong>? This cannot be undone.
        </div>
        <div className="modal-footer">
          <CButton color="secondary" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={onConfirm}>
            Delete
          </CButton>
        </div>
      </div>
    </div>
  </div>
)

// ── Page ──────────────────────────────────────────────────────────────────────
const InternshipPage = () => {
  const canEdit = usePermission(MODULE.INTERNSHIP, 'edit')

  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => setRows(localInternships.list({ search, status: filterStatus }))

  useEffect(() => {
    load()
  }, [search, filterStatus])

  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (row) => {
    setEditTarget(row)
    setForm({
      name: row.name,
      institution: row.institution || '',
      department: row.department || '',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      supervisor: row.supervisor || '',
      status: row.status,
      amount_received: row.amount_received || '',
      payment_status: row.payment_status,
      remarks: row.remarks || '',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      setFormError('Intern name is required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        institution: form.institution.trim() || null,
        department: form.department.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        supervisor: form.supervisor.trim() || null,
        status: form.status,
        amount_received: parseFloat(form.amount_received) || 0,
        payment_status: form.payment_status,
        remarks: form.remarks.trim() || null,
      }
      if (editTarget) {
        localInternships.update(editTarget.id, payload)
      } else {
        localInternships.create(payload)
      }
    } catch (e) {
      setFormError(e.message || 'Save failed')
      setSaving(false)
      return
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    localInternships.delete(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  const activeCount = rows.filter((r) => r.status === 'Active').length
  const completedCount = rows.filter((r) => r.status === 'Completed').length

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Internship</h4>
          <p className="text-body-secondary mb-0 small">
            Track interns, their basic details, and received amounts.
          </p>
        </div>
        {canEdit && (
          <CButton color="primary" size="sm" onClick={openAdd}>
            <CIcon icon={cilPlus} className="me-1" /> Add Intern
          </CButton>
        )}
      </div>

      {/* Stats */}
      <CRow className="g-3 mb-4">
        <CCol xs={4}>
          <CCard className="border-top border-top-primary border-3 text-center">
            <CCardBody className="py-3">
              <div className="small text-body-secondary mb-1">Total</div>
              <div className="fw-bold fs-5 text-primary">{rows.length}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={4}>
          <CCard className="border-top border-top-success border-3 text-center">
            <CCardBody className="py-3">
              <div className="small text-body-secondary mb-1">Active</div>
              <div className="fw-bold fs-5 text-success">{activeCount}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={4}>
          <CCard className="border-top border-top-info border-3 text-center">
            <CCardBody className="py-3">
              <div className="small text-body-secondary mb-1">Completed</div>
              <div className="fw-bold fs-5 text-info">{completedCount}</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Filters */}
      <CCard className="mb-3">
        <CCardBody>
          <CRow className="g-2">
            <CCol md={6}>
              <CFormLabel className="small fw-semibold">Search</CFormLabel>
              <CFormInput
                size="sm"
                placeholder="Name, institution, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel className="small fw-semibold">Status</CFormLabel>
              <CFormSelect
                size="sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                {INTERN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Table */}
      <CCard>
        <CCardBody className="p-0">
          <CTable small hover responsive className="mb-0">
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell style={{ width: 40 }}>#</CTableHeaderCell>
                <CTableHeaderCell>Intern Name</CTableHeaderCell>
                <CTableHeaderCell>Institution</CTableHeaderCell>
                <CTableHeaderCell>Department</CTableHeaderCell>
                <CTableHeaderCell>Period</CTableHeaderCell>
                <CTableHeaderCell>Supervisor</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Amount Received</CTableHeaderCell>
                <CTableHeaderCell>Payment</CTableHeaderCell>
                {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rows.length === 0 && (
                <CTableRow>
                  <CTableDataCell
                    colSpan={canEdit ? 10 : 9}
                    className="text-center text-body-secondary py-5"
                  >
                    No intern records found.{canEdit && ' Click "Add Intern" to get started.'}
                  </CTableDataCell>
                </CTableRow>
              )}
              {rows.map((row, idx) => (
                <CTableRow key={row.id}>
                  <CTableDataCell className="text-body-secondary small">{idx + 1}</CTableDataCell>
                  <CTableDataCell className="fw-semibold">{row.name}</CTableDataCell>
                  <CTableDataCell className="small">{row.institution || '—'}</CTableDataCell>
                  <CTableDataCell className="small">{row.department || '—'}</CTableDataCell>
                  <CTableDataCell className="small text-body-secondary">
                    {row.start_date || '—'}
                    {row.start_date && row.end_date ? ' → ' : ''}
                    {row.end_date || ''}
                  </CTableDataCell>
                  <CTableDataCell className="small">{row.supervisor || '—'}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={STATUS_COLORS[row.status] || 'secondary'}>{row.status}</CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {currency(row.amount_received)}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={PAY_COLORS[row.payment_status] || 'secondary'}>
                      {row.payment_status}
                    </CBadge>
                  </CTableDataCell>
                  {canEdit && (
                    <CTableDataCell>
                      <CButton
                        color="secondary"
                        variant="ghost"
                        size="sm"
                        className="me-1"
                        onClick={() => openEdit(row)}
                        title="Edit"
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(row)}
                        title="Delete"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  )}
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>

      {showModal && (
        <InternModal
          form={form}
          setForm={setForm}
          editTarget={editTarget}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
          error={formError}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}

export default InternshipPage
