/**
 * SuperForecastingPage.jsx
 * ────────────────────────
 * EMS › Reports & Analysis › Super Forecasting  (formerly "Profit / Loss vs LSGB")
 *
 * CEO-facing command center answering: "Will the company be in profit or
 * loss — will expenses have to be taken from LSGB revenue? How many more
 * projects would close that gap? Are expenses, projects, and HR healthy?"
 *
 *   Money We Spent  = HR & Admin operating expenses (localAdminExpenses actuals,
 *                      forecast for months without data) + every project's
 *                      planned monthly expense (monthly_plan) + Expense Pools'
 *                      HR/Admin/Core expenses (localOrgPool — including any
 *                      expense explicitly tagged as drawing from LSGB Revenue)
 *   Money We Earned  = HR revenue (Recruitment/Training/Internship) + project
 *                      pool shares (5% Admin + 5% HR + 5% Core via monthly plans)
 *   Money We Had to
 *   Borrow (LSGB)    = Money We Spent − Money We Earned (when positive, that
 *                      money must be drawn from LSGB sanctions)
 *
 * Verdict: borrowing LESS from LSGB = PROFIT (good) · borrowing MORE = LOSS (bad).
 *
 * Known limitation (not solved here): localAdminExpenses (vendor contracts,
 * edited via the "Forecast Expense" tab) and localOrgPool's HR/Admin/Core
 * expenses (Expense Pools cards) are two disconnected data stores that may
 * double-record the same real expense — nothing in the code ties them
 * together. They're shown as two separate lines, not deduplicated.
 */

import React, { useState, useMemo } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CBadge,
  CFormSelect,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CTableFoot,
} from '@coreui/react'
import { localAdminExpenses } from '../../../services/localAdminExpenses'
import { localGeneralExpenses } from '../../../services/localGeneralExpenses'
import { localRecruitments } from '../../../services/localRecruitments'
import { localInternships } from '../../../services/localInternships'
import { localProjects } from '../../../services/localProjects'
import { localLsgb } from '../../../services/localLsgb'
import { localOrgPool } from '../../../services/localOrgPool'
import { computeEffectivePoolMonthly } from '../../../services/monthlyApportionment'

// ── Formatters & month helpers ────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const monthKeyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const addMonths = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number)
  return monthKeyOf(new Date(y, m - 1 + delta, 1))
}

const monthsBetween = (start, end) => {
  const months = []
  let cur = start
  let guard = 0
  while (cur <= end && guard < 60) {
    months.push(cur)
    cur = addMonths(cur, 1)
    guard += 1
  }
  return months
}

const monthLabel = (ym) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const CURRENT_MONTH = monthKeyOf(new Date())
// Pickable window: 12 months back … 12 months ahead of today.
const PICKER_MONTHS = monthsBetween(addMonths(CURRENT_MONTH, -12), addMonths(CURRENT_MONTH, 12))

// ── HR & Admin operating expense per month ────────────────────────────────────
// Same records the Forecast Expense tab reads/writes: localAdminExpenses'
// monthly_actuals plus localGeneralExpenses' Outsourced Services category.

const buildOperatingActuals = () => {
  const byMonth = {}

  localAdminExpenses.list({ status: 'Active' }).forEach((entry) => {
    Object.entries(entry.monthly_actuals || {}).forEach(([m, amount]) => {
      byMonth[m] = (byMonth[m] || 0) + (parseFloat(amount) || 0)
    })
  })

  const outsourcedCat = localGeneralExpenses.categories
    .list()
    .find((c) => c.name === 'Outsourced Services')
  if (outsourcedCat) {
    const { items } = localGeneralExpenses.expenses.list({
      category_id: outsourcedCat.id,
      page_size: 500,
    })
    items.forEach((e) => {
      const m = `${e.year}-${String(e.month).padStart(2, '0')}`
      byMonth[m] = (byMonth[m] || 0) + (parseFloat(e.actual_amount) || 0)
    })
  }

  return byMonth
}

/** Recency-weighted average (oldest ×1 … newest ×n) of known month totals. */
const forecastFrom = (knownTotals) => {
  const n = knownTotals.length
  if (n === 0) return 0
  const weightSum = (n * (n + 1)) / 2
  return Math.round(knownTotals.reduce((acc, v, i) => acc + v * (i + 1), 0) / weightSum)
}

/**
 * Sums Expense Pools' HR/Admin/Core expenses (localOrgPool) within a date
 * range — the only expense records that carry an explicit lsgb_revenue_pct
 * tag. Page-local helper (no changes needed in localOrgPool.js), same
 * pattern as buildOperatingActuals() above.
 */
const buildPoolExpenseTotals = (rangeStart, rangeEnd) => {
  const all = [
    ...localOrgPool.getHRExpenses(),
    ...localOrgPool.getAdminExpenses(),
    ...localOrgPool.getCoreExpenses(),
  ]
  const inRange = all.filter((e) => {
    const m = (e.date || '').slice(0, 7)
    return m >= rangeStart && m <= rangeEnd
  })
  const totalAmount = inRange.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const lsgbTaggedAmount = inRange.reduce((s, e) => {
    const pct = parseFloat(e.lsgb_revenue_pct) || 0
    return s + (parseFloat(e.amount) || 0) * (pct / 100)
  }, 0)
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    lsgbTaggedAmount: Math.round(lsgbTaggedAmount * 100) / 100,
    count: inRange.length,
  }
}

/**
 * Computes the full Profit/Loss picture for a date range: per-month expense
 * rows (with forecast fallback for months without actuals) plus period totals
 * and the profit/loss verdict. Pulled out of the page component so both the
 * page and the dashboard's Profit/Loss widget can call the exact same logic.
 */
export const computeLsgbTotals = (rangeStart, rangeEnd) => {
  const months = monthsBetween(rangeStart, rangeEnd)
  const operatingActuals = buildOperatingActuals()
  const projects = localProjects
    .list({ pageSize: 1000 })
    .items.filter((p) => p.monthly_plan?.length > 0)

  const knownMonths = Object.keys(operatingActuals).sort()
  const knownTotals = knownMonths.map((m) => operatingActuals[m])
  const operatingForecast = forecastFrom(knownTotals)
  const lastKnown = knownMonths[knownMonths.length - 1] || ''

  const monthRows = months.map((m) => {
    const hasActual = operatingActuals[m] !== undefined && m <= lastKnown
    const operatingExpense = hasActual ? operatingActuals[m] : operatingForecast

    let projectExpense = 0
    let shareRevenue = 0
    projects.forEach((p) => {
      const entry = p.monthly_plan.find((e) => e.month === m)
      if (!entry) return
      projectExpense += entry.total || 0
      shareRevenue +=
        computeEffectivePoolMonthly(p, 'admin', m) +
        computeEffectivePoolMonthly(p, 'hr', m) +
        computeEffectivePoolMonthly(p, 'core', m)
    })

    const totalExpense = operatingExpense + projectExpense
    const lsgbNeed = Math.max(0, totalExpense - shareRevenue)
    return {
      month: m,
      operatingExpense,
      isForecast: !hasActual,
      projectExpense,
      shareRevenue,
      totalExpense,
      lsgbNeed,
    }
  })

  const rec = localRecruitments.list()
  const recruitment = rec
    .filter((r) => (r.activity_type || 'recruitment') === 'recruitment')
    .reduce((s, r) => s + (r.amount_received || 0), 0)
  const training = rec
    .filter((r) => r.activity_type === 'training')
    .reduce((s, r) => s + (r.amount_received || 0), 0)
  const internship = localInternships.list().reduce((s, r) => s + (r.amount_received || 0), 0)
  const hrRevenueTotal = recruitment + training + internship

  const poolExpenses = buildPoolExpenseTotals(rangeStart, rangeEnd)

  const operating = monthRows.reduce((s, r) => s + r.operatingExpense, 0)
  const project = monthRows.reduce((s, r) => s + r.projectExpense, 0)
  const shares = monthRows.reduce((s, r) => s + r.shareRevenue, 0)
  const expenses = operating + project + poolExpenses.totalAmount
  const ownRevenue = shares + hrRevenueTotal
  const lsgbNeed = Math.max(0, expenses - ownRevenue)
  const surplus = Math.max(0, ownRevenue - expenses)
  const lsgbSharePct = expenses > 0 ? (lsgbNeed / expenses) * 100 : 0

  return {
    monthRows,
    hrRevenueTotal,
    operating,
    project,
    poolExpenses,
    projectCount: projects.length,
    shares,
    expenses,
    ownRevenue,
    lsgbNeed,
    surplus,
    lsgbSharePct,
    isProfit: lsgbNeed === 0,
  }
}

/**
 * Reverse-calculator: how much new project value (and roughly how many new
 * projects) would be needed to cut LSGB borrowing — or grow an existing
 * surplus — by targetPct%. avgCombinedPct is a weighted average (by project
 * value) of each active project's own admin_pct+hr_pct+core_pct, so this
 * reflects real project-level rates rather than assuming every project uses
 * the 5+5+5 default.
 */
export const computeLsgbReductionPlan = (totals, targetPct) => {
  const projects = localProjects
    .list({ pageSize: 1000 })
    .items.filter((p) => p.status === 'active' || p.status === 'ongoing')

  const totalValue = projects.reduce((s, p) => s + (p.project_value || p.project_valuation || 0), 0)
  const weightedPctSum = projects.reduce((s, p) => {
    const pv = p.project_value || p.project_valuation || 0
    const combinedPct = (p.admin_pct ?? 5) + (p.hr_pct ?? 5) + (p.core_pct ?? 5)
    return s + pv * combinedPct
  }, 0)
  const avgCombinedPct = totalValue > 0 ? weightedPctSum / totalValue : 15

  const baseAmount = totals.isProfit ? totals.surplus : totals.lsgbNeed
  const targetReduction = baseAmount * ((targetPct || 0) / 100)
  const neededNewProjectValue = avgCombinedPct > 0 ? targetReduction / (avgCombinedPct / 100) : 0
  const avgProjectSize = projects.length > 0 ? totalValue / projects.length : 0
  const approxProjectsNeeded =
    avgProjectSize > 0 ? Math.ceil(neededNewProjectValue / avgProjectSize) : null

  return {
    avgCombinedPct: Math.round(avgCombinedPct * 100) / 100,
    baseAmount: Math.round(baseAmount * 100) / 100,
    targetReduction: Math.round(targetReduction * 100) / 100,
    neededNewProjectValue: Math.round(neededNewProjectValue * 100) / 100,
    avgProjectSize: Math.round(avgProjectSize * 100) / 100,
    approxProjectsNeeded,
  }
}

/** Plain OK/Watch/Over Budget health label for one pool's monthly summary — same
 *  85%/100% threshold convention already used by GeneralExpenseWidget.jsx. */
export const poolHealth = (summary) => {
  if (!summary || summary.totalMonthlyBudget <= 0) return { label: 'No Data', color: 'secondary' }
  const pct = (summary.usedThisMonth / summary.totalMonthlyBudget) * 100
  if (pct > 100) return { label: 'Over Budget', color: 'danger' }
  if (pct > 85) return { label: 'Watch', color: 'warning' }
  return { label: 'OK', color: 'success' }
}

/**
 * HR revenue broken down by source (recruitment/training/internship — no
 * per-month received date on these records, so it's a period-level total
 * exactly like the Revenue tab). Shared by the page and the HR dashboard
 * widget so both read the exact same numbers.
 */
export const computeHRRevenueBreakdown = () => {
  const rec = localRecruitments.list()
  const recruitment = rec
    .filter((r) => (r.activity_type || 'recruitment') === 'recruitment')
    .reduce((s, r) => s + (r.amount_received || 0), 0)
  const training = rec
    .filter((r) => r.activity_type === 'training')
    .reduce((s, r) => s + (r.amount_received || 0), 0)
  const internship = localInternships.list().reduce((s, r) => s + (r.amount_received || 0), 0)
  return { recruitment, training, internship, total: recruitment + training + internship }
}

/**
 * Expense counts + per-pool budget health for a period — the "Expenses at a
 * Glance" section. Takes the already-computed totals (from computeLsgbTotals)
 * so callers don't need to recompute poolExpenses/projectCount twice.
 */
export const computeExpenseGlance = (totals) => {
  const operatingCount = localAdminExpenses.list({ status: 'Active' }).length
  return {
    operatingCount,
    poolCount: totals.poolExpenses.count,
    projectCount: totals.projectCount,
    hr: poolHealth(localOrgPool.getMonthlyHRPoolBudgetSummary()),
    admin: poolHealth(localOrgPool.getMonthlyAdminPoolBudgetSummary()),
    core: poolHealth(localOrgPool.getMonthlyCorePoolBudgetSummary()),
  }
}

/**
 * HR's own cost (operating vendor contracts tagged group:'HR' + Expense
 * Pools' HR expenses) vs HR revenue, for the "How Is HR Doing?" section.
 */
export const computeHRHealth = (rangeStart, rangeEnd, hrRevenueTotal) => {
  let hrOperatingCost = 0
  localAdminExpenses
    .list({ status: 'Active' })
    .filter((e) => e.group === 'HR')
    .forEach((entry) => {
      Object.entries(entry.monthly_actuals || {}).forEach(([m, amount]) => {
        if (m >= rangeStart && m <= rangeEnd) hrOperatingCost += parseFloat(amount) || 0
      })
    })
  const hrPoolCost = localOrgPool
    .getHRExpenses()
    .filter((e) => {
      const m = (e.date || '').slice(0, 7)
      return m >= rangeStart && m <= rangeEnd
    })
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const totalCost = Math.round((hrOperatingCost + hrPoolCost) * 100) / 100
  const coveragePct =
    totalCost > 0 ? Math.min(100, Math.round((hrRevenueTotal / totalCost) * 100)) : null
  return { totalCost, coveragePct }
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SuperForecastingPage = () => {
  // Default period ≈ 1 year: Jan → Dec of the current year (diagram: "maybe 1 year").
  const [rangeStart, setRangeStart] = useState(`${new Date().getFullYear()}-01`)
  const [rangeEnd, setRangeEnd] = useState(`${new Date().getFullYear()}-12`)
  const [targetPct, setTargetPct] = useState(10)

  // HR revenue has no per-month received date in its records, so — like the
  // Revenue tab — it counts once as a period-level total.
  const hrRevenue = useMemo(() => computeHRRevenueBreakdown(), [])

  // LSGB actuals: sanctions and withdrawals inside the selected period.
  const lsgb = useMemo(() => {
    const summary = localLsgb.getSummary()
    const withdrawnInPeriod = localLsgb
      .listWithdrawals()
      .filter((w) => {
        const m = (w.withdrawal_date || '').slice(0, 7)
        return m >= rangeStart && m <= rangeEnd
      })
      .reduce((s, w) => s + (parseFloat(w.amount) || 0), 0)
    return { ...summary, withdrawnInPeriod }
  }, [rangeStart, rangeEnd])

  // ── Period totals & verdict ─────────────────────────────────────────────────
  const { monthRows, ...totals } = useMemo(
    () => computeLsgbTotals(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  )
  const isProfit = totals.isProfit

  const reductionPlan = useMemo(
    () => computeLsgbReductionPlan(totals, targetPct),
    [totals, targetPct],
  )

  const projectStats = useMemo(() => localProjects.getStats(), [])

  const expenseGlance = useMemo(
    () => computeExpenseGlance(totals),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totals.poolExpenses.count, totals.projectCount],
  )

  const hrHealth = useMemo(
    () => computeHRHealth(rangeStart, rangeEnd, hrRevenue.total),
    [rangeStart, rangeEnd, hrRevenue.total],
  )

  const handleStart = (v) => {
    setRangeStart(v)
    if (v > rangeEnd) setRangeEnd(v)
  }
  const handleEnd = (v) => {
    setRangeEnd(v)
    if (v < rangeStart) setRangeStart(v)
  }

  return (
    <>
      {/* Header + period picker */}
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Super Forecasting</h4>
          <p className="text-body-secondary mb-0 small">
            Will the money we earn cover the money we spend, or do we need to borrow from LSGB?
            Borrowing <strong className="text-success">less</strong> is good · borrowing{' '}
            <strong className="text-danger">more</strong> is bad.
          </p>
        </div>
        <div className="d-flex gap-2 align-items-end">
          <div>
            <CFormLabel className="small fw-semibold mb-1">From</CFormLabel>
            <CFormSelect
              size="sm"
              value={rangeStart}
              onChange={(e) => handleStart(e.target.value)}
              style={{ width: 140 }}
            >
              {PICKER_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div>
            <CFormLabel className="small fw-semibold mb-1">To</CFormLabel>
            <CFormSelect
              size="sm"
              value={rangeEnd}
              onChange={(e) => handleEnd(e.target.value)}
              style={{ width: 140 }}
            >
              {PICKER_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </CFormSelect>
          </div>
        </div>
      </div>

      {/* Verdict banner */}
      <CCard
        className="border-0 shadow-sm mb-4"
        style={{
          background: isProfit ? 'rgba(6,214,160,0.08)' : 'rgba(255,107,107,0.08)',
          border: `1px solid ${isProfit ? 'rgba(6,214,160,0.3)' : 'rgba(255,107,107,0.3)'}`,
          borderRadius: 12,
        }}
      >
        <CCardBody className="d-flex align-items-center gap-3 py-3">
          <div className="flex-grow-1">
            <div
              className="fw-bold"
              style={{ fontSize: '1.15rem', color: isProfit ? '#06d6a0' : '#ff6b6b' }}
            >
              {isProfit
                ? 'We Made Money! Nothing needs to be borrowed from LSGB.'
                : `We Spent More Than We Earned — ${fmt(totals.lsgbNeed)} had to be borrowed from LSGB.`}
            </div>
            <div className="small text-body-secondary">
              {monthLabel(rangeStart)} – {monthLabel(rangeEnd)} · Money We Spent{' '}
              {fmt(totals.expenses)} vs Money We Earned {fmt(totals.ownRevenue)}
              {isProfit
                ? ` · extra money saved ${fmt(totals.surplus)}`
                : ` · ${totals.lsgbSharePct.toFixed(0)}% of what we spent came from LSGB`}
            </div>
            {totals.poolExpenses.lsgbTaggedAmount > 0 && (
              <div className="small text-body-secondary mt-1">
                Of which {fmt(totals.poolExpenses.lsgbTaggedAmount)} was already tagged as{' '}
                <strong>LSGB Revenue</strong> on expenses in Expense Pools.
              </div>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* Can we cut our LSGB borrowing? */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">
          Can We Cut Our LSGB Borrowing?
        </CCardHeader>
        <CCardBody>
          <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
            <span>Cut borrowing by</span>
            <CInputGroup size="sm" style={{ width: 90 }}>
              <CFormInput
                type="number"
                min="0"
                max="100"
                value={targetPct}
                onChange={(e) => setTargetPct(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{ textAlign: 'right', fontWeight: 600 }}
              />
              <CInputGroupText>%</CInputGroupText>
            </CInputGroup>
          </div>
          {reductionPlan.avgProjectSize > 0 ? (
            <>
              <div className="fs-6">
                To cut LSGB borrowing by {targetPct}%, you need about{' '}
                <strong className="text-success">{fmt(reductionPlan.neededNewProjectValue)}</strong>{' '}
                in new project value — roughly{' '}
                <strong className="text-success">
                  {reductionPlan.approxProjectsNeeded} new project
                  {reductionPlan.approxProjectsNeeded === 1 ? '' : 's'}
                </strong>
                , based on your average project size of {fmt(reductionPlan.avgProjectSize)}.
              </div>
              <div className="text-body-secondary small mt-2">
                Assumes the new project(s) run for this whole period, and earn pool-cut money at
                your current average rate of {reductionPlan.avgCombinedPct}% of project value.
              </div>
            </>
          ) : (
            <div className="text-body-secondary">
              Add at least one active project to calculate this.
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Headline cards */}
      <CRow className="g-3 mb-4">
        {[
          {
            label: 'Money We Spent',
            value: totals.expenses,
            color: 'danger',
            sub: `Operating ${fmt(totals.operating)} + Projects ${fmt(totals.project)} + Expense Pools ${fmt(totals.poolExpenses.totalAmount)}`,
          },
          {
            label: 'Money We Earned',
            value: totals.ownRevenue,
            color: 'success',
            sub: `Project shares ${fmt(totals.shares)} + HR revenue ${fmt(hrRevenue.total)}`,
          },
          {
            label: 'Money We Had to Borrow',
            value: totals.lsgbNeed,
            color: totals.lsgbNeed > 0 ? 'danger' : 'success',
            sub: totals.lsgbNeed > 0 ? 'Not covered by what we earned' : 'Fully self-funded',
          },
          {
            label: 'LSGB Withdrawn (period)',
            value: lsgb.withdrawnInPeriod,
            color: 'warning',
            sub: `Sanctioned ${fmt(lsgb.totalSanctioned)} · remaining ${fmt(lsgb.remaining)}`,
          },
        ].map((card) => (
          <CCol key={card.label} xs={6} lg={3}>
            <CCard className={`border-top border-top-${card.color} border-3 h-100`}>
              <CCardBody className="py-3">
                <div className={`fw-bold fs-5 text-${card.color}`}>{fmt(card.value)}</div>
                <div className="small text-body-secondary">{card.label}</div>
                <div className="text-body-secondary mt-1" style={{ fontSize: '0.7rem' }}>
                  {card.sub}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* Expenses at a Glance */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">Expenses at a Glance</CCardHeader>
        <CCardBody>
          <CRow className="g-3 mb-3">
            {[
              { label: 'Operating Contracts', value: expenseGlance.operatingCount },
              { label: 'Expense Pool Entries', value: expenseGlance.poolCount },
              { label: 'Projects with a Plan', value: expenseGlance.projectCount },
            ].map((s) => (
              <CCol key={s.label} xs={6} md={4}>
                <div className="border rounded-3 p-3 text-center h-100">
                  <div className="fw-bold fs-5">{s.value}</div>
                  <div className="small text-body-secondary">{s.label}</div>
                </div>
              </CCol>
            ))}
          </CRow>
          <div className="fw-semibold mb-2 small">Is spending under control this month?</div>
          <div className="d-flex flex-wrap gap-3">
            {[
              { label: 'HR', health: expenseGlance.hr },
              { label: 'Admin', health: expenseGlance.admin },
              { label: 'Core', health: expenseGlance.core },
            ].map((p) => (
              <div
                key={p.label}
                className="d-flex align-items-center gap-2 border rounded-3 px-3 py-2"
              >
                <span className="fw-semibold">{p.label}</span>
                <CBadge color={p.health.color} shape="rounded-pill">
                  {p.health.label}
                </CBadge>
              </div>
            ))}
          </div>
        </CCardBody>
      </CCard>

      {/* Projects at a Glance */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">Projects at a Glance</CCardHeader>
        <CCardBody>
          <CRow className="g-3 mb-3">
            {[
              { label: 'Running Now', value: projectStats.ongoing, color: 'success' },
              { label: 'Approved', value: projectStats.approved, color: 'info' },
              { label: 'In Pipeline', value: projectStats.pipeline, color: 'secondary' },
              { label: 'Completed', value: projectStats.completed, color: 'primary' },
            ].map((s) => (
              <CCol key={s.label} xs={6} md={3}>
                <div className="border rounded-3 p-3 text-center h-100">
                  <div className={`fw-bold fs-5 text-${s.color}`}>{s.value}</div>
                  <div className="small text-body-secondary">{s.label}</div>
                </div>
              </CCol>
            ))}
          </CRow>
          <div className="fs-6">
            Your projects earned <strong className="text-success">{fmt(totals.shares)}</strong> in
            pool-cut money this period.
          </div>
          <div className="mt-2">
            Do our projects earn enough?{' '}
            {isProfit ? (
              <CBadge color="success" shape="rounded-pill">
                Yes
              </CBadge>
            ) : (
              <>
                <CBadge color="danger" shape="rounded-pill">
                  Not yet
                </CBadge>
                <span className="text-body-secondary small ms-2">
                  See "Can We Cut Our LSGB Borrowing?" above for how many more projects would close
                  the gap.
                </span>
              </>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* How Is HR Doing? */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">How Is HR Doing?</CCardHeader>
        <CCardBody>
          {hrHealth.totalCost > 0 ? (
            <div className="fs-6">
              HR earned <strong className="text-success">{fmt(hrRevenue.total)}</strong> and cost{' '}
              <strong className="text-danger">{fmt(hrHealth.totalCost)}</strong> — HR covers{' '}
              <strong>{hrHealth.coveragePct}%</strong> of its own cost.
            </div>
          ) : (
            <div className="text-body-secondary">HR has no recorded cost this period.</div>
          )}
          <div className="text-body-secondary small mt-2">
            Recruitment {fmt(hrRevenue.recruitment)} · Training {fmt(hrRevenue.training)} ·
            Internship {fmt(hrRevenue.internship)}
          </div>
        </CCardBody>
      </CCard>

      {/* Month-by-month breakdown — simplified */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">Month-by-Month</CCardHeader>
        <CCardBody className="p-0">
          <div style={{ overflowX: 'auto' }}>
            <CTable small hover align="middle" className="mb-0" style={{ fontSize: '0.82rem' }}>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Month</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Money We Spent</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Money We Earned</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {monthRows.map((r) => (
                  <CTableRow key={r.month}>
                    <CTableDataCell className="fw-semibold">
                      {monthLabel(r.month)}
                      {r.isForecast && (
                        <span
                          className="text-body-secondary fw-normal ms-1"
                          style={{ fontSize: '0.72rem' }}
                        >
                          (estimate)
                        </span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">{fmt(r.totalExpense)}</CTableDataCell>
                    <CTableDataCell className="text-end text-success">
                      {r.shareRevenue > 0 ? fmt(r.shareRevenue) : '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CBadge color={r.lsgbNeed > 0 ? 'danger' : 'success'} shape="rounded-pill">
                        {r.lsgbNeed > 0 ? 'Borrowed' : 'Covered'}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
              <CTableFoot color="light">
                <CTableRow className="fw-bold">
                  <CTableDataCell>Total</CTableDataCell>
                  <CTableDataCell className="text-end">{fmt(totals.expenses)}</CTableDataCell>
                  <CTableDataCell className="text-end text-success">
                    {fmt(totals.ownRevenue)}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CBadge color={isProfit ? 'success' : 'danger'} shape="rounded-pill">
                      {isProfit ? 'Covered' : 'Borrowed'}
                    </CBadge>
                  </CTableDataCell>
                </CTableRow>
              </CTableFoot>
            </CTable>
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default SuperForecastingPage
