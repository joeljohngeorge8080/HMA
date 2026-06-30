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
  CProgress,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilDollar, cilChartPie } from '@coreui/icons'
import { localOrgPool } from '../../../services/localOrgPool'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const fmtL = (n) => {
  if (!n && n !== 0) return '—'
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)} K`
  return `₹${Math.round(n)}`
}

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : ''

// ─── Project HR Budget Banner ─────────────────────────────────────────────────

const ProjectHRBudgetCard = ({ projectId, projects }) => {
  if (!projectId) return null

  const project = projects.find((p) => p.projectId === projectId)
  const summary = localOrgPool.getProjectHRBudgetSummary(projectId)
  const charges = localOrgPool.getProjectHRCharges(projectId)

  if (!project && !summary?.isActive) {
    return (
      <div className="p-3 rounded border bg-body-secondary text-body-secondary small text-center mb-4">
        This project is not currently active in the HR pool.
      </div>
    )
  }

  const usedPct = summary.poolBudget > 0
    ? Math.min(100, Math.round((summary.totalCharged / summary.poolBudget) * 100))
    : 0

  const isOver = summary.remaining < 0
  const remainingColor = isOver ? 'danger' : usedPct > 85 ? 'warning' : 'success'

  return (
    <CCard
      className="mb-4 shadow-sm border-0"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <CCardBody className="p-4">
        {/* Header row */}
        <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-white-50 small fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.08em' }}>
              HR Pool Budget — Monthly View
            </div>
            <div className="text-white fw-bold fs-5">{project?.projectName || 'Selected Project'}</div>
            <div className="text-white-50 small mt-1">
              Share: <span className="text-white fw-semibold">{summary.sharePct?.toFixed(1) || 0}%</span>
              {' '}of org-wide pool &nbsp;·&nbsp;
              {summary.activeProjectCount} active project{summary.activeProjectCount !== 1 ? 's' : ''}
            </div>
          </div>
          <CBadge
            color={summary.isActive ? 'success' : 'secondary'}
            shape="rounded-pill"
            className="px-3 py-2"
          >
            {summary.isActive ? 'Active in Pool' : 'Inactive'}
          </CBadge>
        </div>

        {/* Three metric cards */}
        <CRow className="g-3 mb-4">
          {[
            {
              label: 'Monthly HR Budget',
              value: fmtL(summary.monthlyBudget),
              sub: `Pool: ${fmtL(summary.poolBudget)} / installment`,
              icon: cilDollar,
              accent: '#4facfe',
            },
            {
              label: 'Amount Used',
              value: fmtL(summary.totalCharged),
              sub: `${charges.length} expense record${charges.length !== 1 ? 's' : ''}`,
              icon: cilChartPie,
              accent: isOver ? '#ff6b6b' : '#ffd166',
            },
            {
              label: 'Remaining',
              value: fmtL(Math.abs(summary.remaining)),
              sub: isOver ? 'Over budget!' : `${100 - usedPct}% remaining`,
              icon: cilDollar,
              accent: isOver ? '#ff6b6b' : '#06d6a0',
              prefix: isOver ? '−' : '',
            },
          ].map((m) => (
            <CCol key={m.label} xs={12} md={4}>
              <div
                className="rounded-3 p-3 h-100"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid rgba(255,255,255,0.1)`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  className="d-flex align-items-center gap-2 mb-2"
                  style={{ color: m.accent }}
                >
                  <CIcon icon={m.icon} size="sm" />
                  <span className="small fw-semibold text-uppercase" style={{ letterSpacing: '0.06em', fontSize: '0.7rem' }}>
                    {m.label}
                  </span>
                </div>
                <div className="fw-bold text-white" style={{ fontSize: '1.6rem', lineHeight: 1.1 }}>
                  {m.prefix || ''}{m.value}
                </div>
                <div className="text-white-50" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  {m.sub}
                </div>
              </div>
            </CCol>
          ))}
        </CRow>

        {/* Progress bar */}
        <div>
          <div className="d-flex justify-content-between text-white-50 small mb-2">
            <span>Budget utilization</span>
            <span className={isOver ? 'text-danger fw-bold' : 'text-white fw-semibold'}>
              {usedPct}% used {isOver && '(Over budget!)'}
            </span>
          </div>
          <div
            className="rounded-pill overflow-hidden"
            style={{ height: 10, background: 'rgba(255,255,255,0.12)' }}
          >
            <div
              className="rounded-pill h-100"
              style={{
                width: `${Math.min(100, usedPct)}%`,
                background: isOver
                  ? '#ff6b6b'
                  : usedPct > 85
                  ? 'linear-gradient(90deg,#ffd166,#ff9f43)'
                  : 'linear-gradient(90deg,#4facfe,#06d6a0)',
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
        </div>

        {/* Breakdown of charges */}
        {charges.length > 0 && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-white-50 small fw-semibold mb-2 text-uppercase" style={{ letterSpacing: '0.06em' }}>
              Allocated Charges
            </div>
            <div className="d-flex flex-column gap-2">
              {charges.map((c) => (
                <div
                  key={c.id}
                  className="d-flex justify-content-between align-items-center"
                  style={{ fontSize: '0.82rem' }}
                >
                  <div>
                    <span className="text-white fw-medium">{c.label}</span>
                    {c.date && (
                      <span className="text-white-50 ms-2">{fmtDate(c.date)}</span>
                    )}
                    <CBadge
                      color="secondary"
                      className="ms-2"
                      style={{ fontSize: '0.65rem', opacity: 0.7 }}
                    >
                      {c.mySharePct?.toFixed(1)}% share
                    </CBadge>
                  </div>
                  <span className="text-white fw-semibold">{fmt(c.myAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const [activeProjects, setActiveProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const reload = () => {
    setAllExpenses(localOrgPool.getHRExpenses())
    const ap = localOrgPool.getActiveProjectMonthlyBudgets('hr')
    setActiveProjects(ap)
    // Auto-select first project if nothing selected
    setSelectedProjectId((prev) => prev || (ap[0]?.projectId ?? ''))
  }

  useEffect(() => {
    reload()
  }, [])

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
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1 fw-bold">Global HR Expense Pool</h4>
          <p className="text-body-secondary mb-0 small">
            Organisation-wide HR expenses distributed across projects.
          </p>
        </div>
      </div>

      {/* ── Project Selector + Budget Banner ─────────────────────────────────── */}
      <CCard className="shadow-sm mb-3 border-0 bg-body-secondary">
        <CCardBody className="py-3 px-4">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <CIcon icon={cilChartPie} className="text-primary" style={{ width: 20, height: 20, flexShrink: 0 }} />
            <div className="fw-semibold text-nowrap">View Project HR Budget:</div>
            <CFormSelect
              size="sm"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ maxWidth: 380, minWidth: 220 }}
            >
              <option value="">— Select a project —</option>
              {activeProjects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectName}
                </option>
              ))}
            </CFormSelect>
            {activeProjects.length === 0 && (
              <span className="text-body-secondary small">No active projects in the HR pool yet.</span>
            )}
          </div>
        </CCardBody>
      </CCard>

      <ProjectHRBudgetCard projectId={selectedProjectId} projects={activeProjects} />

      {/* ── Manage HR Expenses ────────────────────────────────────────────────── */}
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
                          <span className="fw-medium text-truncate me-2" title={a.projectName}>{a.projectName}</span>
                          <span className="text-nowrap">{a.sharePct}% → <strong className="text-success">{fmt(a.amountCharged)}</strong></span>
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
                      <div className="fw-semibold fs-6 mb-1">{exp.label}</div>
                      <div className="text-body-secondary small mb-1">
                        {fmtDate(exp.date)} {exp.notes && ` · ${exp.notes}`}
                      </div>
                      <div className="text-body-tertiary" style={{ fontSize: '0.8rem' }}>
                        Distributed across {exp.allocations?.length || exp.project_allocations?.length || 0} active project(s)
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-4">
                      <div className="text-end">
                        <div className="text-body-secondary small">Total Amount</div>
                        <div className="fw-bold fs-5 text-success">{fmt(exp.amount)}</div>
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
