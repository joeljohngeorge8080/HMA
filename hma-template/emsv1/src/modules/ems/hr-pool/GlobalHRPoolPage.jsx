import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CButton,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilDollar, cilChartPie, cilCheckAlt, cilX } from '@coreui/icons'
import { localOrgPool } from '../../../services/localOrgPool'
import { localGeneralExpenses } from '../../../services/localGeneralExpenses'
import { localAdminExpenses } from '../../../services/localAdminExpenses'
import { localRecruitments } from '../../../services/localRecruitments'
import { localInternships } from '../../../services/localInternships'
import ExpensePoolCard from './ExpensePoolCard'

// Outsourced Services — same category DivisionsSummary.jsx treats as the HR division.
const HR_DIVISION_CATEGORY_ID = 'cat-00000000-0012'

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


// ─── Inline Allocation Editor (per charge row in budget card) ─────────────────

const AllocationEditor = ({ charge, onSave, onCancel }) => {
  const [pct, setPct] = useState(String(charge.mySharePct ?? 0))
  const [amt, setAmt] = useState(String(charge.myAmount ?? 0))
  const total = parseFloat(charge.amount) || 0

  const handlePctChange = (val) => {
    setPct(val)
    const p = parseFloat(val) || 0
    setAmt(String(Math.round(total * (p / 100) * 100) / 100))
  }

  const handleAmtChange = (val) => {
    setAmt(val)
    const a = parseFloat(val) || 0
    setPct(String(total > 0 ? Math.round((a / total) * 10000) / 100 : 0))
  }

  const handleSave = () => {
    const newPct = parseFloat(pct) || 0
    if (newPct < 0 || newPct > 100) return
    onSave(newPct)
  }

  return (
    <div
      className="rounded-3 p-3 mt-2 mb-1"
      style={{
        background: 'rgba(79,172,254,0.08)',
        border: '1px solid rgba(79,172,254,0.3)',
        animation: 'fadeSlideIn 0.18s ease',
      }}
    >
      <div className="text-white-50 small fw-semibold mb-2" style={{ fontSize: '0.72rem' }}>
        Edit allocation for <span className="text-white">{charge.label}</span>
      </div>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <CInputGroup size="sm" style={{ maxWidth: 120 }}>
          <CFormInput
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={pct}
            onChange={(e) => handlePctChange(e.target.value)}
            style={{ textAlign: 'right', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          />
          <CInputGroupText style={{ background: 'rgba(255,255,255,0.1)', color: '#aaa', border: '1px solid rgba(255,255,255,0.2)' }}>%</CInputGroupText>
        </CInputGroup>
        <span className="text-white-50 small">or</span>
        <CInputGroup size="sm" style={{ maxWidth: 140 }}>
          <CInputGroupText style={{ background: 'rgba(255,255,255,0.1)', color: '#aaa', border: '1px solid rgba(255,255,255,0.2)' }}>₹</CInputGroupText>
          <CFormInput
            type="number"
            min="0"
            value={amt}
            onChange={(e) => handleAmtChange(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          />
        </CInputGroup>
        <div className="d-flex gap-1 ms-auto">
          <CButton
            size="sm"
            color="success"
            onClick={handleSave}
            style={{ minWidth: 64, fontSize: '0.75rem' }}
          >
            <CIcon icon={cilCheckAlt} className="me-1" style={{ width: 12, height: 12 }} />
            Save
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="ghost"
            onClick={onCancel}
            style={{ fontSize: '0.75rem' }}
          >
            <CIcon icon={cilX} style={{ width: 12, height: 12 }} />
          </CButton>
        </div>
      </div>
      <div className="text-white-50 mt-2" style={{ fontSize: '0.68rem' }}>
        Other projects will be redistributed proportionally to make up the remaining %.
        {charge.hasCustomAllocation && (
          <span className="text-warning ms-2">Custom allocation active</span>
        )}
      </div>
    </div>
  )
}

// ─── Project HR Budget Banner ─────────────────────────────────────────────────

const ProjectHRBudgetCard = ({ projectId, projects, onAllocationEdited }) => {
  const [editingCharge, setEditingCharge] = useState(null) // { expenseId, charge }
  const [charges, setCharges] = useState([])
  const [summary, setSummary] = useState(null)

  const reloadCharges = () => {
    if (!projectId) return
    setCharges(localOrgPool.getProjectHRCharges(projectId))
    setSummary(localOrgPool.getProjectHRBudgetSummary(projectId))
  }

  useEffect(() => {
    setEditingCharge(null)
    reloadCharges()
  }, [projectId])

  if (!projectId) return null

  const project = projects.find((p) => p.projectId === projectId)

  if (!summary) return null

  if (!summary.isActive && charges.length === 0) {
    return (
      <div className="p-3 rounded border bg-body-secondary text-body-secondary small text-center mb-4">
        This project is not currently active in the HR pool.
      </div>
    )
  }

  const usedPct =
    summary.poolBudget > 0
      ? Math.min(100, Math.round((summary.totalCharged / summary.poolBudget) * 100))
      : 0
  const isOver = summary.remaining < 0
  const remainingColor = isOver ? 'danger' : usedPct > 85 ? 'warning' : 'success'

  const handleSaveAllocation = (expenseId, newPct) => {
    localOrgPool.updateExpenseProjectAllocation(expenseId, projectId, newPct)
    setEditingCharge(null)
    reloadCharges()
    if (onAllocationEdited) onAllocationEdited()
  }

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

        {/* Breakdown of charges — clickable project names */}
        {charges.length > 0 && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="text-white-50 small fw-semibold text-uppercase" style={{ letterSpacing: '0.06em' }}>
                Allocated Charges
              </div>
              <div className="text-white-50" style={{ fontSize: '0.65rem' }}>
                Click a charge name to edit its allocation for this project
              </div>
            </div>
            <div className="d-flex flex-column gap-1">
              {charges.map((c) => (
                <div key={c.id}>
                  <div
                    className="d-flex justify-content-between align-items-center rounded-2 px-2 py-1"
                    style={{
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      background:
                        editingCharge?.expenseId === c.id
                          ? 'rgba(79,172,254,0.12)'
                          : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (editingCharge?.expenseId !== c.id)
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    }}
                    onMouseLeave={(e) => {
                      if (editingCharge?.expenseId !== c.id)
                        e.currentTarget.style.background = 'transparent'
                    }}
                    onClick={() => {
                      if (editingCharge?.expenseId === c.id) {
                        setEditingCharge(null)
                      } else {
                        setEditingCharge({ expenseId: c.id, charge: c })
                      }
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-white fw-medium">{c.label}</span>
                      {c.date && (
                        <span className="text-white-50 ms-1">{fmtDate(c.date)}</span>
                      )}
                      <CBadge
                        color={c.hasCustomAllocation ? 'warning' : 'secondary'}
                        className="ms-1"
                        style={{ fontSize: '0.62rem', opacity: 0.85 }}
                      >
                        {c.mySharePct?.toFixed(1)}% share
                      </CBadge>
                      {c.hasCustomAllocation && (
                        <CBadge color="warning" style={{ fontSize: '0.58rem' }}>custom</CBadge>
                      )}
                      {/* Revenue source tags */}
                      {c.revenue_sources?.includes('hr_revenue') && (
                        <CBadge color="info" style={{ fontSize: '0.58rem' }}>
                          HR Rev · {c.hr_revenue_type || ''}
                        </CBadge>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-white fw-semibold">{fmt(c.myAmount)}</span>
                      <CIcon
                        icon={cilPencil}
                        style={{
                          width: 12,
                          height: 12,
                          color: editingCharge?.expenseId === c.id ? '#4facfe' : 'rgba(255,255,255,0.3)',
                          transition: 'color 0.15s',
                        }}
                      />
                    </div>
                  </div>

                  {editingCharge?.expenseId === c.id && (
                    <AllocationEditor
                      charge={c}
                      onSave={(newPct) => handleSaveAllocation(c.id, newPct)}
                      onCancel={() => setEditingCharge(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

// ─── Org-Wide HR Budget Summary (All Projects) ────────────────────────────────

const OrgWideHRBudgetCard = () => {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    setSummary(localOrgPool.getMonthlyHRPoolBudgetSummary())
  }, [])

  if (!summary) return null

  const { totalMonthlyBudget, usedThisMonth, remaining } = summary
  const usedPct =
    totalMonthlyBudget > 0 ? Math.min(100, Math.round((usedThisMonth / totalMonthlyBudget) * 100)) : 0
  const isOver = remaining < 0

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
        <div className="mb-4">
          <div className="text-white-50 small fw-semibold text-uppercase mb-1" style={{ letterSpacing: '0.08em' }}>
            HR Pool Budget — Monthly View
          </div>
          <div className="text-white fw-bold fs-5">All Projects (Org-Wide)</div>
        </div>

        <CRow className="g-3 mb-4">
          {[
            {
              label: 'Monthly HR Budget',
              value: fmtL(totalMonthlyBudget),
              sub: 'Across all active projects',
              icon: cilDollar,
              accent: '#4facfe',
            },
            {
              label: 'Amount Used',
              value: fmtL(usedThisMonth),
              sub: 'This month, Project Pool-sourced',
              icon: cilChartPie,
              accent: isOver ? '#ff6b6b' : '#ffd166',
            },
            {
              label: 'Remaining',
              value: fmtL(Math.abs(remaining)),
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
                <div className="d-flex align-items-center gap-2 mb-2" style={{ color: m.accent }}>
                  <CIcon icon={m.icon} size="sm" />
                  <span
                    className="small fw-semibold text-uppercase"
                    style={{ letterSpacing: '0.06em', fontSize: '0.7rem' }}
                  >
                    {m.label}
                  </span>
                </div>
                <div className="fw-bold text-white" style={{ fontSize: '1.6rem', lineHeight: 1.1 }}>
                  {m.prefix || ''}
                  {m.value}
                </div>
                <div className="text-white-50" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  {m.sub}
                </div>
              </div>
            </CCol>
          ))}
        </CRow>

        <div>
          <div className="d-flex justify-content-between text-white-50 small mb-2">
            <span>Budget utilization</span>
            <span className={isOver ? 'text-danger fw-bold' : 'text-white fw-semibold'}>
              {usedPct}% used {isOver && '(Over budget!)'}
            </span>
          </div>
          <div className="rounded-pill overflow-hidden" style={{ height: 10, background: 'rgba(255,255,255,0.12)' }}>
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
      </CCardBody>
    </CCard>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const GlobalHRPoolPage = () => {
  const hrRevenueTotal = (() => {
    const recruitmentRevenue = localRecruitments
      .list({ activity_type: 'recruitment' })
      .reduce((s, r) => s + (r.amount_received || 0), 0)
    const trainingRevenue = localRecruitments
      .list({ activity_type: 'training' })
      .reduce((s, r) => s + (r.amount_received || 0), 0)
    const internshipRevenue = localInternships
      .list()
      .reduce((s, r) => s + (r.amount_received || 0), 0)
    return recruitmentRevenue + trainingRevenue + internshipRevenue
  })()

  const [hrGeneralExpenses, setHrGeneralExpenses] = useState([])
  const [adminExpenseItems, setAdminExpenseItems] = useState([])
  const [activeProjects, setActiveProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('__all__')
  const [showBudgetSection, setShowBudgetSection] = useState(false)
  const [budgetKey, setBudgetKey] = useState(0) // force budget card refresh

  const reload = () => {
    setHrGeneralExpenses(
      localGeneralExpenses.expenses.list({
        category_id: HR_DIVISION_CATEGORY_ID,
        page_size: 500,
      }).items,
    )
    setAdminExpenseItems(localAdminExpenses.list({ status: 'Active' }))
    const ap = localOrgPool.getActiveProjectMonthlyBudgets('hr')
    setActiveProjects(ap)
  }

  useEffect(() => {
    reload()
  }, [])

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

      {/* ── Project Selector + Budget Banner (collapsed by default) ──────────── */}
      <div className="mb-3">
        <CButton size="sm" color="secondary" variant="outline" onClick={() => setShowBudgetSection((s) => !s)}>
          <CIcon icon={cilChartPie} className="me-1" style={{ width: 14, height: 14 }} />
          {showBudgetSection ? 'Hide Project HR Budget' : 'Show Project HR Budget'}
        </CButton>
      </div>

      {showBudgetSection && (
        <>
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
                  <option value="__all__">— All Projects —</option>
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

          {selectedProjectId === '__all__' ? (
            <OrgWideHRBudgetCard key={budgetKey} />
          ) : (
            <ProjectHRBudgetCard
              key={budgetKey}
              projectId={selectedProjectId}
              projects={activeProjects}
              onAllocationEdited={() => setBudgetKey((k) => k + 1)}
            />
          )}
        </>
      )}

      {/* ── HR Expense Pool Card ─────────────────────────────────────────────── */}
      <ExpensePoolCard
        poolType="hr"
        poolLabel="HR"
        poolFundLabel="Project 5% Pool"
        hrRevenueTotal={hrRevenueTotal}
        expenseDropdownItems={hrGeneralExpenses.map((e) => ({ id: e.id, label: e.expense_name }))}
        onPickExpense={(id) => {
          const picked = hrGeneralExpenses.find((e) => e.id === id)
          if (!picked) return null
          const amt = picked.actual_amount > 0 ? picked.actual_amount : picked.planned_amount
          const vendorMatch = /^Vendor:\s*(.+)$/i.exec(picked.remarks || '')
          return {
            label: picked.expense_name,
            amount: String(amt),
            yearly_price: amt ? String(Math.round(amt * 12 * 100) / 100) : '',
            vendor: vendorMatch ? vendorMatch[1] : undefined,
          }
        }}
        getExpenses={() => localOrgPool.getHRExpenses()}
        addExpense={(expense, enteredBy) => localOrgPool.addHRExpense(expense, enteredBy)}
        removeExpense={(id) => localOrgPool.removeHRExpense(id)}
        updateExpense={(id, patch) => localOrgPool.updateHRExpense(id, patch)}
        getActiveProjects={() => localOrgPool.getActiveProjectMonthlyBudgets('hr')}
        getPoolBudgetSummary={(month) => localOrgPool.getMonthlyHRPoolBudgetSummary(month)}
        getProjectsMonthlyRemaining={(month) => localOrgPool.getProjectsMonthlyHRRemaining(month)}
        onExpenseChanged={() => setBudgetKey((k) => k + 1)}
      />

      {/* ── Admin Expense Pool Card ──────────────────────────────────────────── */}
      <ExpensePoolCard
        poolType="admin"
        poolLabel="Admin"
        poolFundLabel="Project 5% Admin Pool"
        hrRevenueTotal={hrRevenueTotal}
        expenseDropdownItems={adminExpenseItems.map((e) => ({
          id: e.id,
          label: `${e.expense_category} — ${e.vendor_name}`,
        }))}
        onPickExpense={(id) => {
          const picked = adminExpenseItems.find((e) => e.id === id)
          if (!picked) return null
          const monthKeys = Object.keys(picked.monthly_actuals || {}).sort()
          const latestActual = monthKeys.length > 0 ? picked.monthly_actuals[monthKeys[monthKeys.length - 1]] : 0
          const amt = latestActual > 0 ? latestActual : Math.round((picked.annual_amount || 0) / 12)
          return {
            label: `${picked.expense_category} — ${picked.vendor_name}`,
            amount: String(amt),
            yearly_price: String(picked.annual_amount || ''),
            vendor: picked.vendor_name,
          }
        }}
        getExpenses={() => localOrgPool.getAdminExpenses()}
        addExpense={(expense, enteredBy) => localOrgPool.addAdminExpense(expense, enteredBy)}
        removeExpense={(id) => localOrgPool.removeAdminExpense(id)}
        updateExpense={(id, patch) => localOrgPool.updateAdminExpense(id, patch)}
        getActiveProjects={() => localOrgPool.getActiveProjectMonthlyBudgets('admin')}
        getPoolBudgetSummary={(month) => localOrgPool.getMonthlyAdminPoolBudgetSummary(month)}
        getProjectsMonthlyRemaining={(month) => localOrgPool.getProjectsMonthlyAdminRemaining(month)}
      />
    </>
  )
}

export default GlobalHRPoolPage
