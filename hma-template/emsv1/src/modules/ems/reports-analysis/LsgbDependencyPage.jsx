/**
 * LsgbDependencyPage.jsx
 * ──────────────────────
 * EMS › Reports & Analysis › Profit / Loss vs LSGB  (per docs/Report&analysis.drawio)
 *
 * CEO-facing report answering: "Will the company be in profit or loss —
 * will expenses have to be taken from LSGB revenue?"
 *
 *   Expenses  = HR & Admin operating expenses (actuals from the same records
 *               the Forecast Expense tab uses; forecast for months without
 *               data) + every project's planned monthly expense (monthly_plan)
 *   Own Rev.  = HR revenue (Recruitment/Training/Internship) + project pool
 *               shares (5% Admin + 5% HR + 5% Core via monthly plans)
 *   LSGB need = Expenses − Own Revenue (when positive, that money must be
 *               drawn from LSGB sanctions)
 *
 * Verdict: taking LESS from LSGB = PROFIT (good) · taking MORE = LOSS (bad).
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
  CFormLabel,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CProgress,
} from '@coreui/react'
import { localAdminExpenses } from '../../../services/localAdminExpenses'
import { localGeneralExpenses } from '../../../services/localGeneralExpenses'
import { localRecruitments } from '../../../services/localRecruitments'
import { localInternships } from '../../../services/localInternships'
import { localProjects } from '../../../services/localProjects'
import { localLsgb } from '../../../services/localLsgb'
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
 * Computes the full Profit/Loss picture for a date range: per-month expense
 * rows (with forecast fallback for months without actuals) plus period totals
 * and the profit/loss verdict. Pulled out of the page component so both the
 * page and the dashboard's Profit/Loss widget can call the exact same logic.
 */
export const computeLsgbTotals = (rangeStart, rangeEnd) => {
  const months = monthsBetween(rangeStart, rangeEnd)
  const operatingActuals = buildOperatingActuals()
  const projects = localProjects.list({ pageSize: 1000 }).items.filter((p) => p.monthly_plan?.length > 0)

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
    return { month: m, operatingExpense, isForecast: !hasActual, projectExpense, shareRevenue, totalExpense, lsgbNeed }
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

  const operating = monthRows.reduce((s, r) => s + r.operatingExpense, 0)
  const project = monthRows.reduce((s, r) => s + r.projectExpense, 0)
  const shares = monthRows.reduce((s, r) => s + r.shareRevenue, 0)
  const expenses = operating + project
  const ownRevenue = shares + hrRevenueTotal
  const lsgbNeed = Math.max(0, expenses - ownRevenue)
  const surplus = Math.max(0, ownRevenue - expenses)
  const lsgbSharePct = expenses > 0 ? (lsgbNeed / expenses) * 100 : 0

  return {
    monthRows,
    hrRevenueTotal,
    operating,
    project,
    shares,
    expenses,
    ownRevenue,
    lsgbNeed,
    surplus,
    lsgbSharePct,
    isProfit: lsgbNeed === 0,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LsgbDependencyPage = () => {
  // Default period ≈ 1 year: Jan → Dec of the current year (diagram: "maybe 1 year").
  const [rangeStart, setRangeStart] = useState(`${new Date().getFullYear()}-01`)
  const [rangeEnd, setRangeEnd] = useState(`${new Date().getFullYear()}-12`)

  // HR revenue has no per-month received date in its records, so — like the
  // Revenue tab — it counts once as a period-level total.
  const hrRevenue = useMemo(() => {
    const rec = localRecruitments.list()
    const recruitment = rec
      .filter((r) => (r.activity_type || 'recruitment') === 'recruitment')
      .reduce((s, r) => s + (r.amount_received || 0), 0)
    const training = rec
      .filter((r) => r.activity_type === 'training')
      .reduce((s, r) => s + (r.amount_received || 0), 0)
    const internship = localInternships.list().reduce((s, r) => s + (r.amount_received || 0), 0)
    return { recruitment, training, internship, total: recruitment + training + internship }
  }, [])

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
  // Dependency grade for the "less is good / more is bad" scale.
  const grade =
    totals.lsgbSharePct === 0
      ? 'None'
      : totals.lsgbSharePct <= 25
        ? 'Low'
        : totals.lsgbSharePct <= 50
          ? 'Moderate'
          : 'High'
  const gradeColor = { None: 'success', Low: 'success', Moderate: 'warning', High: 'danger' }[grade]

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
          <h4 className="fw-bold mb-1">Profit / Loss vs LSGB</h4>
          <p className="text-body-secondary mb-0 small">
            Will company expenses be covered by own revenue, or drawn from LSGB? Taking{' '}
            <strong className="text-success">less</strong> from LSGB is good · taking{' '}
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
          <div style={{ fontSize: '2.2rem' }}>{isProfit ? '✅' : '⚠️'}</div>
          <div className="flex-grow-1">
            <div
              className="fw-bold"
              style={{ fontSize: '1.15rem', color: isProfit ? '#06d6a0' : '#ff6b6b' }}
            >
              {isProfit
                ? 'PROFIT — own revenue covers all expenses; nothing needs to be taken from LSGB'
                : `LOSS — ${fmt(totals.lsgbNeed)} must be taken from LSGB revenue`}
            </div>
            <div className="small text-body-secondary">
              {monthLabel(rangeStart)} – {monthLabel(rangeEnd)} · Expenses {fmt(totals.expenses)} vs
              own revenue {fmt(totals.ownRevenue)}
              {isProfit
                ? ` · surplus ${fmt(totals.surplus)}`
                : ` · ${totals.lsgbSharePct.toFixed(1)}% of expenses depend on LSGB`}
            </div>
            {!isProfit && (
              <div className="mt-2" style={{ maxWidth: 420 }}>
                <CProgress
                  value={Math.min(100, totals.lsgbSharePct)}
                  color={gradeColor}
                  height={8}
                />
                <div className="d-flex justify-content-between small text-body-secondary mt-1">
                  <span>LSGB dependency</span>
                  <CBadge color={gradeColor} shape="rounded-pill">
                    {grade}
                  </CBadge>
                </div>
              </div>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* Headline cards */}
      <CRow className="g-3 mb-4">
        {[
          {
            label: 'Total Expenses',
            value: totals.expenses,
            color: 'danger',
            sub: `Operating ${fmt(totals.operating)} + Projects ${fmt(totals.project)}`,
          },
          {
            label: 'Own Revenue',
            value: totals.ownRevenue,
            color: 'success',
            sub: `Shares ${fmt(totals.shares)} + HR revenue ${fmt(hrRevenue.total)}`,
          },
          {
            label: 'Needed from LSGB',
            value: totals.lsgbNeed,
            color: totals.lsgbNeed > 0 ? 'danger' : 'success',
            sub: totals.lsgbNeed > 0 ? 'Expenses not covered by own revenue' : 'Fully self-funded',
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

      {/* Month-by-month breakdown */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">
          Month-by-Month Breakdown
          <span className="text-body-secondary small fw-normal ms-2">
            LSGB Need = (HR/Admin expense + project planned expense) − project shares. HR revenue
            has no month attached, so it's applied to the period total above.
          </span>
        </CCardHeader>
        <CCardBody className="p-0">
          <div style={{ overflowX: 'auto' }}>
            <CTable small hover align="middle" className="mb-0" style={{ fontSize: '0.82rem' }}>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Month</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">HR + Admin Expense</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Project Planned Expense</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Total Expense</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Project Shares (15%)</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">LSGB Need</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {monthRows.map((r) => (
                  <CTableRow key={r.month}>
                    <CTableDataCell className="fw-semibold">
                      {monthLabel(r.month)}
                      {r.isForecast && (
                        <CBadge
                          color="info"
                          shape="rounded-pill"
                          className="ms-2"
                          style={{ fontSize: '0.6rem' }}
                        >
                          forecast
                        </CBadge>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">{fmt(r.operatingExpense)}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {r.projectExpense > 0 ? fmt(r.projectExpense) : '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {fmt(r.totalExpense)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end text-success">
                      {r.shareRevenue > 0 ? fmt(r.shareRevenue) : '—'}
                    </CTableDataCell>
                    <CTableDataCell
                      className={`text-end fw-semibold ${r.lsgbNeed > 0 ? 'text-danger' : 'text-success'}`}
                    >
                      {r.lsgbNeed > 0 ? fmt(r.lsgbNeed) : '₹0'}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CBadge color={r.lsgbNeed > 0 ? 'danger' : 'success'} shape="rounded-pill">
                        {r.lsgbNeed > 0 ? 'From LSGB' : 'Covered'}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
              <CTableFoot color="light">
                <CTableRow className="fw-bold">
                  <CTableDataCell>Total</CTableDataCell>
                  <CTableDataCell className="text-end">{fmt(totals.operating)}</CTableDataCell>
                  <CTableDataCell className="text-end">{fmt(totals.project)}</CTableDataCell>
                  <CTableDataCell className="text-end">{fmt(totals.expenses)}</CTableDataCell>
                  <CTableDataCell className="text-end text-success">
                    {fmt(totals.shares)}
                  </CTableDataCell>
                  <CTableDataCell
                    className={`text-end ${totals.lsgbNeed > 0 ? 'text-danger' : 'text-success'}`}
                  >
                    {fmt(totals.lsgbNeed)}
                  </CTableDataCell>
                  <CTableDataCell />
                </CTableRow>
              </CTableFoot>
            </CTable>
          </div>
        </CCardBody>
      </CCard>

      {/* Revenue composition */}
      <CCard className="mb-4">
        <CCardHeader className="bg-transparent fw-semibold">Own Revenue Composition</CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            {[
              { label: 'Project Shares (Admin+HR+Core)', value: totals.shares, color: 'primary' },
              { label: 'Recruitment', value: hrRevenue.recruitment, color: 'info' },
              { label: 'Training', value: hrRevenue.training, color: 'info' },
              { label: 'Internship', value: hrRevenue.internship, color: 'info' },
            ].map((s) => (
              <CCol key={s.label} xs={6} lg={3}>
                <div className="border rounded-3 p-3 text-center h-100">
                  <div className={`fw-bold text-${s.color}`}>{fmt(s.value)}</div>
                  <div className="small text-body-secondary">{s.label}</div>
                </div>
              </CCol>
            ))}
          </CRow>
          <div className="text-body-secondary small mt-3">
            Sources: EMS → Expense Management → Forecast Expense (HR/Admin expenses) · PMS → All
            Projects → each project's monthly plan (planned expense & pool shares) · PMS → LSGB
            (sanctions & withdrawals).
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default LsgbDependencyPage
