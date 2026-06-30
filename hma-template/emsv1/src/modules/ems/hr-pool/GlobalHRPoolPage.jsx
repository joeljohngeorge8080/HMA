import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilSave, cilX } from '@coreui/icons'
import { localOrgPool } from '../../../services/localOrgPool'

const GlobalHRPoolPage = () => {
  const [form, setForm] = useState({
    vendor: '',
    label: '',
    frequency: 'Monthly',
    yearly_price: '',
    amount: '',
    date: '',
    notes: '',
  })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [allExpenses, setAllExpenses] = useState([])
  const [previewAllocs, setPreviewAllocs] = useState([])

  const reload = () => {
    setAllExpenses(localOrgPool.getHRExpenses())
  }

  useEffect(() => {
    reload()
  }, [])

  const fmt2 = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n || 0)
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : ''

  const handlePreview = () => {
    const amt = parseFloat(form.amount) || 0
    if (amt > 0) setPreviewAllocs(localOrgPool.computeAllocations('hr', amt))
    else setPreviewAllocs([])
  }

  const handleYearlyPriceChange = (val, isEdit = false) => {
    const yp = parseFloat(val) || 0
    const mc = yp > 0 ? (yp / 12).toFixed(2) : ''
    if (isEdit) {
      setEditForm((f) => ({ ...f, yearly_price: val, amount: mc }))
    } else {
      setForm((f) => ({ ...f, yearly_price: val, amount: mc }))
      setPreviewAllocs([])
    }
  }

  const handleMonthlyCutChange = (val, isEdit = false) => {
    const mc = parseFloat(val) || 0
    const yp = mc > 0 ? (mc * 12).toFixed(2) : ''
    if (isEdit) {
      setEditForm((f) => ({ ...f, amount: val, yearly_price: yp }))
    } else {
      setForm((f) => ({ ...f, amount: val, yearly_price: yp }))
      setPreviewAllocs([])
    }
  }

  const handleAdd = () => {
    if (!form.label || !form.amount) return
    localOrgPool.addHRExpense(form, 'global')
    setForm({
      vendor: '',
      label: '',
      frequency: 'Monthly',
      yearly_price: '',
      amount: '',
      date: '',
      notes: '',
    })
    setAdding(false)
    setPreviewAllocs([])
    reload()
  }

  const handleRemove = (id) => {
    localOrgPool.removeHRExpense(id)
    reload()
  }

  const handleEditSave = () => {
    localOrgPool.updateHRExpense(editId, editForm)
    setEditId(null)
    reload()
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1 fw-bold">Global HR Expense Pool</h4>
          <p className="text-body-secondary mb-0 small">
            Organisation-wide HR expenses distributed across projects.
          </p>
        </div>
      </div>

      <CCard className="shadow-sm border-top border-4 border-top-success mb-4">
        <CCardHeader className="bg-transparent fw-semibold pt-3 d-flex justify-content-between align-items-center">
          <span>Manage Organization-Wide HR Expenses</span>
          <CBadge color="success" shape="rounded-pill">
            {allExpenses.length} Total Expenses
          </CBadge>
        </CCardHeader>
        <CCardBody>
          {adding ? (
            <div className="border rounded p-3 bg-body-secondary mb-4">
              <h6 className="fw-semibold mb-3">Add New HR Expense</h6>
              <CRow className="g-2 mb-2">
                <CCol xs={12} md={3}>
                  <CFormInput
                    size="sm"
                    placeholder="Vendor / Payee *"
                    value={form.vendor}
                    onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                  />
                </CCol>
                <CCol xs={12} md={3}>
                  <CFormInput
                    size="sm"
                    placeholder="Category / Description *"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  />
                </CCol>
                <CCol xs={12} md={2}>
                  <CFormSelect
                    size="sm"
                    value={form.frequency}
                    onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="One-time">One-time</option>
                  </CFormSelect>
                </CCol>
                <CCol xs={6} md={2}>
                  <CInputGroup size="sm">
                    <CInputGroupText>₹</CInputGroupText>
                    <CFormInput
                      type="number"
                      min="0"
                      placeholder="Yearly Price"
                      value={form.yearly_price}
                      onChange={(e) => handleYearlyPriceChange(e.target.value, false)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol xs={6} md={2}>
                  <CInputGroup size="sm">
                    <CInputGroupText>₹</CInputGroupText>
                    <CFormInput
                      type="number"
                      min="0"
                      placeholder="Monthly Cut *"
                      value={form.amount}
                      onChange={(e) => handleMonthlyCutChange(e.target.value, false)}
                      onBlur={handlePreview}
                    />
                  </CInputGroup>
                </CCol>
              </CRow>

              {previewAllocs.length > 0 && (
                <div
                  className="mb-3 p-3 rounded bg-success bg-opacity-10 border border-success"
                  style={{ fontSize: '0.85rem' }}
                >
                  <div className="fw-semibold text-success mb-2">
                    Allocation Preview Across Active Projects
                  </div>
                  <CRow className="g-2">
                    {previewAllocs.map((a) => (
                      <CCol xs={12} md={6} lg={4} key={a.projectId}>
                        <div className="d-flex justify-content-between text-body-secondary bg-body-secondary p-2 rounded border">
                          <span className="fw-medium text-truncate me-2" title={a.projectName}>
                            {a.projectName}
                          </span>
                          <span className="text-nowrap">
                            {a.sharePct}% →{' '}
                            <strong className="text-success">{fmt2(a.amountCharged)}</strong>
                          </span>
                        </div>
                      </CCol>
                    ))}
                  </CRow>
                </div>
              )}

              <div className="d-flex gap-2">
                <CButton size="sm" color="success" onClick={handleAdd}>
                  Add &amp; Distribute Expense
                </CButton>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false)
                    setPreviewAllocs([])
                  }}
                >
                  Cancel
                </CButton>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <CButton size="sm" color="success" onClick={() => setAdding(true)}>
                <CIcon icon={cilPlus} className="me-1" />
                Add New HR Expense
              </CButton>
            </div>
          )}

          {allExpenses.length === 0 ? (
            <div className="text-center text-body-tertiary small py-4 bg-light rounded border border-dashed">
              No HR expenses recorded yet.
            </div>
          ) : (
            <div className="table-responsive">
              <CTable bordered hover align="middle" className="bg-white border text-center">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Sl No</CTableHeaderCell>
                    <CTableHeaderCell>Vendor / Payee</CTableHeaderCell>
                    <CTableHeaderCell>Category / Description</CTableHeaderCell>
                    <CTableHeaderCell>Frequency</CTableHeaderCell>
                    <CTableHeaderCell>Yearly price</CTableHeaderCell>
                    <CTableHeaderCell>Monthly cut</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {allExpenses.map((exp, index) =>
                    editId === exp.id ? (
                      <CTableRow key={exp.id}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            size="sm"
                            value={editForm.vendor}
                            onChange={(e) => setEditForm((f) => ({ ...f, vendor: e.target.value }))}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            size="sm"
                            value={editForm.label}
                            onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormSelect
                            size="sm"
                            value={editForm.frequency}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, frequency: e.target.value }))
                            }
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                            <option value="One-time">One-time</option>
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            size="sm"
                            type="number"
                            value={editForm.yearly_price}
                            onChange={(e) => handleYearlyPriceChange(e.target.value, true)}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            size="sm"
                            type="number"
                            value={editForm.amount}
                            onChange={(e) => handleMonthlyCutChange(e.target.value, true)}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            size="sm"
                            color="primary"
                            variant="ghost"
                            className="me-1"
                            onClick={handleEditSave}
                            title="Save"
                          >
                            <CIcon icon={cilSave} />
                          </CButton>
                          <CButton
                            size="sm"
                            color="secondary"
                            variant="ghost"
                            onClick={() => setEditId(null)}
                            title="Cancel"
                          >
                            <CIcon icon={cilX} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      <CTableRow key={exp.id}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell className="text-start">{exp.vendor || '-'}</CTableDataCell>
                        <CTableDataCell className="text-start">{exp.label}</CTableDataCell>
                        <CTableDataCell>{exp.frequency || 'Monthly'}</CTableDataCell>
                        <CTableDataCell>
                          {exp.yearly_price ? fmt2(exp.yearly_price) : '-'}
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold text-success">
                          {fmt2(exp.amount)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="secondary"
                            variant="ghost"
                            size="sm"
                            className="me-1"
                            title="Edit Expense"
                            onClick={() => {
                              setEditId(exp.id)
                              setEditForm({ ...exp })
                            }}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            title="Remove Expense"
                            onClick={() => handleRemove(exp.id)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ),
                  )}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default GlobalHRPoolPage
