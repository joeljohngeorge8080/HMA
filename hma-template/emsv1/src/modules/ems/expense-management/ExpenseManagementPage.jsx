/**
 * ExpenseManagementPage.jsx
 * EMS › Expense Management
 *
 * Two tabs:
 *  1. Admin Expenses — existing per-org expense register
 *  2. Consolidated Sheet — cross-project summary (HR %, Admin, Core charges per project)
 *     with a monthly drill-down per project
 */
import React, { useState, useEffect, useMemo } from 'react'
import {
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CBadge,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CButton,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilDollar,
  cilChartPie,
  cilArrowLeft,
  cilNotes,
  cilList,
} from '@coreui/icons'
import { localOrgPool } from '../../../services/localOrgPool'
import { localProjects, PHASE_CONFIG } from '../../../services/localProjects'

// ─── Shared Formatters ────────────────────────────────────────────────────────

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

const monthLabel = (ym) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

// ─── Monthly Drill-down for a project ────────────────────────────────────────

// ─── Helper: find the installment active today ───────────────────────────────
const getCurrentInstallment = (installments = []) => {
  const today = new Date().toISOString().split('T')[0]
  return (
    installments.find(
      (i) => i.start_date <= today && (i.end_date || i.target_date || '') >= today,
    ) ||
    installments[installments.length - 1] ||
    null
  )
}

const MonthlyDrillDown = ({ project, onBack }) => {
  const installments = useMemo(
    () => localOrgPool.getProjectInstallmentBudgets(project.projectId, 'hr'),
    [project.projectId],
  )

  const hrCharges = useMemo(
    () => localOrgPool.getProjectHRCharges(project.projectId),
    [project.projectId],
  )

  const summary = useMemo(
    () => localOrgPool.getProjectHRBudgetSummary(project.projectId),
    [project.projectId],
  )

  // Full PMS project record — for status, phase, current installment UC status
  const pmsProject = useMemo(
    () => localProjects.getById(project.projectId),
    [project.projectId],
  )
  const currentInst = useMemo(
    () => getCurrentInstallment(pmsProject?.installments || []),
    [pmsProject],
  )
  const phaseConfig = PHASE_CONFIG[pmsProject?.phase] || PHASE_CONFIG.pipeline

  // Build month → charges lookup
  const chargeByMonth = useMemo(() => {
    const map = {}
    hrCharges.forEach((c) => {
      if (c.date) {
        const ym = c.date.slice(0, 7)
        map[ym] = (map[ym] || 0) + (c.myAmount || 0)
      }
    })
    return map
  }, [hrCharges])

  const usedPct =
    summary.poolBudget > 0
      ? Math.min(100, Math.round((summary.totalCharged / summary.poolBudget) * 100))
      : 0
  const isOver = summary.remaining < 0

  return (
    <>
      {/* Back + Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <CButton color="secondary" variant="ghost" size="sm" onClick={onBack}>
          <CIcon icon={cilArrowLeft} className="me-1" />
          Back to Sheet
        </CButton>
        <div>
          <h5 className="mb-0 fw-bold">{project.projectName}</h5>
          <div className="text-body-secondary small">Monthly HR Budget Breakdown</div>
        </div>
      </div>

      {/* Summary header card */}
      <CCard
        className="mb-4 border-0 shadow-sm"
        style={{
          background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',
          borderRadius: 14,
        }}
      >
        <CCardBody className="p-4">

          {/* ── Top row: project info ──────────────────────────────────── */}
          <div className="mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div
              className="text-white-50 small fw-semibold text-uppercase mb-2"
              style={{ letterSpacing: '0.08em', fontSize: '0.68rem' }}
            >
              Project Details
            </div>
            <div className="text-white fw-bold mb-2" style={{ fontSize: '1.1rem' }}>
              {project.projectName}
            </div>

            {/* Status / Phase / UC badges */}
            <div className="d-flex flex-wrap gap-2 mb-2">
              {pmsProject?.status && (
                <CBadge
                  color={
                    pmsProject.status === 'ongoing'
                      ? 'success'
                      : pmsProject.status === 'approved'
                      ? 'info'
                      : pmsProject.status === 'completed'
                      ? 'secondary'
                      : 'warning'
                  }
                  shape="rounded-pill"
                  style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
                >
                  {pmsProject.status}
                </CBadge>
              )}
              {pmsProject?.phase && (
                <CBadge
                  color={phaseConfig.color}
                  shape="rounded-pill"
                  style={{ fontSize: '0.7rem' }}
                >
                  {phaseConfig.label}
                </CBadge>
              )}
              {currentInst && (
                <CBadge
                  color={
                    currentInst.uc_status === 'Approved'
                      ? 'success'
                      : currentInst.uc_status === 'Submitted'
                      ? 'primary'
                      : 'warning'
                  }
                  shape="rounded-pill"
                  style={{ fontSize: '0.7rem' }}
                >
                  UC: {currentInst.uc_status || 'Pending'}
                </CBadge>
              )}
            </div>

            <div className="d-flex flex-wrap gap-4" style={{ fontSize: '0.78rem' }}>
              <div className="text-white-50">
                Current installment:{' '}
                <span className="text-white fw-medium">
                  {currentInst ? currentInst.label : 'None'}
                </span>
                {currentInst?.start_date && (
                  <span className="ms-1 text-white-50">
                    ({currentInst.start_date} → {currentInst.end_date || currentInst.target_date || '…'})
                  </span>
                )}
              </div>
              <div className="text-white-50">
                HR pool share:{' '}
                <span className="text-white fw-semibold">{summary.sharePct?.toFixed(1) || 0}%</span>
                {' '}of org pool
              </div>
            </div>
          </div>

          {/* ── Metric tiles: side by side ─────────────────────────────── */}
          <CRow className="g-3 mb-4">
            {[
              {
                label: 'Pool Budget',
                sub: 'Total HR allocation',
                val: fmtL(summary.poolBudget),
                accent: '#4facfe',
                icon: '💰',
              },
              {
                label: 'Amount Used',
                sub: `${hrCharges.length} charge record${hrCharges.length !== 1 ? 's' : ''}`,
                val: fmtL(summary.totalCharged),
                accent: isOver ? '#ff6b6b' : '#ffd166',
                icon: '📤',
              },
              {
                label: 'Remaining',
                sub: isOver ? 'Over budget!' : `${100 - usedPct}% left`,
                val: `${isOver ? '−' : ''}${fmtL(Math.abs(summary.remaining))}`,
                accent: isOver ? '#ff6b6b' : '#06d6a0',
                icon: '✅',
              },
            ].map((m) => (
              <CCol key={m.label} xs={12} md={4}>
                <div
                  className="rounded-3 p-3 h-100"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: `1px solid rgba(255,255,255,0.12)`,
                  }}
                >
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                    <div
                      className="text-uppercase fw-semibold"
                      style={{ fontSize: '0.67rem', letterSpacing: '0.07em', color: m.accent }}
                    >
                      {m.label}
                    </div>
                  </div>
                  <div
                    className="fw-bold"
                    style={{ fontSize: '1.6rem', color: m.accent, lineHeight: 1.1, marginBottom: 4 }}
                  >
                    {m.val}
                  </div>
                  <div className="text-white-50" style={{ fontSize: '0.72rem' }}>
                    {m.sub}
                  </div>
                </div>
              </CCol>
            ))}
          </CRow>

          {/* ── Progress bar ───────────────────────────────────────────── */}
          <div>
            <div className="d-flex justify-content-between text-white-50 small mb-2">
              <span>Budget utilization</span>
              <span className={isOver ? 'text-danger fw-bold' : 'text-white fw-semibold'}>
                {usedPct}%{isOver && ' — OVER BUDGET'}
              </span>
            </div>
            <div
              className="rounded-pill overflow-hidden"
              style={{ height: 8, background: 'rgba(255,255,255,0.12)' }}
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
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* Installment blocks with month cards */}
      {installments.length === 0 ? (
        <div className="text-center text-body-secondary py-5 small">
          No installments found for this project.
        </div>
      ) : (
        installments.map((inst) => {
          const instUsed = inst.monthList.reduce(
            (s, ym) => s + (chargeByMonth[ym] || 0),
            0,
          )
          return (
            <CCard key={inst.installmentId} className="shadow-sm mb-4">
              <CCardHeader className="bg-transparent pt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <span className="fw-semibold">{inst.installmentLabel}</span>
                  <span className="text-body-secondary small ms-2">
                    {monthLabel(inst.installmentStart)} – {monthLabel(inst.installmentEnd)}
                  </span>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <CBadge
                    color={
                      inst.ucStatus === 'Approved'
                        ? 'success'
                        : inst.ucStatus === 'Submitted'
                        ? 'primary'
                        : 'warning'
                    }
                    shape="rounded-pill"
                  >
                    UC: {inst.ucStatus || 'Pending'}
                  </CBadge>
                  <span className="small text-body-secondary">
                    HR {inst.pct}% ÷ {inst.totalMonths} months ={' '}
                    <strong className="text-primary">{fmtL(inst.monthlyBudget)}</strong>/mo
                    {' · '}this installment ({inst.months} mo):{' '}
                    <strong className="text-success">{fmtL(inst.poolBudget)}</strong>
                  </span>
                </div>
              </CCardHeader>
              <CCardBody>
                {inst.monthList.length === 0 ? (
                  <div className="text-body-secondary small">No months in this installment.</div>
                ) : (
                  <div
                    className="d-flex gap-3 flex-wrap"
                    style={{ overflowX: 'auto', paddingBottom: 4 }}
                  >
                    {inst.monthList.map((ym) => {
                      const used = chargeByMonth[ym] || 0
                      const remaining = inst.monthlyBudget - used
                      const pct =
                        inst.monthlyBudget > 0
                          ? Math.min(100, Math.round((used / inst.monthlyBudget) * 100))
                          : 0
                      const over = remaining < 0
                      return (
                        <div
                          key={ym}
                          className="rounded-3 border shadow-sm"
                          style={{
                            minWidth: 160,
                            maxWidth: 190,
                            flex: '0 0 auto',
                            padding: '14px 16px',
                          }}
                        >
                          <div
                            className="fw-semibold mb-2 text-body"
                            style={{ fontSize: '0.85rem' }}
                          >
                            {monthLabel(ym)}
                          </div>

                          {/* mini bar */}
                          <div
                            className="rounded-pill overflow-hidden mb-3"
                            style={{ height: 5, background: 'var(--cui-border-color)' }}
                          >
                            <div
                              className="h-100 rounded-pill"
                              style={{
                                width: `${pct}%`,
                                background: over
                                  ? '#ff6b6b'
                                  : pct > 85
                                  ? '#ffd166'
                                  : '#06d6a0',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>

                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-body-secondary">Budget</span>
                            <span className="fw-medium">{fmtL(inst.monthlyBudget)}</span>
                          </div>
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-body-secondary">Utilized</span>
                            <span
                              className={`fw-semibold ${used > 0 ? (over ? 'text-danger' : 'text-warning') : 'text-body-secondary'}`}
                            >
                              {fmtL(used)}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between small">
                            <span className="text-body-secondary">Remaining</span>
                            <span
                              className={`fw-semibold ${over ? 'text-danger' : 'text-success'}`}
                            >
                              {over ? '−' : ''}
                              {fmtL(Math.abs(remaining))}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CCardBody>
            </CCard>
          )
        })
      )}
    </>
  )
}

// ─── Consolidated Cross-Project Sheet ────────────────────────────────────────

const EXPENSE_ROWS = [
  {
    key: 'hr',
    label: 'HR Expenses',
    pctKey: 'hr_pct',
    color: 'primary',
    getValue: (proj, budgets) => {
      const b = budgets.hr.find((b) => b.projectId === proj.projectId)
      return b?.poolBudget ?? 0
    },
    getUsed: (proj, summaries) => summaries[proj.projectId]?.hr?.totalCharged ?? 0,
  },
  {
    key: 'core',
    label: 'Core Expenses',
    pctKey: 'core_pct',
    color: 'info',
    getValue: (proj, budgets) => {
      const b = budgets.core.find((b) => b.projectId === proj.projectId)
      return b?.poolBudget ?? 0
    },
    getUsed: () => 0, // core charges not tracked yet
  },
]

const ConsolidatedSheet = ({ onDrillDown }) => {
  const [projects, setProjects] = useState([])
  const [budgets, setBudgets] = useState({ hr: [], core: [] })
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hrBudgets = localOrgPool.getActiveProjectMonthlyBudgets('hr')
    const coreBudgets = localOrgPool.getActiveProjectMonthlyBudgets('core')

    // Merge unique projects from both pools
    const projMap = {}
    ;[...hrBudgets, ...coreBudgets].forEach((b) => {
      if (!projMap[b.projectId]) projMap[b.projectId] = b
    })
    const projs = Object.values(projMap)

    // Build per-project summaries
    const sums = {}
    projs.forEach((p) => {
      sums[p.projectId] = {
        hr: localOrgPool.getProjectHRBudgetSummary(p.projectId),
      }
    })

    setProjects(projs)
    setBudgets({ hr: hrBudgets, core: coreBudgets })
    setSummaries(sums)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center text-body-secondary py-5 small">
        No active projects in the pool. Activate projects in PMS to see them here.
      </div>
    )
  }

  // Totals per row
  const totals = EXPENSE_ROWS.map((row) => ({
    key: row.key,
    budget: projects.reduce((s, p) => s + row.getValue(p, budgets), 0),
    used: projects.reduce((s, p) => s + row.getUsed(p, summaries), 0),
  }))

  return (
    <>
      <div className="mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h6 className="fw-bold mb-0">Cross-Project Expense Consolidated Sheet</h6>
          <div className="text-body-secondary small">
            Budget allocation and utilization across {projects.length} active project
            {projects.length !== 1 ? 's' : ''} · Click a project column to view monthly breakdown
          </div>
        </div>
        <CBadge color="success" shape="rounded-pill" className="px-3 py-2">
          {projects.length} Active Projects
        </CBadge>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          className="table table-bordered table-hover align-middle mb-0"
          style={{ minWidth: 900, fontSize: '0.84rem', borderCollapse: 'separate', borderSpacing: 0 }}
        >
          <thead>
            <tr>
              {/* Sticky left cells */}
              <th
                rowSpan={2}
                className="align-middle text-center bg-body-secondary fw-semibold"
                style={{ minWidth: 50, position: 'sticky', left: 0, zIndex: 2, borderRight: '2px solid var(--cui-border-color)' }}
              >
                SI No
              </th>
              <th
                rowSpan={2}
                className="align-middle bg-body-secondary fw-semibold"
                style={{ minWidth: 160, position: 'sticky', left: 50, zIndex: 2, borderRight: '2px solid var(--cui-border-color)' }}
              >
                Particulars
              </th>
              {/* Project columns header */}
              <th
                colSpan={projects.length}
                className="text-center bg-primary bg-opacity-10 text-primary fw-semibold"
                style={{ letterSpacing: '0.05em' }}
              >
                Projects
              </th>
              {/* Total column */}
              <th
                rowSpan={2}
                className="text-center align-middle bg-body-secondary fw-semibold"
                style={{ minWidth: 120, borderLeft: '2px solid var(--cui-border-color)' }}
              >
                Total
              </th>
            </tr>
            <tr>
              {projects.map((p) => (
                <th
                  key={p.projectId}
                  className="text-center"
                  style={{ minWidth: 130, maxWidth: 160, verticalAlign: 'top', cursor: 'pointer' }}
                  onClick={() => onDrillDown(p)}
                  title={`Click to view monthly breakdown for ${p.projectName}`}
                >
                  <div
                    className="text-primary text-decoration-underline"
                    style={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.3 }}
                  >
                    {p.projectName}
                  </div>
                  <div className="text-body-secondary" style={{ fontSize: '0.68rem', marginTop: 2 }}>
                    {p.sharePct?.toFixed(1)}% share
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {EXPENSE_ROWS.map((row, ri) => {
              const total = totals.find((t) => t.key === row.key)
              return (
                <React.Fragment key={row.key}>
                  {/* Budget row */}
                  <tr>
                    <td
                      className="text-center fw-medium bg-body-tertiary"
                      style={{ position: 'sticky', left: 0, zIndex: 1, borderRight: '2px solid var(--cui-border-color)' }}
                    >
                      {ri + 1}
                    </td>
                    <td
                      style={{ position: 'sticky', left: 50, zIndex: 1, borderRight: '2px solid var(--cui-border-color)', background: 'var(--cui-body-bg)' }}
                    >
                      <div className="fw-semibold">{row.label}</div>
                      <CBadge color={row.color} shape="rounded-pill" style={{ fontSize: '0.65rem' }}>
                        @{row.pctKey.replace('_pct', '').toUpperCase()} %
                      </CBadge>
                      <div className="text-body-secondary" style={{ fontSize: '0.68rem', marginTop: 2 }}>
                        Installment Budget
                      </div>
                    </td>
                    {projects.map((p) => {
                      const val = row.getValue(p, budgets)
                      return (
                        <td
                          key={p.projectId}
                          className="text-end"
                          style={{ cursor: 'pointer' }}
                          onClick={() => onDrillDown(p)}
                        >
                          <span className="fw-medium">{val > 0 ? fmtL(val) : '—'}</span>
                        </td>
                      )
                    })}
                    <td
                      className="text-end fw-bold text-primary"
                      style={{ borderLeft: '2px solid var(--cui-border-color)' }}
                    >
                      {fmtL(total?.budget)}
                    </td>
                  </tr>

                  {/* Used row */}
                  <tr className="table-light">
                    <td
                      style={{ position: 'sticky', left: 0, zIndex: 1, borderRight: '2px solid var(--cui-border-color)' }}
                    />
                    <td
                      style={{ position: 'sticky', left: 50, zIndex: 1, borderRight: '2px solid var(--cui-border-color)', background: 'var(--cui-tertiary-bg)' }}
                    >
                      <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                        ↳ Used
                      </div>
                    </td>
                    {projects.map((p) => {
                      const used = row.getUsed(p, summaries)
                      const budget = row.getValue(p, budgets)
                      const over = used > budget && budget > 0
                      return (
                        <td key={p.projectId} className="text-end" style={{ fontSize: '0.78rem' }}>
                          <span className={over ? 'text-danger fw-semibold' : used > 0 ? 'text-warning fw-medium' : 'text-body-tertiary'}>
                            {used > 0 ? fmtL(used) : '—'}
                          </span>
                        </td>
                      )
                    })}
                    <td
                      className="text-end fw-semibold text-warning"
                      style={{ fontSize: '0.78rem', borderLeft: '2px solid var(--cui-border-color)' }}
                    >
                      {total?.used > 0 ? fmtL(total.used) : '—'}
                    </td>
                  </tr>

                  {/* Remaining row */}
                  <tr>
                    <td
                      style={{ position: 'sticky', left: 0, zIndex: 1, borderRight: '2px solid var(--cui-border-color)' }}
                    />
                    <td
                      style={{ position: 'sticky', left: 50, zIndex: 1, borderRight: '2px solid var(--cui-border-color)', background: 'var(--cui-body-bg)' }}
                    >
                      <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                        ↳ Remaining
                      </div>
                    </td>
                    {projects.map((p) => {
                      const used = row.getUsed(p, summaries)
                      const budget = row.getValue(p, budgets)
                      const remaining = budget - used
                      const over = remaining < 0
                      return (
                        <td key={p.projectId} className="text-end" style={{ fontSize: '0.78rem' }}>
                          {budget > 0 ? (
                            <span className={over ? 'text-danger fw-semibold' : 'text-success fw-medium'}>
                              {over ? '−' : ''}
                              {fmtL(Math.abs(remaining))}
                            </span>
                          ) : (
                            <span className="text-body-tertiary">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td
                      className="text-end fw-semibold text-success"
                      style={{ fontSize: '0.78rem', borderLeft: '2px solid var(--cui-border-color)' }}
                    >
                      {total?.budget > 0 ? fmtL(total.budget - total.used) : '—'}
                    </td>
                  </tr>

                  {/* Spacer row between expense types */}
                  {ri < EXPENSE_ROWS.length - 1 && (
                    <tr style={{ height: 8 }}>
                      <td
                        colSpan={projects.length + 3}
                        style={{ background: 'var(--cui-tertiary-bg)', padding: 0 }}
                      />
                    </tr>
                  )}
                </React.Fragment>
              )
            })}

            {/* Grand total row */}
            <tr style={{ borderTop: '3px solid var(--cui-border-color)' }}>
              <td
                colSpan={2}
                className="fw-bold text-center bg-body-secondary"
                style={{ position: 'sticky', left: 0, zIndex: 1, borderRight: '2px solid var(--cui-border-color)' }}
              >
                Grand Total Budget
              </td>
              {projects.map((p) => {
                const total = EXPENSE_ROWS.reduce((s, row) => s + row.getValue(p, budgets), 0)
                return (
                  <td key={p.projectId} className="text-end fw-bold text-primary">
                    {fmtL(total)}
                  </td>
                )
              })}
              <td
                className="text-end fw-bold text-primary"
                style={{ borderLeft: '2px solid var(--cui-border-color)' }}
              >
                {fmtL(totals.reduce((s, t) => s + t.budget, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-body-secondary small mt-3">
        <CIcon icon={cilChartPie} className="me-1" />
        Click any project name or cell to view the monthly budget breakdown for that project.
      </div>
    </>
  )
}

// ─── Lazy-loaded Admin Expense content ───────────────────────────────────────

const AdminExpensePage = React.lazy(() => import('./AdminExpensePage'))

// ─── Main Page ────────────────────────────────────────────────────────────────

const ExpenseManagementPage = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [drillProject, setDrillProject] = useState(null)

  const handleDrillDown = (project) => {
    setDrillProject(project)
  }

  const handleBack = () => {
    setDrillProject(null)
  }

  return (
    <>
      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1 fw-bold">Expense Management</h4>
          <p className="text-body-secondary mb-0 small">
            Organisation expense registers and consolidated cross-project sheet.
          </p>
        </div>
      </div>

      {/* Tabs — only show when not in drill-down mode */}
      {!drillProject && (
        <CNav variant="underline" className="mb-4">
          <CNavItem>
            <CNavLink
              active={activeTab === 0}
              onClick={() => setActiveTab(0)}
              role="button"
              className="fw-medium"
              id="tab-admin-expenses"
            >
              <CIcon icon={cilList} className="me-1" />
              Admin Expenses
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeTab === 1}
              onClick={() => setActiveTab(1)}
              role="button"
              className="fw-medium"
              id="tab-consolidated-sheet"
            >
              <CIcon icon={cilNotes} className="me-1" />
              Consolidated Sheet
            </CNavLink>
          </CNavItem>
        </CNav>
      )}

      <CTabContent>
        {/* ── Tab 0: Admin Expenses ──────────────────────────────────────── */}
        <CTabPane visible={activeTab === 0 && !drillProject}>
          <React.Suspense
            fallback={
              <div className="text-center py-5">
                <CSpinner color="primary" />
              </div>
            }
          >
            <AdminExpensePage />
          </React.Suspense>
        </CTabPane>

        {/* ── Tab 1: Consolidated Sheet or drill-down ───────────────────── */}
        <CTabPane visible={activeTab === 1 || !!drillProject}>
          {drillProject ? (
            <MonthlyDrillDown project={drillProject} onBack={handleBack} />
          ) : (
            <ConsolidatedSheet onDrillDown={handleDrillDown} />
          )}
        </CTabPane>
      </CTabContent>
    </>
  )
}

export default ExpenseManagementPage
