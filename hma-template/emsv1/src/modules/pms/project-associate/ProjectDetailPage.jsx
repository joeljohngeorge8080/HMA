/**
 * ProjectDetailPage.jsx — Full project detail view for Project Associate.
 * Route: /pms/projects/:id
 */
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CContainer,
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CBadge,
  CProgress,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CToaster,
  CToast,
  CToastBody,
  CToastClose,
  CSpinner,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPen,
  cilArrowLeft,
  cilPeople,
  cilTask,
  cilCheckCircle,
  cilXCircle,
  cilWarning,
  cilEnvelopeLetter,
  cilCalendar,
  cilLocationPin,
  cilBuilding,
  cilDollar,
  cilFolder,
  cilFile,
  cilPlus,
  cilTrash,
  cilPencil,
  cilWallet,
  cilChevronBottom,
  cilChevronTop,
} from '@coreui/icons'
import { CChartDoughnut } from '@coreui/react-chartjs'
import { localProjects } from '../../../services/localProjects'
import { localPayroll } from '../../../services/localPayroll'
import { localOrgPool } from '../../../services/localOrgPool'
import useRole from '../../../hooks/useRole'
import { ROLE } from '../../../constants/roles'

// ─── Budget helpers ────────────────────────────────────────────────────────────
const fmtShort = (n) => {
  if (!n && n !== 0) return '—'
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`
  if (Math.abs(n) >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

const formatMonth = (m) => {
  if (!m) return '—'
  try { const [y, mo] = m.split('-'); return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) } catch { return m }
}

const RECURRING_TYPES = [
  { value: 'electricity', label: '⚡ Electricity' },
  { value: 'water',       label: '💧 Water' },
  { value: 'internet',    label: '🌐 Internet' },
  { value: 'other',       label: '📦 Other' },
]

// ── Expense Card ──────────────────────────────────────────────────────────────
const ExpenseCard = ({ title, color, budget, expenses, isAdmin, projectId, onAdd, onRemove, onEdit }) => {
  const [form, setForm] = useState({ label: '', amount: '', date: '', notes: '', is_recurring: false, recurring_type: 'electricity' })
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const totalUsed = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const remaining = (budget || 0) - totalUsed
  const pct = budget > 0 ? Math.round((totalUsed / budget) * 100) : 0

  const suggestion = useMemo(() => {
    if (!isAdmin || !form.is_recurring || !form.recurring_type) return null
    return localPayroll.suggestRecurringAmount(projectId, form.recurring_type)
  }, [isAdmin, form.is_recurring, form.recurring_type, projectId])

  const handleAdd = () => {
    if (!form.label || !form.amount) return
    onAdd({ ...form, amount: parseFloat(form.amount) })
    setForm({ label: '', amount: '', date: '', notes: '', is_recurring: false, recurring_type: 'electricity' })
    setAdding(false)
  }

  const startEdit = (exp) => { setEditId(exp.id); setEditForm({ ...exp }) }
  const handleEditSave = () => { onEdit(editId, editForm); setEditId(null) }

  const fmtIN = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <CCard className="shadow-sm h-100">
      <CCardHeader className={`bg-transparent fw-semibold pt-3 border-start border-4 border-start-${color}`}>{title}</CCardHeader>
      <CCardBody className="d-flex flex-column">
        <div className="mb-3">
          <div className="d-flex justify-content-between small text-body-secondary mb-1">
            <span>Used: {fmtShort(totalUsed)}</span>
            <span>Budget: {fmtShort(budget)}</span>
          </div>
          <CProgress value={Math.min(pct, 100)} color={pct > 90 ? 'danger' : pct > 70 ? 'warning' : color} height={6} />
          <div className={`small fw-semibold mt-1 ${remaining < 0 ? 'text-danger' : 'text-success'}`}>
            {remaining >= 0 ? `${fmtShort(remaining)} remaining` : `${fmtShort(Math.abs(remaining))} over budget`}
          </div>
        </div>
        {expenses.length === 0 ? (
          <div className="text-center text-body-tertiary small py-3">No expenses added yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2 mb-3">
            {expenses.map((exp) =>
              editId === exp.id ? (
                <div key={exp.id} className="border rounded p-2 bg-body-secondary">
                  <CRow className="g-1 mb-1">
                    <CCol xs={12} md={5}><CFormInput size="sm" placeholder="Label" value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} /></CCol>
                    <CCol xs={6} md={3}><CInputGroup size="sm"><CInputGroupText>₹</CInputGroupText><CFormInput type="number" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} /></CInputGroup></CCol>
                    <CCol xs={6} md={4}><CFormInput size="sm" type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} /></CCol>
                    {isAdmin && (
                      <CCol xs={12}>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <CFormCheck label="Recurring" checked={!!editForm.is_recurring} onChange={(e) => setEditForm((f) => ({ ...f, is_recurring: e.target.checked }))} />
                          {editForm.is_recurring && (
                            <CFormSelect size="sm" value={editForm.recurring_type} onChange={(e) => setEditForm((f) => ({ ...f, recurring_type: e.target.value }))} style={{ maxWidth: 140 }}>
                              {RECURRING_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </CFormSelect>
                          )}
                        </div>
                      </CCol>
                    )}
                  </CRow>
                  <div className="d-flex gap-1">
                    <CButton size="sm" color="primary" onClick={handleEditSave}>Save</CButton>
                    <CButton size="sm" color="secondary" variant="ghost" onClick={() => setEditId(null)}>Cancel</CButton>
                  </div>
                </div>
              ) : (
                <div key={exp.id} className="d-flex align-items-start justify-content-between border rounded px-3 py-2">
                  <div>
                    <div className="fw-semibold small">
                      {exp.label}
                      {exp.is_recurring && <CBadge color="info" className="ms-2" style={{ fontSize: '0.65rem' }}>{RECURRING_TYPES.find((r) => r.value === exp.recurring_type)?.label || 'Recurring'}</CBadge>}
                    </div>
                    <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>{fmtDate(exp.date)}{exp.notes && ` · ${exp.notes}`}</div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold small">{fmtShort(exp.amount)}</span>
                    <CButton color="secondary" variant="ghost" size="sm" onClick={() => startEdit(exp)}><CIcon icon={cilPencil} size="sm" /></CButton>
                    <CButton color="danger" variant="ghost" size="sm" onClick={() => onRemove(exp.id)}><CIcon icon={cilTrash} size="sm" /></CButton>
                  </div>
                </div>
              )
            )}
          </div>
        )}
        {adding ? (
          <div className="border rounded p-2 bg-body-secondary mt-auto">
            <CRow className="g-1 mb-1">
              <CCol xs={12} md={5}><CFormInput size="sm" placeholder="Expense label *" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} /></CCol>
              <CCol xs={6} md={3}><CInputGroup size="sm"><CInputGroupText>₹</CInputGroupText><CFormInput type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></CInputGroup></CCol>
              <CCol xs={6} md={4}><CFormInput size="sm" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></CCol>
              <CCol xs={12}><CFormInput size="sm" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></CCol>
              {isAdmin && (
                <CCol xs={12}>
                  <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                    <CFormCheck label="Recurring / Fixed expense" checked={form.is_recurring} onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))} />
                    {form.is_recurring && (
                      <CFormSelect size="sm" value={form.recurring_type} onChange={(e) => setForm((f) => ({ ...f, recurring_type: e.target.value }))} style={{ maxWidth: 150 }}>
                        {RECURRING_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </CFormSelect>
                    )}
                  </div>
                  {form.is_recurring && suggestion?.suggested && (
                    <div className="small text-info mt-1 d-flex align-items-center gap-2">
                      💡 Previous: ₹{suggestion.prevAmount?.toLocaleString('en-IN')} → Suggested: ₹{suggestion.suggested?.toLocaleString('en-IN')} (+5%)
                      <CButton size="sm" color="info" variant="ghost" style={{ padding: '0 6px' }} onClick={() => setForm((f) => ({ ...f, amount: String(suggestion.suggested) }))}>Use</CButton>
                    </div>
                  )}
                </CCol>
              )}
            </CRow>
            <div className="d-flex gap-1 mt-1">
              <CButton size="sm" color="primary" onClick={handleAdd}>Add</CButton>
              <CButton size="sm" color="secondary" variant="ghost" onClick={() => setAdding(false)}>Cancel</CButton>
            </div>
          </div>
        ) : (
          <CButton size="sm" color={color} variant="outline" className="mt-auto" onClick={() => setAdding(true)}>
            <CIcon icon={cilPlus} className="me-1" />Add Expense
          </CButton>
        )}
      </CCardBody>
    </CCard>
  )
}


const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const getDelayDays = (targetDateStr, actualDateStr) => {
  if (!targetDateStr) return 0
  const [ty, tm, td] = targetDateStr.split('-').map(Number)
  const target = new Date(ty, tm - 1, td)
  
  let actual
  if (actualDateStr) {
    const [ay, am, ad] = actualDateStr.split('-').map(Number)
    actual = new Date(ay, am - 1, ad)
  } else {
    actual = new Date()
  }
  
  target.setHours(0, 0, 0, 0)
  actual.setHours(0, 0, 0, 0)
  
  const diffTime = actual.getTime() - target.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

const STATUS_META = {
  pipeline: { label: 'Pipeline', color: 'secondary' },
  approved: { label: 'Approved', color: 'info' },
  ongoing: { label: 'Ongoing', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
}

// Demo pending approval items
const DEMO_APPROVALS = [
  {
    id: 'apr_1',
    type: 'Procurement',
    title: 'Purchase of 50 PVC pipes — 6 inch',
    submittedBy: 'Arjun Sharma',
    submittedAt: '2024-12-10',
    amount: 48500,
    status: 'pending',
  },
  {
    id: 'apr_2',
    type: 'Task Expense',
    title: 'Labour charges — Pipeline excavation (Week 2)',
    submittedBy: 'Arjun Sharma',
    submittedAt: '2024-12-08',
    amount: 32000,
    status: 'pending',
  },
]

const DEMO_TASKS = [
  { title: 'Site survey & soil testing', status: 'completed', assignee: 'Field Team A', target_date: '2024-04-01', actual_date: '2024-04-05' },
  { title: 'Pipeline route mapping', status: 'completed', assignee: 'Arjun Sharma', target_date: '2024-04-15', actual_date: '2024-04-12' },
  { title: 'Procurement of pipes & fittings', status: 'completed', assignee: 'Procurement Team', target_date: '2024-05-10', actual_date: '2024-05-10' },
  { title: 'Excavation — Phase 1 (Villages 1–4)', status: 'completed', assignee: 'Field Team A', target_date: '2024-06-01', actual_date: '2024-06-15' },
  { title: 'Excavation — Phase 2 (Villages 5–8)', status: 'completed', assignee: 'Field Team B', target_date: '2024-07-15', actual_date: '2024-07-10' },
  { title: 'Pipeline laying — Phase 1', status: 'active', assignee: 'Field Team A', target_date: '2024-09-01', actual_date: null },
  { title: 'Storage tank construction', status: 'active', assignee: 'Civil Contractor', target_date: '2024-10-01', actual_date: null },
  { title: 'Final commissioning & testing', status: 'active', assignee: 'Arjun Sharma', target_date: '2025-01-15', actual_date: null },
]

const ProjectDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const [approvals, setApprovals] = useState([])
  const [approveModal, setApproveModal] = useState({ visible: false, item: null })
  const [rejectModal, setRejectModal] = useState({ visible: false, item: null })
  const [ucModal, setUcModal] = useState({ visible: false, milestone: null })
  const [toast, setToast] = useState(null)
  // Budget & Payroll state
  const [actualDateEditing, setActualDateEditing] = useState(null)
  const [actualDateVal, setActualDateVal] = useState('')
  // Beneficiaries state
  const [beneficiariesCompleted, setBeneficiariesCompleted] = useState('')

  const role = useRole()
  const isBudgetAdmin = role === ROLE.CEO || role === ROLE.FINANCE || role === ROLE.HR

  useEffect(() => {
    localProjects.seedDemoData()
    const p = localProjects.getById(id)
    setProject(p)
    if (p) {
      setBeneficiariesCompleted(p.beneficiaries_completed || 0)
    }
    // Load approvals only for projects that have pending ones
    if (p && p.pending_approvals > 0) {
      setApprovals(DEMO_APPROVALS)
    }
  }, [id])

  if (!project) {
    return (
      <CContainer lg className="py-4 text-center">
        <div style={{ fontSize: '4rem' }}>🔍</div>
        <h5 className="text-body-secondary">Project not found</h5>
        <CButton color="primary" variant="outline" onClick={() => navigate('/pms/projects')}>
          Back to Projects
        </CButton>
      </CContainer>
    )
  }

  const progressPct =
    project.tasks_count > 0
      ? Math.round((project.tasks_completed / project.tasks_count) * 100)
      : 0
  const receivedPct =
    project.project_value > 0
      ? Math.round((project.amount_received / project.project_value) * 100)
      : 0
  const sm = STATUS_META[project.status] || { label: project.status, color: 'secondary' }

  const handleApprove = (item) => {
    setApprovals((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: 'approved' } : a)))
    setApproveModal({ visible: false, item: null })
    setToast({ color: 'success', message: '✅ Approval granted successfully' })
  }

  const handleReject = (item) => {
    setApprovals((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: 'rejected' } : a)))
    setRejectModal({ visible: false, item: null })
    setToast({ color: 'danger', message: '⚠️ Request rejected and sent back' })
  }

  const handleSubmitUc = (inst) => {
    const actualDate = new Date().toISOString().split('T')[0]
    const updated = localProjects.updateInstallment(project.id, inst.id, {
      uc_status: 'Submitted',
      actual_date: actualDate,
    })
    setProject(updated)
    setUcModal({ visible: false, milestone: null })
    setToast({ color: 'success', message: '✅ Utilisation Certificate submitted successfully' })
  }

  const handleActivateProject = () => {
    const updated = localProjects.activateProject(project.id)
    setProject(updated)
    setToast({ color: 'success', message: '🟢 Project operations activated! HR & Core pool contributions are now live.' })
  }

  const handleUpdateBeneficiaries = () => {
    const val = parseInt(beneficiariesCompleted, 10) || 0
    const updated = localProjects.update(project.id, { beneficiaries_completed: val })
    setProject(updated)
    setToast({ color: 'success', message: '✅ Beneficiaries completed count updated!' })
  }

  return (
    <CContainer lg className="py-4">
      {/* Back */}
      <CButton
        color="secondary"
        variant="ghost"
        size="sm"
        className="mb-3"
        onClick={() => navigate('/pms/projects')}
      >
        <CIcon icon={cilArrowLeft} className="me-1" />
        All Projects
      </CButton>

      {/* Hero banner */}
      <div
        className="rounded-4 mb-4 p-4 text-white position-relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)' }}
      >
        <div className="position-absolute end-0 top-0 opacity-10" style={{ fontSize: '8rem', lineHeight: 1 }}>
          🏗️
        </div>
        <div className="position-relative d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="d-flex align-items-center gap-2 mb-1">
              <CBadge color={sm.color} shape="rounded-pill" className="px-2">
                {sm.label}
              </CBadge>
              <CBadge color="light" className="text-dark px-2 text-capitalize">
                {project.phase}
              </CBadge>
            </div>
            <h4 className="fw-bold mb-2">{project.name}</h4>
            <div className="d-flex flex-wrap gap-3 opacity-75 small">
              <span><CIcon icon={cilLocationPin} className="me-1" />{project.location}</span>
              <span><CIcon icon={cilBuilding} className="me-1" />{project.funding_agency}</span>
              <span>
                <CIcon icon={cilCalendar} className="me-1" />
                {fmtDate(project.start_date)} → {fmtDate(project.end_date)}
              </span>
            </div>
          </div>
          <CButton
            color="light"
            className="text-primary fw-semibold flex-shrink-0"
            onClick={() => navigate(`/pms/projects/${id}/edit`)}
          >
            <CIcon icon={cilPen} className="me-1" />
            Edit Project
          </CButton>
          {!project.is_operations_active && (
            <CButton
              color="success"
              className="fw-semibold flex-shrink-0"
              onClick={handleActivateProject}
            >
              ▶ Activate Project
            </CButton>
          )}
          {project.is_operations_active && (
            <CBadge color="success" className="px-3 py-2 d-flex align-items-center" style={{ fontSize: '0.8rem' }}>🟢 Operations Active</CBadge>
          )}
        </div>
      </div>

      {/* KPI row */}
      <CRow className="g-3 mb-4">
        {/* Left Column */}
        <CCol xs={12} md={6}>
          <div className="d-flex flex-column gap-3 h-100">
            {[
              {
                label: 'Project Value',
                value: fmt(project.project_value),
                sub: 'Total sanctioned',
                color: '#4361ee',
                bg: 'rgba(67,97,238,0.06)',
              },
              {
                label: 'Task Progress',
                value: `${progressPct}%`,
                sub: `${project.tasks_completed}/${project.tasks_count} tasks done`,
                color: '#06d6a0',
                bg: 'rgba(6,214,160,0.06)',
              },
              {
                label: 'Beneficiaries Reached',
                value: `${project.beneficiaries_completed?.toLocaleString('en-IN') || 0} / ${project.beneficiaries_target?.toLocaleString('en-IN') || 0}`,
                sub: 'Completed vs Target',
                color: '#f72585',
                bg: 'rgba(247,37,133,0.06)',
                isBeneficiaries: true,
              },
            ].map((kpi, i) => (
              <CCard key={i} className="border-0 shadow-sm flex-grow-1" style={{ borderRadius: '12px' }}>
                <CCardBody className="py-3">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="fw-bold fs-5 lh-1 mb-1" style={{ color: kpi.color }}>
                      {kpi.value}
                    </div>
                  </div>
                  <div className="fw-semibold small text-body">{kpi.label}</div>
                  <div className="text-body-secondary mb-2" style={{ fontSize: '0.72rem' }}>
                    {kpi.sub}
                  </div>
                  {kpi.isBeneficiaries && (
                    <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                      <CFormInput type="number" size="sm" style={{ width: '90px', fontSize: '0.75rem' }} 
                        value={beneficiariesCompleted} 
                        onChange={(e) => setBeneficiariesCompleted(e.target.value)} 
                        placeholder="Completed"
                      />
                      <CButton size="sm" color="danger" variant="outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={handleUpdateBeneficiaries}>Save</CButton>
                    </div>
                  )}
                  {kpi.label === 'Task Progress' && (
                    <CProgress value={progressPct} height={4} color="success" className="mt-2 rounded-pill" />
                  )}
                </CCardBody>
              </CCard>
            ))}
          </div>
        </CCol>

        {/* Right Column */}
        <CCol xs={12} md={6}>
          <div className="d-flex flex-column gap-3 h-100">
            {[
              {
                label: 'Amount Received',
                value: fmt(project.amount_received),
                sub: `${receivedPct}% of total`,
                color: '#2ec4b6',
                bg: 'rgba(46,196,182,0.06)',
              },
              {
                label: 'Amount Spent',
                value: fmt(project.amount_spent),
                sub: `Balance: ${fmt(project.amount_received - project.amount_spent)}`,
                color: '#f77f00',
                bg: 'rgba(247,127,0,0.06)',
              },
            ].map((kpi, i) => (
              <CCard key={i} className="border-0 shadow-sm flex-grow-1" style={{ borderRadius: '12px' }}>
                <CCardBody className="py-3">
                  <div className="fw-bold fs-5 lh-1 mb-1" style={{ color: kpi.color }}>
                    {kpi.value}
                  </div>
                  <div className="fw-semibold small text-body">{kpi.label}</div>
                  <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                    {kpi.sub}
                  </div>
                </CCardBody>
              </CCard>
            ))}
          </div>
        </CCol>
      </CRow>

      <CCard className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <CCardHeader className="bg-transparent border-bottom-0 px-4 pt-3">
          <CNav variant="underline" role="tablist">
            {['Overview', 'Project Officer', 'Tasks & Procurement', 'Approvals', 'Project Financials', 'Project Milestones', 'Budget & Payroll'].map((tab, i) => (
              <CNavItem key={i}>
                <CNavLink
                  active={activeTab === i}
                  onClick={() => setActiveTab(i)}
                  role="button"
                  className="fw-medium"
                >
                  {tab}
                  {i === 3 && approvals.filter((a) => a.status === 'pending').length > 0 && (
                    <CBadge color="danger" shape="rounded-pill" className="ms-2">
                      {approvals.filter((a) => a.status === 'pending').length}
                    </CBadge>
                  )}
                  {i === 4 && (
                    <CBadge
                      color={
                        (project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)) >= 0
                          ? 'success'
                          : 'danger'
                      }
                      shape="rounded-pill"
                      className="ms-2"
                    >
                      {(() => {
                        const bal = project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)
                        return bal >= 0 ? '✓' : '!'
                      })()}
                    </CBadge>
                  )}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>
        </CCardHeader>

        <CCardBody className="bg-body-tertiary rounded-bottom-4 pt-4">
          <CTabContent>
            {/* Overview Tab */}
            <CTabPane visible={activeTab === 0}>
              <CRow className="g-3">
                <CCol xs={12} md={6}>
                  <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: '10px' }}>
                    <CCardBody>
                      <h6 className="fw-bold mb-3 text-body-secondary text-uppercase small">Project Info</h6>
                      {[
                        { label: 'Project Code', value: project.project_code },
                        { label: 'Project Type', value: project.project_type },
                        { label: 'Funding Agency', value: project.funding_agency },
                        { label: 'Implementing Partner', value: project.implementing_partner },
                        { label: 'Location', value: project.location },
                        { label: 'Start Date', value: fmtDate(project.start_date) },
                        { label: 'End Date', value: fmtDate(project.end_date) },
                        { label: 'Last Updated', value: fmtDate(project.updated_at) },
                      ].map((row, i) => (
                        <div key={i} className="d-flex justify-content-between py-2 border-bottom small">
                          <span className="text-body-secondary">{row.label}</span>
                          <span className="fw-medium">{row.value || '—'}</span>
                        </div>
                      ))}
                    </CCardBody>
                  </CCard>
                </CCol>
                <CCol xs={12} md={6}>
                  <CCard className="border-0 shadow-sm" style={{ borderRadius: '10px' }}>
                    <CCardBody>
                      <h6 className="fw-bold mb-3 text-body-secondary text-uppercase small">Fund Utilization</h6>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1 small">
                          <span className="text-body-secondary">Received</span>
                          <span className="fw-semibold">{receivedPct}%</span>
                        </div>
                        <CProgress value={receivedPct} height={8} color="success" className="rounded-pill" />
                      </div>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1 small">
                          <span className="text-body-secondary">Spent</span>
                          <span className="fw-semibold">
                            {project.amount_received > 0
                              ? Math.round((project.amount_spent / project.amount_received) * 100)
                              : 0}%
                          </span>
                        </div>
                        <CProgress
                          value={
                            project.amount_received > 0
                              ? Math.round((project.amount_spent / project.amount_received) * 100)
                              : 0
                          }
                          height={8}
                          color="primary"
                          className="rounded-pill"
                        />
                      </div>
                      {project.description && (
                        <>
                          <hr />
                          <h6 className="fw-semibold small mb-2">Description</h6>
                          <p className="text-body-secondary small mb-0">{project.description}</p>
                        </>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>
            </CTabPane>

            {/* Project Officer Tab */}
            <CTabPane visible={activeTab === 1}>
              {project.officer_id ? (
                <CCard className="border-0 shadow-sm" style={{ borderRadius: '10px', maxWidth: '500px' }}>
                  <CCardBody>
                    <div className="d-flex align-items-center gap-3 mb-4">
                      <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-4"
                        style={{ width: 64, height: 64, flexShrink: 0 }}
                      >
                        {project.officer_name?.charAt(0)}
                      </div>
                      <div>
                        <h5 className="fw-bold mb-0">{project.officer_name}</h5>
                        <div className="text-body-secondary small">Project Officer</div>
                      </div>
                    </div>
                    {[
                      { icon: cilEnvelopeLetter, label: project.officer_email },
                    ].map((row, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 mb-2 small">
                        <CIcon icon={row.icon} className="text-primary" />
                        <span>{row.label}</span>
                      </div>
                    ))}
                    {project.email_sent && (
                      <CAlert color="success" className="mt-3 py-2 px-3 d-flex align-items-center gap-2 small mb-0">
                        <CIcon icon={cilEnvelopeLetter} />
                        <div>Access email sent via <strong>AWS SES</strong></div>
                      </CAlert>
                    )}
                    <div className="mt-3">
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/pms/projects/${id}/edit`)}
                      >
                        <CIcon icon={cilPeople} className="me-1" />
                        Reassign Officer
                      </CButton>
                    </div>
                  </CCardBody>
                </CCard>
              ) : (
                <CAlert color="warning" className="d-flex align-items-center gap-2">
                  <CIcon icon={cilWarning} />
                  No officer assigned. &nbsp;
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(`/pms/projects/${id}/edit`)
                    }}
                    className="fw-semibold"
                  >
                    Assign one now →
                  </a>
                </CAlert>
              )}
            </CTabPane>

            {/* Tasks & Procurement Tab */}
            <CTabPane visible={activeTab === 2}>
              <CRow className="g-4">
                <CCol xs={12} lg={4}>
                  <CCard className="border-0 shadow-sm bg-body-tertiary h-100" style={{ borderRadius: '12px' }}>
                    <CCardBody className="text-center p-4">
                      <h6 className="fw-bold mb-4 small text-uppercase text-body-secondary">Schedule Status</h6>
                      {(() => {
                        const today = new Date().toISOString().split('T')[0]
                        const tasksStats = DEMO_TASKS.map(t => {
                          const isDelayed = t.status === 'completed' 
                            ? (t.actual_date > t.target_date) 
                            : (today > t.target_date)
                          return { ...t, isDelayed }
                        })
                        const delayedCount = tasksStats.filter(t => t.isDelayed).length
                        const onTrackCount = tasksStats.length - delayedCount

                        return (
                          <div style={{ maxWidth: '220px', margin: '0 auto' }}>
                            <CChartDoughnut
                              data={{
                                labels: ['On Track', 'Delayed'],
                                datasets: [
                                  {
                                    backgroundColor: ['#06d6a0', '#e74c3c'],
                                    data: [onTrackCount, delayedCount],
                                    borderWidth: 0,
                                  },
                                ],
                              }}
                              options={{
                                plugins: {
                                  legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } }
                                },
                                cutout: '75%',
                              }}
                            />
                            <div className="mt-3 small text-body-secondary">
                              <strong>{delayedCount}</strong> out of {tasksStats.length} tasks are experiencing delays.
                            </div>
                          </div>
                        )
                      })()}
                    </CCardBody>
                  </CCard>
                </CCol>
                <CCol xs={12} lg={8}>
                  <h6 className="fw-semibold mb-3">Tasks List</h6>
                  <div className="d-flex flex-column gap-2">
                    {DEMO_TASKS.map((task, i) => {
                      const today = new Date().toISOString().split('T')[0]
                      const isDelayed = task.status === 'completed' 
                        ? (task.actual_date > task.target_date) 
                        : (today > task.target_date)
                      return (
                        <div
                          key={i}
                          className="d-flex align-items-center gap-3 p-3 bg-white rounded-3 border shadow-sm"
                          style={{ fontSize: '0.875rem' }}
                        >
                          <div
                            className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`}
                            style={{
                              width: 32,
                              height: 32,
                              background: task.status === 'completed' ? '#06d6a020' : '#f0ad4e20',
                            }}
                          >
                            <CIcon
                              icon={task.status === 'completed' ? cilCheckCircle : cilTask}
                              style={{
                                color: task.status === 'completed' ? '#06d6a0' : '#f0ad4e',
                                width: 16,
                                height: 16,
                              }}
                            />
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="fw-bold" style={{ fontSize: '0.95rem' }}>{task.title}</span>
                              {isDelayed && (
                                <CBadge color="danger" shape="rounded-pill" className="small" style={{ fontSize: '0.65rem' }}>Delayed</CBadge>
                              )}
                            </div>
                            <CRow className="g-2 text-body-secondary mt-1" style={{ fontSize: '0.75rem' }}>
                              <CCol xs={12} sm={4}>
                                <CIcon icon={cilPeople} className="me-1 opacity-75" />
                                {task.assignee}
                              </CCol>
                              <CCol xs={6} sm={4}>
                                Target: <span className="fw-medium text-body">{fmtDate(task.target_date)}</span>
                              </CCol>
                              <CCol xs={6} sm={4}>
                                Actual: <span className="fw-medium text-body">{task.actual_date ? fmtDate(task.actual_date) : '—'}</span>
                              </CCol>
                            </CRow>
                          </div>
                          <CBadge
                            color={task.status === 'completed' ? 'success' : 'warning'}
                            shape="rounded-pill"
                            className="text-capitalize"
                          >
                            {task.status}
                          </CBadge>
                        </div>
                      )
                    })}
                  </div>
                </CCol>
              </CRow>
            </CTabPane>

            {/* Approvals Tab */}
            <CTabPane visible={activeTab === 3}>
              {approvals.length === 0 ? (
                <div className="text-center py-5 text-body-secondary">
                  <div style={{ fontSize: '3rem' }}>✅</div>
                  <h6>No pending approvals</h6>
                  <p className="small">All submissions are reviewed</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {approvals.map((item) => (
                    <CCard
                      key={item.id}
                      className="border-0 shadow-sm"
                      style={{
                        borderRadius: '10px',
                        borderLeft: `4px solid ${item.status === 'pending' ? '#f77f00' : item.status === 'approved' ? '#06d6a0' : '#e74c3c'}`,
                      }}
                    >
                      <CCardBody>
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <CBadge color="info" shape="rounded-pill" className="small">
                                {item.type}
                              </CBadge>
                              <CBadge
                                color={
                                  item.status === 'pending'
                                    ? 'warning'
                                    : item.status === 'approved'
                                    ? 'success'
                                    : 'danger'
                                }
                                shape="rounded-pill"
                                className="small text-capitalize"
                              >
                                {item.status}
                              </CBadge>
                            </div>
                            <h6 className="fw-semibold mb-1">{item.title}</h6>
                            <div className="text-body-secondary small">
                              Submitted by {item.submittedBy} · {item.submittedAt}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="fw-bold fs-5 text-primary">{fmt(item.amount)}</div>
                            {item.status === 'pending' && (
                              <div className="d-flex gap-2 mt-2">
                                <CButton
                                  color="success"
                                  size="sm"
                                  onClick={() => setApproveModal({ visible: true, item })}
                                >
                                  <CIcon icon={cilCheckCircle} className="me-1" />
                                  Approve
                                </CButton>
                                <CButton
                                  color="danger"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRejectModal({ visible: true, item })}
                                >
                                  <CIcon icon={cilXCircle} className="me-1" />
                                  Reject
                                </CButton>
                              </div>
                            )}
                          </div>
                        </div>
                      </CCardBody>
                    </CCard>
                  ))}
                </div>
              )}
            </CTabPane>

            {/* Project Financials Tab */}
            <CTabPane visible={activeTab === 4}>
              {/* 4 KPI tiles */}
              <CRow className="g-3 mb-4">
                {[
                  {
                    label: 'Project Value',
                    value: fmt(project.project_value),
                    sub: 'Total sanctioned amount',
                    color: '#4361ee',
                    bg: 'rgba(67,97,238,0.07)',
                    icon: '📋',
                  },
                  {
                    label: 'Expense Accounted',
                    value: fmt(project.expense_accounted),
                    sub: `${project.project_value > 0 ? Math.round(((project.expense_accounted || 0) / project.project_value) * 100) : 0}% of project value`,
                    color: '#f77f00',
                    bg: 'rgba(247,127,0,0.07)',
                    icon: '📤',
                  },
                  {
                    label: 'Committed Expense',
                    value: fmt(project.committed_expense),
                    sub: 'Approved but not yet paid',
                    color: '#7209b7',
                    bg: 'rgba(114,9,183,0.07)',
                    icon: '🔒',
                  },
                  (() => {
                    const bal = project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)
                    return {
                      label: 'Fund Balance',
                      value: fmt(bal),
                      sub: 'Available after committed expenses',
                      color: bal >= 0 ? '#06d6a0' : '#e74c3c',
                      bg: bal >= 0 ? 'rgba(6,214,160,0.07)' : 'rgba(231,76,60,0.07)',
                      icon: bal >= 0 ? '✅' : '⚠️',
                    }
                  })(),
                ].map((kpi, i) => (
                  <CCol key={i} xs={12} sm={6} xl={3}>
                    <div
                      className="rounded-3 p-4 h-100"
                      style={{ background: kpi.bg, border: `1.5px solid ${kpi.color}22` }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <span style={{ fontSize: '1.25rem' }}>{kpi.icon}</span>
                        <span className="small fw-semibold text-body-secondary">{kpi.label}</span>
                      </div>
                      <div className="fw-bold lh-1 mb-2" style={{ color: kpi.color, fontSize: '1.35rem' }}>
                        {kpi.value}
                      </div>
                      <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                        {kpi.sub}
                      </div>
                    </div>
                  </CCol>
                ))}
              </CRow>

              {/* Utilisation breakdown card */}
              <CCard className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <CCardBody className="px-4 py-3">
                  <h6 className="fw-semibold mb-3 small text-uppercase text-body-secondary">Utilisation Breakdown</h6>
                  <CRow className="g-4">
                    <CCol xs={12} md={4}>
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-body-secondary">Expense Accounted</span>
                        <span className="fw-semibold">
                          {project.project_value > 0 ? Math.round(((project.expense_accounted || 0) / project.project_value) * 100) : 0}%
                        </span>
                      </div>
                      <CProgress
                        value={project.project_value > 0 ? Math.round(((project.expense_accounted || 0) / project.project_value) * 100) : 0}
                        height={10}
                        color="warning"
                        className="rounded-pill"
                      />
                      <div className="text-body-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                        {fmt(project.expense_accounted)} of {fmt(project.project_value)}
                      </div>
                    </CCol>
                    <CCol xs={12} md={4}>
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-body-secondary">Committed Expense</span>
                        <span className="fw-semibold">
                          {project.project_value > 0 ? Math.round(((project.committed_expense || 0) / project.project_value) * 100) : 0}%
                        </span>
                      </div>
                      <CProgress
                        value={project.project_value > 0 ? Math.round(((project.committed_expense || 0) / project.project_value) * 100) : 0}
                        height={10}
                        color="info"
                        className="rounded-pill"
                      />
                      <div className="text-body-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                        {fmt(project.committed_expense)} of {fmt(project.project_value)}
                      </div>
                    </CCol>
                    <CCol xs={12} md={4}>
                      {(() => {
                        const bal = project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)
                        const balPct = project.project_value > 0 ? Math.round((bal / project.project_value) * 100) : 0
                        return (
                          <>
                            <div className="d-flex justify-content-between mb-1 small">
                              <span className="text-body-secondary">Fund Balance</span>
                              <span className="fw-semibold" style={{ color: bal >= 0 ? '#06d6a0' : '#e74c3c' }}>
                                {balPct}%
                              </span>
                            </div>
                            <CProgress
                              value={Math.abs(balPct)}
                              height={10}
                              color={bal >= 0 ? 'success' : 'danger'}
                              className="rounded-pill"
                            />
                            <div className="text-body-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                              {fmt(bal)} remaining
                            </div>
                          </>
                        )
                      })()}
                    </CCol>
                  </CRow>

                  {/* Summary totals */}
                  <hr className="mt-4 mb-3" />
                  <CRow className="g-2 text-center">
                    {[
                      { label: 'Total Sanctioned', value: fmt(project.project_value), color: '#4361ee' },
                      { label: 'Total Utilised', value: fmt((project.expense_accounted || 0) + (project.committed_expense || 0)), color: '#f77f00' },
                      { label: 'Available Balance', value: fmt(project.project_value - (project.expense_accounted || 0) - (project.committed_expense || 0)), color: '#06d6a0' },
                    ].map((item, i) => (
                      <CCol key={i} xs={12} md={4}>
                        <div className="py-2 px-3 rounded-3" style={{ background: 'var(--cui-body-bg)' }}>
                          <div className="fw-bold" style={{ color: item.color, fontSize: '1.1rem' }}>{item.value}</div>
                          <div className="text-body-secondary small">{item.label}</div>
                        </div>
                      </CCol>
                    ))}
                  </CRow>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Project Milestones Tab */}
            <CTabPane visible={activeTab === 5}>
              <CRow className="g-4">
                {/* Milestones & UC Tracking */}
                <CCol xs={12} lg={8}>
                  <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                    <CCardBody className="p-4">
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <h6 className="fw-bold mb-0 text-uppercase text-body-secondary small">Fund Installments & UCs</h6>
                      </div>
                      
                      {project.installments && project.installments.length > 0 ? (
                        <div className="position-relative">
                          {/* Vertical timeline line */}
                          <div
                            className="position-absolute bg-secondary opacity-25"
                            style={{ left: '16px', top: '10px', bottom: '10px', width: '2px' }}
                          ></div>
                          
                          <div className="d-flex flex-column gap-4">
                            {project.installments.map((inst, i) => (
                              <div key={inst.id} className="d-flex position-relative">
                                {/* Timeline Dot */}
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 z-1"
                                  style={{
                                    width: 34,
                                    height: 34,
                                    background: inst.uc_status === 'Approved' ? '#06d6a0' : inst.uc_status === 'Submitted' ? '#4361ee' : '#fff',
                                    border: `2px solid ${inst.uc_status === 'Approved' ? '#06d6a0' : inst.uc_status === 'Submitted' ? '#4361ee' : '#dee2e6'}`,
                                    color: inst.uc_status === 'Pending' ? '#adb5bd' : '#fff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  {inst.uc_status === 'Approved' ? '✓' : i + 1}
                                </div>
                                
                                {/* Content Card */}
                                <div className="ms-4 flex-grow-1">
                                  <div className="p-3 rounded-3 border bg-white shadow-sm">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <div>
                                        <h6 className="fw-bold mb-1">{inst.label} <span className="text-body-secondary fw-normal small">({inst.percentage}%)</span></h6>
                                        <div className="text-primary fw-bold fs-5">{fmt(inst.amount)}</div>
                                      </div>
                                      <CBadge
                                        color={inst.uc_status === 'Approved' ? 'success' : inst.uc_status === 'Submitted' ? 'primary' : 'warning'}
                                        shape="rounded-pill"
                                      >
                                        UC: {inst.uc_status || 'Pending'}
                                      </CBadge>
                                    </div>
                                    
                                    <CRow className="g-2 small text-body-secondary mt-2">
                                      <CCol xs={4}>
                                        <div><CIcon icon={cilFolder} className="me-1" /> Target Date</div>
                                        <div className="fw-medium text-body">{fmtDate(inst.target_date)}</div>
                                      </CCol>
                                      <CCol xs={4}>
                                        <div><CIcon icon={cilFolder} className="me-1" /> Actual Date</div>
                                        <div className="fw-medium text-body">{inst.actual_date ? fmtDate(inst.actual_date) : '—'}</div>
                                      </CCol>
                                      <CCol xs={4}>
                                        <div><CIcon icon={cilWarning} className="me-1" /> Delay</div>
                                        {(() => {
                                          const delay = getDelayDays(inst.target_date, inst.actual_date)
                                          return (
                                            <div className={`fw-semibold ${delay > 0 ? 'text-danger' : 'text-success'}`}>
                                              {delay > 0 ? `${delay} days` : 'No delay'}
                                            </div>
                                          )
                                        })()}
                                      </CCol>
                                    </CRow>
                                    
                                    {(inst.uc_status === 'Pending' || !inst.uc_status) && (
                                      <div className="mt-3 pt-3 border-top text-end">
                                        <CButton color="primary" size="sm" onClick={() => setUcModal({ visible: true, milestone: inst })}>
                                          <CIcon icon={cilFile} className="me-1" />
                                          Submit UC
                                        </CButton>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-5 text-body-secondary">
                          No installments configured for this project.
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
                
                {/* Project Risks */}
                <CCol xs={12} lg={4}>
                  <CCard className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                    <CCardBody className="p-4">
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <h6 className="fw-bold mb-0 text-uppercase text-body-secondary small">Project Risks</h6>
                        <CButton color="secondary" variant="ghost" size="sm">
                          Add Risk
                        </CButton>
                      </div>
                      
                      {project.risks && project.risks.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                          {project.risks.map((risk) => (
                            <div key={risk.id} className="p-3 rounded-3 border bg-body-tertiary">
                              <div className="d-flex justify-content-between mb-2">
                                <CBadge
                                  color={risk.severity === 'High' ? 'danger' : risk.severity === 'Medium' ? 'warning' : 'info'}
                                  shape="rounded-pill"
                                >
                                  {risk.severity} Risk
                                </CBadge>
                                <span className="small text-body-secondary">{risk.status}</span>
                              </div>
                              <div className="fw-medium text-body small">
                                {risk.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-body-secondary small bg-body-tertiary rounded-3 border">
                          No active risks logged.
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>
            </CTabPane>

            {/* ══ TAB 6: Budget & Payroll ════════════════════════════════════ */}
            <CTabPane visible={activeTab === 6}>
              {/* Budget & Payroll helpers inline — uses project.installments */}
              {(() => {
                const installments = project.installments || []

                const saveActualDate = (instId) => {
                  const updated = localProjects.updateInstallment(project.id, instId, { actual_date: actualDateVal || null })
                  setProject(updated)
                  setActualDateEditing(null)
                  setToast({ color: 'success', message: 'Actual date updated.' })
                }

                const updateProjectPct = (field, val) => {
                  const updated = localProjects.update(project.id, { [field]: parseFloat(val) || 0 })
                  setProject(updated)
                }

                const handleAddExpense = (pool, expense) => {
                  const updated = localProjects.addExpense(project.id, pool, expense)
                  setProject(updated)
                  setToast({ color: 'success', message: `${pool.toUpperCase()} expense added.` })
                }

                const handleRemoveExpense = (pool, expId) => {
                  const updated = localProjects.removeExpense(project.id, pool, expId)
                  setProject(updated)
                }

                const handleEditExpense = (pool, expId, data) => {
                  const updated = localProjects.updateExpense(project.id, pool, expId, data)
                  setProject(updated)
                }

                const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
                const UC_COLORS = { Pending: 'secondary', Submitted: 'warning', Approved: 'success' }

                return (
                  <div>
                    {/* Admin Budget Section */}
                    <CCard className="shadow-sm mb-4 border-top border-top-4 border-top-primary">
                      <CCardHeader className="bg-transparent fw-semibold pt-3 d-flex justify-content-between align-items-center">
                        <span>🌐 Admin Budget</span>
                        <div className="d-flex gap-3 flex-wrap">
                          {[{ key: 'admin_pct', color: '#f7c948', label: 'Admin' }].map(({ key, color, label }) => (
                            <div key={key} className="d-flex align-items-center gap-2">
                              <span className="small fw-semibold" style={{ color }}>{label}</span>
                              <span className="fw-semibold text-body-secondary border rounded bg-body-tertiary d-inline-block text-center" style={{ width: 65, padding: '2px 6px', fontSize: '0.8rem' }}>{project[key] ?? 5}</span>
                              <span className="small text-body-tertiary">%</span>
                            </div>
                          ))}
                        </div>
                      </CCardHeader>
                      <CCardBody>
                        <CRow className="g-3">
                          <CCol xs={12}>
                            <ExpenseCard title="🏛 Admin Expenses" color="warning" budget={(project.project_valuation || project.project_value || 0) * ((project.admin_pct ?? 5) / 100)} expenses={project.admin_expenses || []} isAdmin={true} projectId={project.id}
                              onAdd={(exp) => handleAddExpense('admin', exp)}
                              onRemove={(expId) => handleRemoveExpense('admin', expId)}
                              onEdit={(expId, data) => handleEditExpense('admin', expId, data)} />
                          </CCol>
                        </CRow>
                      </CCardBody>
                    </CCard>

                    {/* Installments Table */}
                    <CCard className="shadow-sm mb-4">
                      <CCardHeader className="bg-transparent fw-semibold pt-3 d-flex justify-content-between align-items-center">
                        <span>📅 Installment Schedule</span>
                        <CBadge color="primary" shape="rounded-pill">{installments.length} installments</CBadge>
                      </CCardHeader>
                      <CCardBody className="p-0">
                        {installments.length === 0 ? (
                          <div className="text-center text-body-tertiary small py-4">No installments defined. Edit the project to add installments.</div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <CTable hover align="middle" className="mb-0" style={{ fontSize: '0.82rem' }}>
                              <CTableHead color="light">
                                <CTableRow>
                                  <CTableHeaderCell>Installment</CTableHeaderCell>
                                  <CTableHeaderCell className="text-center">%</CTableHeaderCell>
                                  <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                                  <CTableHeaderCell>Period (Start – End/Target)</CTableHeaderCell>
                                  <CTableHeaderCell>Actual Date</CTableHeaderCell>
                                  <CTableHeaderCell className="text-center">UC Status</CTableHeaderCell>
                                </CTableRow>
                              </CTableHead>
                              <CTableBody>
                                {installments.map((inst, instIdx) => (
                                  <React.Fragment key={inst.id}>
                                    <CTableRow>
                                      <CTableDataCell className="fw-semibold">{inst.label}</CTableDataCell>
                                      <CTableDataCell className="text-center"><CBadge color="secondary">{inst.percentage}%</CBadge></CTableDataCell>
                                      <CTableDataCell className="text-end fw-bold text-primary">{fmtShort(inst.amount)}</CTableDataCell>
                                      <CTableDataCell className="text-body-secondary">{fmtD(inst.start_date)} – {fmtD(inst.end_date)}</CTableDataCell>
                                      <CTableDataCell>
                                        {actualDateEditing === inst.id ? (
                                          <div className="d-flex gap-1 align-items-center" onClick={(e) => e.stopPropagation()}>
                                            <CFormInput type="date" size="sm" value={actualDateVal} style={{ maxWidth: 150 }} onChange={(e) => setActualDateVal(e.target.value)} />
                                            <CButton size="sm" color="success" onClick={() => saveActualDate(inst.id)}>✓</CButton>
                                            <CButton size="sm" color="secondary" variant="ghost" onClick={() => setActualDateEditing(null)}>✕</CButton>
                                          </div>
                                        ) : (
                                          <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <span className={inst.actual_date ? 'text-success fw-semibold' : 'text-body-tertiary fst-italic'}>
                                              {inst.actual_date ? fmtD(inst.actual_date) : 'Not received'}
                                            </span>
                                            <CButton size="sm" color="secondary" variant="ghost" onClick={() => { setActualDateEditing(inst.id); setActualDateVal(inst.actual_date || '') }}>
                                              <CIcon icon={cilPencil} size="sm" />
                                            </CButton>
                                          </div>
                                        )}
                                      </CTableDataCell>
                                      <CTableDataCell className="text-center"><CBadge color={UC_COLORS[inst.uc_status] || 'secondary'}>{inst.uc_status || 'Pending'}</CBadge></CTableDataCell>
                                    </CTableRow>
                                  </React.Fragment>
                                ))}
                              </CTableBody>
                            </CTable>
                          </div>
                        )}
                      </CCardBody>
                    </CCard>
                  </div>
                )
              })()}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      {/* Approve Modal */}
      <CModal visible={approveModal.visible} onClose={() => setApproveModal({ visible: false, item: null })} alignment="center">
        <CModalHeader>
          <CModalTitle>Confirm Approval</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Approve <strong>{approveModal.item?.title}</strong> for{' '}
            <strong className="text-primary">{fmt(approveModal.item?.amount)}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setApproveModal({ visible: false, item: null })}>
            Cancel
          </CButton>
          <CButton color="success" onClick={() => handleApprove(approveModal.item)}>
            <CIcon icon={cilCheckCircle} className="me-1" />
            Approve
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Reject Modal */}
      <CModal visible={rejectModal.visible} onClose={() => setRejectModal({ visible: false, item: null })} alignment="center">
        <CModalHeader>
          <CModalTitle>Reject Request</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Reject <strong>{rejectModal.item?.title}</strong>? This will send it back to the Project Officer.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setRejectModal({ visible: false, item: null })}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={() => handleReject(rejectModal.item)}>
            <CIcon icon={cilXCircle} className="me-1" />
            Reject
          </CButton>
        </CModalFooter>
      </CModal>

      {/* UC Submission Modal */}
      <CModal visible={ucModal.visible} onClose={() => setUcModal({ visible: false, milestone: null })} alignment="center">
        <CModalHeader>
          <CModalTitle>Submit Utilisation Certificate (UC)</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <label className="form-label small text-body-secondary">Installment</label>
            <div className="fw-medium">{ucModal.milestone?.title} — {fmt(ucModal.milestone?.amount)}</div>
          </div>
          <div className="mb-3">
            <label className="form-label small text-body-secondary">Upload UC Document (PDF)</label>
            <input type="file" className="form-control" accept=".pdf" />
          </div>
          <div className="mb-0">
            <label className="form-label small text-body-secondary">Remarks</label>
            <textarea className="form-control" rows="3" placeholder="Any comments regarding the fund utilisation..."></textarea>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setUcModal({ visible: false, milestone: null })}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={() => handleSubmitUc(ucModal.milestone)}>
            <CIcon icon={cilFile} className="me-1" />
            Submit
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster placement="top-end">
        {toast && (
          <CToast autohide delay={3000} visible color={toast.color} className="text-white" onClose={() => setToast(null)}>
            <div className="d-flex">
              <CToastBody>{toast.message}</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        )}
      </CToaster>
    </CContainer>
  )
}

export default ProjectDetailPage
