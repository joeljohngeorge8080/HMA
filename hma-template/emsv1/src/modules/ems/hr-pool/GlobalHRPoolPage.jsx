import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import { localOrgPool } from '../../../services/localOrgPool'

const GlobalHRPoolPage = () => {
  const [form, setForm] = useState({ label: '', amount: '', date: '', notes: '' })
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
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      n || 0,
    )
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

  const handleAdd = () => {
    if (!form.label || !form.amount) return
    localOrgPool.addHRExpense(form, 'global')
    setForm({ label: '', amount: '', date: '', notes: '' })
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
          <p className="text-body-secondary mb-0 small">Organisation-wide HR expenses distributed across projects.</p>
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
                <CCol xs={12} md={5}>
                  <CFormInput
                    size="sm"
                    placeholder="Expense label *"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  />
                </CCol>
                <CCol xs={6} md={3}>
                  <CInputGroup size="sm">
                    <CInputGroupText>₹</CInputGroupText>
                    <CFormInput
                      type="number"
                      min="0"
                      placeholder="0 *"
                      value={form.amount}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, amount: e.target.value }))
                        setPreviewAllocs([])
                      }}
                      onBlur={handlePreview}
                    />
                  </CInputGroup>
                </CCol>
                <CCol xs={6} md={4}>
                  <CFormInput
                    size="sm"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </CCol>
                <CCol xs={12}>
                  <CFormInput
                    size="sm"
                    placeholder="Notes (optional)"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </CCol>
              </CRow>
              
              {previewAllocs.length > 0 && (
                <div
                  className="mb-3 p-3 rounded bg-success bg-opacity-10 border border-success"
                  style={{ fontSize: '0.85rem' }}
                >
                  <div className="fw-semibold text-success mb-2">Allocation Preview Across Active Projects</div>
                  <CRow className="g-2">
                    {previewAllocs.map((a) => (
                      <CCol xs={12} md={6} lg={4} key={a.projectId}>
                        <div className="d-flex justify-content-between text-body-secondary bg-body-secondary p-2 rounded border">
                          <span className="fw-medium text-truncate me-2" title={a.projectName}>{a.projectName}</span>
                          <span className="text-nowrap">{a.sharePct}% → <strong className="text-success">{fmt2(a.amountCharged)}</strong></span>
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
            <div className="d-flex flex-column gap-3">
              {allExpenses.map((exp) =>
                editId === exp.id ? (
                  <div key={exp.id} className="border rounded p-3 bg-body-secondary shadow-sm">
                    <CRow className="g-2 mb-2">
                      <CCol xs={12} md={5}>
                        <CFormInput
                          size="sm"
                          placeholder="Label"
                          value={editForm.label}
                          onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                        />
                      </CCol>
                      <CCol xs={6} md={3}>
                        <CInputGroup size="sm">
                          <CInputGroupText>₹</CInputGroupText>
                          <CFormInput
                            type="number"
                            value={editForm.amount}
                            onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                          />
                        </CInputGroup>
                      </CCol>
                      <CCol xs={6} md={4}>
                        <CFormInput
                          size="sm"
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                        />
                      </CCol>
                    </CRow>
                    <div className="d-flex gap-2 mt-2">
                      <CButton size="sm" color="primary" onClick={handleEditSave}>
                        Save Changes
                      </CButton>
                      <CButton size="sm" color="secondary" variant="ghost" onClick={() => setEditId(null)}>
                        Cancel
                      </CButton>
                    </div>
                  </div>
                ) : (
                  <div
                    key={exp.id}
                    className="d-flex align-items-center justify-content-between border rounded px-3 py-3 shadow-sm"
                  >
                    <div>
                      <div className="fw-semibold fs-6 mb-1">
                        {exp.label}
                      </div>
                      <div className="text-body-secondary small mb-1">
                        {fmtDate(exp.date)} {exp.notes && ` · ${exp.notes}`}
                      </div>
                      <div className="text-body-tertiary" style={{ fontSize: '0.8rem' }}>
                        Distributed across {exp.allocations?.length || 0} active project(s)
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-4">
                      <div className="text-end">
                        <div className="text-body-secondary small">Total Amount</div>
                        <div className="fw-bold fs-5 text-success">{fmt2(exp.amount)}</div>
                      </div>
                      <div className="d-flex gap-1 border-start ps-3">
                        <CButton
                          color="secondary"
                          variant="ghost"
                          size="sm"
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
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default GlobalHRPoolPage
