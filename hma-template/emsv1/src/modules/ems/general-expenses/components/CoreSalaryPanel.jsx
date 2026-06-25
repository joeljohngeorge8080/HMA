import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CProgress,
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
import { localCoreSalaries } from '../../../../services/localCoreSalaries'
import { localEmployees } from '../../../../services/localEmployees'

const currency = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const STATUS_COLORS = { Pending: 'warning', Paid: 'success', Overdue: 'danger', Cancelled: 'secondary' }
const STATUSES = ['Pending', 'Paid', 'Overdue', 'Cancelled']

const EMPTY_FORM = {
  employee_id: '',
  employee_name: '',
  employee_code: '',
  planned_amount: '',
  actual_amount: '',
  status: 'Pending',
  remarks: '',
}

const CoreSalaryPanel = ({ year, month, canEdit }) => {
  const [entries, setEntries] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadEntries = () => {
    setLoading(true)
    setEntries(localCoreSalaries.list({ year, month }))
    setLoading(false)
  }

  useEffect(() => {
    loadEntries()
  }, [year, month])

  useEffect(() => {
    const { items } = localEmployees.list({ status: 'Active', pageSize: 500 })
    setEmployees(items)
  }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, month: month || new Date().getMonth() + 1, year: year || new Date().getFullYear() })
    setShowModal(true)
  }

  const openEdit = (entry) => {
    setEditTarget(entry)
    setForm({
      employee_id: entry.employee_id,
      employee_name: entry.employee_name,
      employee_code: entry.employee_code || '',
      planned_amount: entry.planned_amount,
      actual_amount: entry.actual_amount,
      status: entry.status,
      remarks: entry.remarks || '',
    })
    setShowModal(true)
  }

  const handleEmployeeChange = (empId) => {
    const emp = employees.find((e) => e.id === empId)
    if (emp) {
      const salary = emp.current_salary || emp.salary_history?.[emp.salary_history.length - 1]?.new_salary || ''
      setForm((f) => ({
        ...f,
        employee_id: empId,
        employee_name: emp.employee_name,
        employee_code: emp.employee_id,
        planned_amount: salary !== '' ? salary : f.planned_amount,
      }))
    } else {
      setForm((f) => ({ ...f, employee_id: '', employee_name: '', employee_code: '' }))
    }
  }

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSave = () => {
    if (!form.employee_id) return
    if (form.planned_amount === '' || isNaN(parseFloat(form.planned_amount))) return
    setSaving(true)
    const payload = {
      employee_id: form.employee_id,
      employee_name: form.employee_name,
      employee_code: form.employee_code,
      month: month,
      year: year,
      planned_amount: parseFloat(form.planned_amount),
      actual_amount: parseFloat(form.actual_amount || 0),
      status: form.status,
      remarks: form.remarks.trim() || null,
    }
    if (editTarget) {
      localCoreSalaries.update(editTarget.id, payload)
    } else {
      localCoreSalaries.create(payload)
    }
    setSaving(false)
    setShowModal(false)
    loadEntries()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    localCoreSalaries.delete(deleteTarget.id)
    setDeleteTarget(null)
    loadEntries()
  }

  const totalPlanned = entries.reduce((s, e) => s + parseFloat(e.planned_amount || 0), 0)
  const totalActual = entries.reduce((s, e) => s + parseFloat(e.actual_amount || 0), 0)
  const variance = totalActual - totalPlanned
  const utilizationPct =
    totalPlanned > 0 ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) : 0
  const paidCount = entries.filter((e) => e.status === 'Paid').length
  const pendingCount = entries.filter((e) => e.status === 'Pending').length
  const overdueCount = entries.filter((e) => e.status === 'Overdue').length

  const variance_display = parseFloat(
    ((parseFloat(form.actual_amount || 0)) - (parseFloat(form.planned_amount || 0))).toFixed(2)
  )

  return (
    <>
      <CCard className="border-top border-top-success border-3">
        <CCardHeader>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <strong>Core — Employee Salaries</strong>
              <div className="small text-body-secondary mt-1">Staff payroll for the selected period</div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <CBadge color="success" className="fs-6 px-3 py-2">
                {entries.length} employee{entries.length !== 1 ? 's' : ''}
              </CBadge>
              {canEdit && (
                <CButton color="success" size="sm" onClick={openAdd}>
                  <CIcon icon={cilPlus} className="me-1" /> Add Employee
                </CButton>
              )}
            </div>
          </div>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-4"><CSpinner color="success" /></div>
          ) : entries.length === 0 ? (
            <p className="text-body-secondary small mb-0">
              No salary entries for this period.
              {canEdit && ' Click "Add Employee" to add an employee salary entry.'}
            </p>
          ) : (
            <>
              {/* Totals */}
              <CRow className="g-2 mb-3">
                <CCol xs={4}>
                  <div className="border rounded p-2 text-center">
                    <div className="small text-body-secondary">Planned</div>
                    <div className="fw-bold text-success">{currency(totalPlanned)}</div>
                  </div>
                </CCol>
                <CCol xs={4}>
                  <div className="border rounded p-2 text-center">
                    <div className="small text-body-secondary">Actual</div>
                    <div className="fw-bold">{currency(totalActual)}</div>
                  </div>
                </CCol>
                <CCol xs={4}>
                  <div className="border rounded p-2 text-center">
                    <div className="small text-body-secondary">Variance</div>
                    <div className={`fw-bold text-${variance > 0 ? 'danger' : 'success'}`}>
                      {variance > 0 ? '+' : ''}{currency(variance)}
                    </div>
                  </div>
                </CCol>
              </CRow>

              {/* Utilization */}
              <div className="mb-3">
                <div className="d-flex justify-content-between small text-body-secondary mb-1">
                  <span>Budget utilisation</span>
                  <span>{utilizationPct}%</span>
                </div>
                <CProgress
                  value={utilizationPct}
                  color={utilizationPct > 100 ? 'danger' : utilizationPct > 85 ? 'warning' : 'success'}
                  height={8}
                />
              </div>

              {/* Status badges */}
              <div className="d-flex gap-2 mb-3 flex-wrap">
                {paidCount > 0 && <CBadge color="success">{paidCount} Paid</CBadge>}
                {pendingCount > 0 && <CBadge color="warning">{pendingCount} Pending</CBadge>}
                {overdueCount > 0 && <CBadge color="danger">{overdueCount} Overdue</CBadge>}
              </div>

              {/* Salary table */}
              <CTable small bordered hover responsive className="mb-0">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Employee</CTableHeaderCell>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Planned</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Actual</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Variance</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {entries.map((entry) => (
                    <CTableRow key={entry.id}>
                      <CTableDataCell className="fw-semibold">{entry.employee_name}</CTableDataCell>
                      <CTableDataCell className="text-body-secondary small">{entry.employee_code}</CTableDataCell>
                      <CTableDataCell className="text-end small">{currency(entry.planned_amount)}</CTableDataCell>
                      <CTableDataCell className="text-end small">{currency(entry.actual_amount)}</CTableDataCell>
                      <CTableDataCell
                        className={`text-end small fw-semibold text-${entry.variance > 0 ? 'danger' : 'success'}`}
                      >
                        {entry.variance > 0 ? '+' : ''}{currency(entry.variance)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={STATUS_COLORS[entry.status] || 'secondary'}>{entry.status}</CBadge>
                      </CTableDataCell>
                      {canEdit && (
                        <CTableDataCell>
                          <CButton
                            color="secondary"
                            variant="ghost"
                            size="sm"
                            className="me-1"
                            onClick={() => openEdit(entry)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(entry)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      )}
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editTarget ? 'Edit Salary Entry' : 'Add Employee Salary'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <CRow className="g-3">
                  {/* Employee picker — read-only when editing */}
                  <CCol md={12}>
                    <CFormLabel className="fw-semibold">
                      Employee <span className="text-danger">*</span>
                    </CFormLabel>
                    {editTarget ? (
                      <div className="form-control bg-body-secondary">
                        {form.employee_name}{form.employee_code ? ` (${form.employee_code})` : ''}
                      </div>
                    ) : (
                      <CFormSelect
                        value={form.employee_id}
                        onChange={(e) => handleEmployeeChange(e.target.value)}
                        required
                      >
                        <option value="">Select employee…</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.employee_name} ({emp.employee_id})
                          </option>
                        ))}
                      </CFormSelect>
                    )}
                  </CCol>

                  <CCol md={4}>
                    <CFormLabel className="fw-semibold">
                      Planned Salary (₹) <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.planned_amount}
                      onChange={(e) => set('planned_amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </CCol>

                  <CCol md={4}>
                    <CFormLabel className="fw-semibold">Actual Salary (₹)</CFormLabel>
                    <CFormInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.actual_amount}
                      onChange={(e) => set('actual_amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </CCol>

                  <CCol md={4}>
                    <CFormLabel className="fw-semibold">Variance</CFormLabel>
                    <div
                      className={`form-control bg-body-secondary ${
                        form.planned_amount === ''
                          ? ''
                          : variance_display > 0
                          ? 'text-danger'
                          : variance_display < 0
                          ? 'text-success'
                          : ''
                      }`}
                      style={{ userSelect: 'none' }}
                    >
                      {form.planned_amount === ''
                        ? '—'
                        : `${variance_display > 0 ? '+' : ''}${new Intl.NumberFormat('en-IN').format(variance_display)}`}
                    </div>
                  </CCol>

                  <CCol md={6}>
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
                <CButton color="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </CButton>
                <CButton
                  color="primary"
                  onClick={handleSave}
                  disabled={saving || !form.employee_id || form.planned_amount === ''}
                >
                  {saving && <CSpinner size="sm" className="me-1" />}
                  {editTarget ? 'Save Changes' : 'Add Entry'}
                </CButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Remove Salary Entry</h5>
              </div>
              <div className="modal-body">
                Remove salary entry for <strong>{deleteTarget.employee_name}</strong>? This cannot be undone.
              </div>
              <div className="modal-footer">
                <CButton color="secondary" onClick={() => setDeleteTarget(null)}>Cancel</CButton>
                <CButton color="danger" onClick={handleDelete}>Remove</CButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

CoreSalaryPanel.propTypes = {
  year: PropTypes.number,
  month: PropTypes.number,
  canEdit: PropTypes.bool,
}

export default CoreSalaryPanel
