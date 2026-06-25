import React, { useEffect, useMemo, useState } from 'react'
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
import { localAdminExpenses } from '../../../services/localAdminExpenses'

const FREQUENCIES = ['Monthly', 'Quarterly', 'Half Yearly', 'Annually']
const STATUSES = ['Active', 'Inactive']

const currency = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const monthlyEquiv = (annual) => Math.round(parseFloat(annual || 0) / 12)

const STATUS_COLORS = { Active: 'success', Inactive: 'secondary' }

const EMPTY_FORM = {
  vendor_name: '',
  expense_category: '',
  frequency: 'Monthly',
  annual_amount: '',
  status: 'Active',
  remarks: '',
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = 'primary' }) => (
  <CCard className={`border-top border-top-${color} border-3 text-center`}>
    <CCardBody className="py-3">
      <div className="small text-body-secondary mb-1">{label}</div>
      <div className={`fw-bold fs-5 text-${color}`}>{value}</div>
    </CCardBody>
  </CCard>
)

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
const ExpenseModal = ({ form, setForm, editTarget, onSave, onClose, saving, error }) => {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const monthly = form.annual_amount !== '' ? monthlyEquiv(form.annual_amount) : null

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {editTarget ? 'Edit Expense Entry' : 'Add Expense Entry'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={saving} />
          </div>
          <div className="modal-body">
            {error && <CAlert color="danger" className="py-2 mb-3">{error}</CAlert>}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel className="fw-semibold">
                  Vendor Name <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  value={form.vendor_name}
                  onChange={(e) => set('vendor_name', e.target.value)}
                  placeholder="e.g. Manjith Travels"
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel className="fw-semibold">
                  Expense Category <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  value={form.expense_category}
                  onChange={(e) => set('expense_category', e.target.value)}
                  placeholder="e.g. Contract Vehicle"
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel className="fw-semibold">Frequency</CFormLabel>
                <CFormSelect
                  value={form.frequency}
                  onChange={(e) => set('frequency', e.target.value)}
                >
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </CFormSelect>
              </CCol>

              <CCol md={4}>
                <CFormLabel className="fw-semibold">
                  Annual Amount (₹) <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="1"
                  value={form.annual_amount}
                  onChange={(e) => set('annual_amount', e.target.value)}
                  placeholder="0"
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel className="fw-semibold">Monthly Equivalent</CFormLabel>
                <div className="form-control bg-body-secondary text-body-secondary">
                  {monthly !== null ? currency(monthly) : '—'}
                </div>
                <div className="form-text">Annual ÷ 12 (auto)</div>
              </CCol>

              <CCol md={4}>
                <CFormLabel className="fw-semibold">Status</CFormLabel>
                <CFormSelect value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
            <CButton color="secondary" onClick={onClose} disabled={saving}>Cancel</CButton>
            <CButton color="primary" onClick={onSave} disabled={saving}>
              {saving && <CSpinner size="sm" className="me-1" />}
              {editTarget ? 'Save Changes' : 'Add Entry'}
            </CButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
const DeleteModal = ({ target, onConfirm, onClose }) => (
  <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Delete Expense Entry</h5>
        </div>
        <div className="modal-body">
          Delete <strong>{target.expense_category}</strong> — {target.vendor_name}? This cannot be undone.
        </div>
        <div className="modal-footer">
          <CButton color="secondary" onClick={onClose}>Cancel</CButton>
          <CButton color="danger" onClick={onConfirm}>Delete</CButton>
        </div>
      </div>
    </div>
  </div>
)

// ── Main page ─────────────────────────────────────────────────────────────────
const AdminExpensePage = () => {
  const canEdit = usePermission(MODULE.EXPENSE_MANAGEMENT, 'edit')

  const [rows, setRows] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [filters, setFilters] = useState({ search: '', category: '', frequency: '', status: '' })

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => {
    setRows(localAdminExpenses.list(filters))
    setAllCategories(localAdminExpenses.categories())
  }

  useEffect(() => { load() }, [filters])

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }))

  // Stats — always over all active entries (not filtered)
  const allActive = useMemo(() => {
    const all = localAdminExpenses.list({ status: 'Active' })
    return all
  }, [rows])

  const totalMonthly = useMemo(
    () => allActive.reduce((s, r) => s + monthlyEquiv(r.annual_amount), 0),
    [allActive],
  )
  const totalAnnual = useMemo(
    () => allActive.reduce((s, r) => s + parseFloat(r.annual_amount || 0), 0),
    [allActive],
  )
  const activeVendors = useMemo(
    () => new Set(allActive.map((r) => r.vendor_name)).size,
    [allActive],
  )

  // Filtered totals shown in table footer
  const filteredMonthly = useMemo(
    () => rows.reduce((s, r) => s + monthlyEquiv(r.annual_amount), 0),
    [rows],
  )
  const filteredAnnual = useMemo(
    () => rows.reduce((s, r) => s + parseFloat(r.annual_amount || 0), 0),
    [rows],
  )

  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (row) => {
    setEditTarget(row)
    setForm({
      vendor_name: row.vendor_name,
      expense_category: row.expense_category,
      frequency: row.frequency,
      annual_amount: row.annual_amount,
      status: row.status,
      remarks: row.remarks || '',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.vendor_name.trim()) { setFormError('Vendor name is required'); return }
    if (!form.expense_category.trim()) { setFormError('Expense category is required'); return }
    if (form.annual_amount === '' || isNaN(parseFloat(form.annual_amount))) {
      setFormError('Annual amount is required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editTarget) {
        localAdminExpenses.update(editTarget.id, {
          vendor_name: form.vendor_name.trim(),
          expense_category: form.expense_category.trim(),
          frequency: form.frequency,
          annual_amount: parseFloat(form.annual_amount),
          status: form.status,
          remarks: form.remarks.trim() || null,
        })
      } else {
        localAdminExpenses.create(form)
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
    localAdminExpenses.delete(deleteTarget.id)
    setDeleteTarget(null)
    load()
  }

  return (
    <>
      {/* Page header */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Admin Expenses</h4>
          <p className="text-body-secondary mb-0 small">
            Manage recurring monthly, quarterly, half-yearly and annual expenses.
          </p>
        </div>
        {canEdit && (
          <CButton color="primary" size="sm" onClick={openAdd}>
            <CIcon icon={cilPlus} className="me-1" /> Add Expense
          </CButton>
        )}
      </div>

      {/* Stats */}
      <CRow className="g-3 mb-4">
        <CCol xs={6} md={3}>
          <StatCard
            label="Total Monthly Expense"
            value={currency(totalMonthly)}
            color="primary"
          />
        </CCol>
        <CCol xs={6} md={3}>
          <StatCard
            label="Total Annual Expense"
            value={currency(totalAnnual)}
            color="info"
          />
        </CCol>
        <CCol xs={6} md={3}>
          <StatCard
            label="Active Vendors"
            value={activeVendors}
            color="success"
          />
        </CCol>
        <CCol xs={6} md={3}>
          <StatCard
            label="Total Expenses"
            value={localAdminExpenses.list().length}
            color="warning"
          />
        </CCol>
      </CRow>

      {/* Filters */}
      <CCard className="mb-3">
        <CCardBody>
          <strong className="d-block mb-3">Filter Expenses</strong>
          <CRow className="g-2">
            <CCol md={3}>
              <CFormLabel className="small fw-semibold">Vendor Name</CFormLabel>
              <CFormInput
                size="sm"
                placeholder="Search vendor..."
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel className="small fw-semibold">Category</CFormLabel>
              <CFormSelect
                size="sm"
                value={filters.category}
                onChange={(e) => setFilter('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormLabel className="small fw-semibold">Frequency</CFormLabel>
              <CFormSelect
                size="sm"
                value={filters.frequency}
                onChange={(e) => setFilter('frequency', e.target.value)}
              >
                <option value="">All Frequencies</option>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormLabel className="small fw-semibold">Status</CFormLabel>
              <CFormSelect
                size="sm"
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
              >
                <option value="">All Status</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Table */}
      <CCard>
        <CCardBody className="p-0">
          <div className="px-3 pt-3 pb-2 d-flex align-items-center justify-content-between">
            <strong className="small">
              Expense Entries{' '}
              <span className="text-body-secondary fw-normal">
                {rows.length} of {localAdminExpenses.list().length}
              </span>
            </strong>
          </div>

          <CTable small hover responsive className="mb-0">
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell style={{ width: 40 }}>#</CTableHeaderCell>
                <CTableHeaderCell>Vendor Name</CTableHeaderCell>
                <CTableHeaderCell>Expense Category</CTableHeaderCell>
                <CTableHeaderCell>Frequency</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Annual Amount</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Monthly Equivalent</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rows.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={canEdit ? 8 : 7} className="text-center text-body-secondary py-5">
                    No expense records found.
                    {canEdit && ' Click "Add Expense" to create one.'}
                  </CTableDataCell>
                </CTableRow>
              )}
              {rows.map((row, idx) => (
                <CTableRow key={row.id}>
                  <CTableDataCell className="text-body-secondary small">{idx + 1}</CTableDataCell>
                  <CTableDataCell>
                    <span className="fw-semibold">{row.vendor_name}</span>
                    {row.remarks && (
                      <div className="small text-body-secondary">{row.remarks}</div>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>{row.expense_category}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color="info" textColor="dark">{row.frequency}</CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold">
                    {currency(row.annual_amount)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-body-secondary">
                    {currency(monthlyEquiv(row.annual_amount))}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={STATUS_COLORS[row.status] || 'secondary'}>
                      {row.status}
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

          {/* Filtered totals footer */}
          {rows.length > 0 && (
            <div className="px-3 py-2 border-top d-flex gap-4 justify-content-end text-body-secondary small">
              <span>
                Annual Total (filtered):{' '}
                <strong className="text-body">{currency(filteredAnnual)}</strong>
              </span>
              <span>
                Monthly Total (filtered):{' '}
                <strong className="text-body">{currency(filteredMonthly)}</strong>
              </span>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Add / Edit modal */}
      {showModal && (
        <ExpenseModal
          form={form}
          setForm={setForm}
          editTarget={editTarget}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
          error={formError}
        />
      )}

      {/* Delete confirm */}
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

export default AdminExpensePage
