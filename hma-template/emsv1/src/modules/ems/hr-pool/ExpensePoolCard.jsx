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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilCheck } from '@coreui/icons'
import { localOrgPool } from '../../../services/localOrgPool'

const fmt = (n) =>
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

// ─── Revenue Source Selector ─────────────────────────────────────────────────────
// Generalized over however many sources a given pool card offers: HR and
// Admin cards offer 3 (hr_revenue, project_pool, lsgb_revenue); Core offers a
// 4th (admin_pool) via showAdminShare. `pctBySource` holds one percentage per
// source key; toggling or editing any source redistributes the rest so the
// selected sources always sum to exactly 100.
const RevenueSourceSelector = ({
  poolType,
  poolFundLabel,
  revSources,
  setRevSources,
  pctBySource,
  setPctBySource,
  totalAmount,
  hrRevenueTotal,
  lsgbAvailable,
  showAdminShare,
}) => {
  const total = parseFloat(totalAmount) || 0
  const availableSources = [
    'hr_revenue',
    'project_pool',
    'lsgb_revenue',
    ...(showAdminShare ? ['admin_pool'] : []),
  ]
  const multiSelected = revSources.length >= 2

  const SOURCE_LABELS = {
    hr_revenue: 'HR Revenue',
    project_pool: poolFundLabel,
    lsgb_revenue: 'LSGB Revenue',
    admin_pool: 'Admin 5% Share',
  }
  const SOURCE_COLORS = {
    hr_revenue: '#4cc9f0',
    project_pool: '#06d6a0',
    lsgb_revenue: '#f77f00',
    admin_pool: '#7209b7',
  }

  const toggle = (src) => {
    setRevSources((prev) => {
      const isRemoving = prev.includes(src)
      const next = isRemoving ? prev.filter((s) => s !== src) : [...prev, src]
      const finalNext = next.length > 0 ? next : ['project_pool']
      // Evenly split 100% across whatever ends up selected — matches this
      // selector's original 2-source behaviour (single = 100%, two = 50/50),
      // generalised to however many are selected, with the rounding
      // remainder given to the first selected source so the total is always
      // exactly 100.
      const evenBase = Math.floor((100 / finalNext.length) * 100) / 100
      const remainder = Math.round((100 - evenBase * finalNext.length) * 100) / 100
      const nextPct = {}
      availableSources.forEach((s) => {
        nextPct[s] = 0
      })
      finalNext.forEach((s, i) => {
        nextPct[s] = i === 0 ? Math.round((evenBase + remainder) * 100) / 100 : evenBase
      })
      setPctBySource(nextPct)
      return finalNext
    })
  }

  // Redistribute the remaining percentage proportionally across the other
  // currently-selected sources — the same algorithm this file already uses
  // to split one expense across multiple projects (see ExpensePoolCard's
  // handleAllocPctChange), applied here to the revenue-source axis.
  const handlePctChange = (src, val) => {
    const v = Math.max(0, Math.min(100, parseFloat(val) || 0))
    const others = revSources.filter((s) => s !== src)
    const remaining = Math.round((100 - v) * 100) / 100
    const othersTotal = others.reduce((s, k) => s + (pctBySource[k] || 0), 0)

    const next = { ...pctBySource, [src]: v }
    others.forEach((k) => {
      const weight = othersTotal > 0 ? (pctBySource[k] || 0) / othersTotal : 1 / others.length
      next[k] = Math.round(remaining * weight * 100) / 100
    })
    if (others.length > 0) {
      const last = others[others.length - 1]
      const sumExceptLast = v + others.slice(0, -1).reduce((s, k) => s + next[k], 0)
      next[last] = Math.round((100 - sumExceptLast) * 100) / 100
    }
    setPctBySource(next)
  }

  const handleAmtChange = (src, val) => {
    if (total <= 0) return
    const amt = Math.max(0, Math.min(total, parseFloat(val) || 0))
    const pct = Math.round((amt / total) * 10000) / 100
    handlePctChange(src, pct)
  }

  const totalPct = Math.round(revSources.reduce((s, k) => s + (pctBySource[k] || 0), 0) * 100) / 100
  const pctValid = !multiSelected || totalPct === 100

  const rowStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '10px 14px',
  }

  const renderRow = (src, availableTotal) => {
    const label = SOURCE_LABELS[src]
    const color = SOURCE_COLORS[src]
    const checked = revSources.includes(src)
    const pct = pctBySource[src] || 0
    const amt = total > 0 ? Math.round(total * (pct / 100) * 100) / 100 : 0

    return (
      <div key={src} style={rowStyle}>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <input
            type="checkbox"
            id={`rev-${src}-${poolType}`}
            checked={checked}
            onChange={() => toggle(src)}
            style={{ accentColor: color, width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
          />
          <label
            htmlFor={`rev-${src}-${poolType}`}
            className="mb-0 fw-semibold"
            style={{ cursor: 'pointer', color, minWidth: 96 }}
          >
            {label}
          </label>
          {checked && multiSelected && (
            <>
              <CInputGroup size="sm" style={{ width: 90 }}>
                <CFormInput
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={pct}
                  onChange={(e) => handlePctChange(src, e.target.value)}
                  style={{ textAlign: 'right', fontWeight: 600 }}
                />
                <CInputGroupText style={{ fontWeight: 600, fontSize: '0.8rem' }}>%</CInputGroupText>
              </CInputGroup>
              <CInputGroup size="sm" style={{ width: 120 }}>
                <CInputGroupText style={{ fontSize: '0.8rem' }}>&#8377;</CInputGroupText>
                <CFormInput
                  type="number"
                  min="0"
                  value={amt || ''}
                  placeholder="Amount"
                  onChange={(e) => handleAmtChange(src, e.target.value)}
                  style={{ textAlign: 'right' }}
                />
              </CInputGroup>
              {total > 0 && (
                <span className="text-body-secondary" style={{ fontSize: '0.73rem' }}>
                  of {fmt(total)}
                </span>
              )}
            </>
          )}
          {checked && !multiSelected && total > 0 && (
            <span className="text-body-secondary ms-auto" style={{ fontSize: '0.78rem' }}>
              100% — {fmt(total)}
            </span>
          )}
        </div>
        {checked &&
          availableTotal !== undefined &&
          (() => {
            const drawn = multiSelected ? amt : total
            const remaining = (availableTotal || 0) - drawn
            const isOver = remaining < 0
            return (
              <div
                className={`small mt-1 ${isOver ? 'text-danger fw-semibold' : 'text-body-secondary'}`}
                style={{ fontSize: '0.74rem' }}
              >
                Available: {fmt(availableTotal || 0)} &nbsp;−{fmt(drawn)} this expense &nbsp;→&nbsp;
                {fmt(remaining)} remaining
              </div>
            )
          })()}
      </div>
    )
  }

  return (
    <div
      className="rounded-3 p-3 mb-3"
      style={{
        background: 'rgba(6,214,160,0.06)',
        border: '1px solid rgba(6,214,160,0.25)',
        fontSize: '0.85rem',
      }}
    >
      <div className="fw-semibold text-body mb-2" style={{ fontSize: '0.82rem' }}>
        Revenue Source
      </div>

      <div className="d-flex flex-column gap-2">
        {renderRow('hr_revenue', hrRevenueTotal)}
        {renderRow('project_pool', undefined)}
        {renderRow('lsgb_revenue', lsgbAvailable)}
        {showAdminShare && renderRow('admin_pool', undefined)}
      </div>

      {/* Validation message */}
      {multiSelected && (
        <div
          className={`small mt-2 d-flex align-items-center gap-2 ${pctValid ? 'text-success' : 'text-danger'}`}
          style={{ fontSize: '0.74rem' }}
        >
          {pctValid ? (
            <>
              <CIcon icon={cilCheck} style={{ width: 12, height: 12 }} />
              Percentages sum to 100% —{' '}
              {revSources.map((s) => `${SOURCE_LABELS[s]}: ${pctBySource[s] || 0}%`).join(' · ')}
            </>
          ) : (
            <>&#9888; Percentages must sum to 100% (currently {totalPct}%)</>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Budget Cap Alert ──────────────────────────────────────────────────────────
// Shared by the Project Pool row (every card) and the Admin 5% Share row
// (Core only) — both are real budget-capped draws, unlike HR/LSGB Revenue
// which are informational-only checks shown inline in RevenueSourceSelector.
const BudgetCapAlert = ({ label, totalAmt, poolPortion, budgetSummary }) => {
  const { totalMonthlyBudget, usedThisMonth, remaining } = budgetSummary

  if (totalAmt <= 0 || totalMonthlyBudget <= 0)
    return <div className="mb-3" style={{ minHeight: 0 }} />

  const overage = Math.round((poolPortion - remaining) * 100) / 100
  const pctUsed = Math.round((poolPortion / totalMonthlyBudget) * 100)
  const isOver = overage > 0
  const isWarn = !isOver && poolPortion >= remaining * 0.8

  if (!isOver && !isWarn) return <div className="mb-3" style={{ minHeight: 0 }} />

  if (!isOver) {
    return (
      <div
        className="mb-3 p-2 rounded d-flex align-items-center gap-2"
        style={{
          background: 'rgba(255,193,7,0.1)',
          border: '1px solid rgba(255,193,7,0.35)',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ fontSize: '1rem' }}>&#9889;</span>
        <span className="text-warning">
          This expense will use <strong>{fmt(poolPortion)}</strong> of the{' '}
          <strong>{fmt(remaining)}</strong> remaining monthly {label} budget ({pctUsed}%).
        </span>
      </div>
    )
  }

  return (
    <div
      className="mb-3 p-3 rounded"
      style={{
        background: 'rgba(220,53,69,0.12)',
        border: '1.5px solid rgba(220,53,69,0.5)',
        fontSize: '0.82rem',
      }}
    >
      <div className="d-flex align-items-center gap-2 fw-bold text-danger mb-1">
        <span style={{ fontSize: '1.05rem' }}>&#128683;</span>
        {label} budget exceeded for this month
      </div>
      <div
        className="d-flex flex-wrap gap-3 mt-1"
        style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.75)' }}
      >
        <span>
          Monthly budget: <strong className="text-body">{fmt(totalMonthlyBudget)}</strong>
        </span>
        <span>
          Already used: <strong className="text-body">{fmt(usedThisMonth)}</strong>
        </span>
        <span>
          Remaining: <strong className="text-warning">{fmt(remaining)}</strong>
        </span>
        <span>
          This expense ({label} portion):{' '}
          <strong className="text-danger">{fmt(poolPortion)}</strong>
        </span>
        <span>
          Overage: <strong className="text-danger">+{fmt(overage)}</strong>
        </span>
      </div>
      <div className="mt-2 small text-body-secondary" style={{ fontSize: '0.73rem' }}>
        Reduce the expense amount, reduce the {label} %, or route more to another revenue source to
        stay within budget.
      </div>
    </div>
  )
}

// ─── Expense Pool Card (shared HR / Admin / Core expense-adding card) ─────────

const ExpensePoolCard = ({
  poolType,
  poolLabel,
  poolFundLabel,
  hrRevenueTotal,
  lsgbAvailable,
  getAdminPoolBudgetSummary,
  expenseDropdownItems,
  onPickExpense,
  getExpenses,
  addExpense,
  removeExpense,
  updateExpense,
  getActiveProjects,
  getPoolBudgetSummary,
  getProjectsMonthlyRemaining,
  onExpenseChanged,
}) => {
  const showAdminShare = Boolean(getAdminPoolBudgetSummary)

  const [form, setForm] = useState({
    vendor: '',
    label: '',
    frequency: 'Monthly',
    yearly_price: '',
    amount: '',
    expenseMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
    notes: '',
    bill_no: '',
  })
  // Revenue source state for the add form
  const [revSources, setRevSources] = useState(['project_pool'])
  const [pctBySource, setPctBySource] = useState({
    hr_revenue: 0,
    project_pool: 100,
    lsgb_revenue: 0,
    admin_pool: 0,
  })

  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [allExpenses, setAllExpenses] = useState([])
  const [previewAllocs, setPreviewAllocs] = useState([])
  const [customAllocs, setCustomAllocs] = useState(null) // null = use auto previewAllocs
  const [draftAmounts, setDraftAmounts] = useState({}) // projectId -> string being typed
  const [activeProjects, setActiveProjects] = useState([])
  const [selectedProjectIds, setSelectedProjectIds] = useState([])
  const [poolBudgetSummary, setPoolBudgetSummary] = useState({
    totalMonthlyBudget: 0,
    usedThisMonth: 0,
    remaining: 0,
  })
  const [adminPoolBudgetSummary, setAdminPoolBudgetSummary] = useState({
    totalMonthlyBudget: 0,
    usedThisMonth: 0,
    remaining: 0,
  })
  const [projectRemainingMap, setProjectRemainingMap] = useState({})

  const reload = () => {
    setAllExpenses(getExpenses())
    const ap = getActiveProjects()
    setActiveProjects(ap)
    setSelectedProjectIds(ap.map((p) => p.projectId))
    setPoolBudgetSummary(getPoolBudgetSummary())
    setProjectRemainingMap(getProjectsMonthlyRemaining())
    if (getAdminPoolBudgetSummary) setAdminPoolBudgetSummary(getAdminPoolBudgetSummary())
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetAddForm = () => {
    setForm({
      vendor: '',
      label: '',
      frequency: 'Monthly',
      yearly_price: '',
      amount: '',
      expenseMonth: new Date().toISOString().slice(0, 7),
      notes: '',
      bill_no: '',
    })
    setRevSources(['project_pool'])
    setPctBySource({ hr_revenue: 0, project_pool: 100, lsgb_revenue: 0, admin_pool: 0 })
    setPreviewAllocs([])
    setCustomAllocs(null)
    setDraftAmounts({})
    setSelectedProjectIds(activeProjects.map((p) => p.projectId))
  }

  const handleExpensePick = (expenseId) => {
    if (!expenseId) return
    const mapped = onPickExpense(expenseId)
    if (!mapped) return
    setForm((f) => {
      const next = { ...f }
      for (const [k, v] of Object.entries(mapped)) {
        if (v !== undefined) next[k] = v
      }
      return next
    })
  }

  const toggleSelectedProject = (projectId) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
    )
  }

  // Refresh month-scoped budget figures when selected month changes
  useEffect(() => {
    setPoolBudgetSummary(getPoolBudgetSummary(form.expenseMonth))
    setProjectRemainingMap(getProjectsMonthlyRemaining(form.expenseMonth))
    if (getAdminPoolBudgetSummary) {
      setAdminPoolBudgetSummary(getAdminPoolBudgetSummary(form.expenseMonth))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.expenseMonth, allExpenses])

  // Live allocation preview — recomputes whenever amount, pool%, or source changes
  useEffect(() => {
    const amt = parseFloat(form.amount) || 0
    const hasPool = revSources.includes('project_pool')
    if (amt > 0 && hasPool) {
      const poolAmt = Math.round(amt * (pctBySource.project_pool / 100) * 100) / 100
      const computed = localOrgPool.computeAllocations(poolType, poolAmt, selectedProjectIds)
      setPreviewAllocs(computed)
      setCustomAllocs(null) // reset custom overrides when base changes
      setDraftAmounts({}) // clear drafts when base recalculates
    } else {
      setPreviewAllocs([])
      setCustomAllocs(null)
      setDraftAmounts({})
    }
  }, [form.amount, pctBySource.project_pool, revSources, selectedProjectIds, poolType])

  // Displayed allocations: use custom if user has edited, else auto
  const displayAllocs = customAllocs ?? previewAllocs

  /**
   * When user edits one project's %, redistribute the remaining (100 - newPct)%
   * proportionally across all other projects.
   */
  const handleAllocPctChange = (projectId, newPct) => {
    const base = customAllocs ?? previewAllocs
    if (!base.length) return
    const clamped = Math.max(0, Math.min(100, parseFloat(newPct) || 0))
    const others = base.filter((a) => a.projectId !== projectId)
    const othersTotal = others.reduce((s, a) => s + a.sharePct, 0)
    const remaining = 100 - clamped
    const totalAmt = parseFloat(form.amount) || 0
    const poolAmt = Math.round(totalAmt * (pctBySource.project_pool / 100) * 100) / 100

    const updated = base.map((a) => {
      if (a.projectId === projectId) {
        return {
          ...a,
          sharePct: clamped,
          amountCharged: Math.round(poolAmt * (clamped / 100) * 100) / 100,
        }
      }
      const weight = othersTotal > 0 ? a.sharePct / othersTotal : 1 / others.length
      const pct = Math.round(remaining * weight * 100) / 100
      return {
        ...a,
        sharePct: pct,
        amountCharged: Math.round(poolAmt * (pct / 100) * 100) / 100,
      }
    })
    setCustomAllocs(updated)
  }

  /**
   * Commit the draft ₹ amount for one project, recalculate its %,
   * and redistribute the remaining % proportionally across other projects.
   */
  const handleRecalculate = (projectId) => {
    const base = customAllocs ?? previewAllocs
    if (!base.length) return
    const totalAmt = parseFloat(form.amount) || 0
    const poolAmt = Math.round(totalAmt * (pctBySource.project_pool / 100) * 100) / 100
    if (poolAmt <= 0) return

    const enteredAmt = parseFloat(draftAmounts[projectId] ?? '')
    if (isNaN(enteredAmt)) return

    const clampedAmt = Math.max(0, Math.min(poolAmt, enteredAmt))
    const newPct = Math.round((clampedAmt / poolAmt) * 10000) / 100

    const others = base.filter((a) => a.projectId !== projectId)
    const othersTotal = others.reduce((s, a) => s + a.sharePct, 0)
    const remaining = 100 - newPct

    const updated = base.map((a) => {
      if (a.projectId === projectId) {
        return { ...a, sharePct: newPct, amountCharged: clampedAmt }
      }
      const weight = othersTotal > 0 ? a.sharePct / othersTotal : 1 / others.length
      const pct = Math.round(remaining * weight * 100) / 100
      return { ...a, sharePct: pct, amountCharged: Math.round(poolAmt * (pct / 100) * 100) / 100 }
    })
    setCustomAllocs(updated)
    // Clear the draft for this project so the input shows the committed value
    setDraftAmounts((d) => {
      const next = { ...d }
      delete next[projectId]
      return next
    })
  }

  const handleYearlyPriceChange = (val, isEdit = false) => {
    const yp = parseFloat(val) || 0
    const mc = yp > 0 ? (yp / 12).toFixed(2) : ''
    if (isEdit) {
      setEditForm((f) => ({ ...f, yearly_price: val, amount: mc }))
    } else {
      setForm((f) => ({ ...f, yearly_price: val, amount: mc }))
    }
  }

  const handleMonthlyCutChange = (val, isEdit = false) => {
    const mc = parseFloat(val) || 0
    const yp = mc > 0 ? (mc * 12).toFixed(2) : ''
    if (isEdit) {
      setEditForm((f) => ({ ...f, amount: val, yearly_price: yp }))
    } else {
      setForm((f) => ({ ...f, amount: val, yearly_price: yp }))
    }
  }

  const isSplitValid = () => {
    if (revSources.length < 2) return true
    const sum = revSources.reduce((s, src) => s + (pctBySource[src] || 0), 0)
    return Math.round(sum * 100) / 100 === 100
  }

  const handleAdd = () => {
    if (!form.label || !form.amount) return
    if (!isSplitValid()) return
    const allocsToSave = customAllocs ?? previewAllocs
    addExpense(
      {
        ...form,
        date: form.expenseMonth, // store as YYYY-MM for month-based filtering
        revenue_sources: revSources,
        hr_revenue_pct: pctBySource.hr_revenue,
        lsgb_revenue_pct: pctBySource.lsgb_revenue,
        ...(showAdminShare ? { admin_share_pct: pctBySource.admin_pool } : {}),
        project_pool_pct: pctBySource.project_pool,
        project_allocations: allocsToSave.length > 0 ? allocsToSave : undefined,
      },
      'global',
    )
    resetAddForm()
    setAdding(false)
    reload()
    if (onExpenseChanged) onExpenseChanged()
  }

  const handleRemove = (id) => {
    removeExpense(id)
    reload()
    if (onExpenseChanged) onExpenseChanged()
  }

  const handleEditSave = () => {
    updateExpense(editId, editForm)
    setEditId(null)
    reload()
    if (onExpenseChanged) onExpenseChanged()
  }

  const hasPool = revSources.includes('project_pool')
  const hasAdminShare = revSources.includes('admin_pool')

  return (
    <CCard className="shadow-sm border-top border-4 border-top-success mb-4">
      <CCardHeader className="bg-transparent fw-semibold pt-3 d-flex justify-content-between align-items-center">
        <span>Manage Organization-Wide {poolLabel} Expenses</span>
        <CBadge color="success" shape="rounded-pill">
          {allExpenses.length} Total Expenses
        </CBadge>
      </CCardHeader>
      <CCardBody>
        {adding ? (
          <div className="border rounded p-3 bg-body-secondary mb-4">
            <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#06d6a0',
                  flexShrink: 0,
                }}
              >
                <CIcon icon={cilCheck} style={{ width: 12, height: 12, color: '#fff' }} />
              </span>
              Add New {poolLabel} Expense
            </h6>
            <CRow className="g-2 mb-2">
              <CCol xs={12} md={6}>
                <CFormSelect
                  size="sm"
                  onChange={(e) => handleExpensePick(e.target.value)}
                  defaultValue=""
                >
                  <option value="">— Select an expense (optional) —</option>
                  {expenseDropdownItems.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
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
                  />
                </CInputGroup>
              </CCol>
            </CRow>

            <CRow className="g-2 mb-2">
              <CCol xs={12} md={4}>
                <CFormInput
                  size="sm"
                  placeholder="Bill No (optional)"
                  value={form.bill_no}
                  onChange={(e) => setForm((f) => ({ ...f, bill_no: e.target.value }))}
                />
              </CCol>
            </CRow>

            {/* ── Revenue Source Selector ── */}
            <RevenueSourceSelector
              poolType={poolType}
              poolFundLabel={poolFundLabel}
              revSources={revSources}
              setRevSources={setRevSources}
              pctBySource={pctBySource}
              setPctBySource={setPctBySource}
              totalAmount={form.amount}
              hrRevenueTotal={hrRevenueTotal}
              lsgbAvailable={lsgbAvailable}
              showAdminShare={showAdminShare}
            />

            {/* ── Budget Cap Alerts — always-rendered wrappers prevent layout shift ── */}
            {hasPool && (
              <BudgetCapAlert
                label={poolFundLabel}
                totalAmt={parseFloat(form.amount) || 0}
                poolPortion={
                  Math.round(
                    (parseFloat(form.amount) || 0) * (pctBySource.project_pool / 100) * 100,
                  ) / 100
                }
                budgetSummary={poolBudgetSummary}
              />
            )}
            {hasAdminShare && (
              <BudgetCapAlert
                label="Admin 5% Share"
                totalAmt={parseFloat(form.amount) || 0}
                poolPortion={
                  Math.round(
                    (parseFloat(form.amount) || 0) * (pctBySource.admin_pool / 100) * 100,
                  ) / 100
                }
                budgetSummary={adminPoolBudgetSummary}
              />
            )}

            {/* ── Project Checklist — choose which active projects this expense applies to ── */}
            {hasPool && (
              <div className="mb-3 p-3 rounded border" style={{ fontSize: '0.85rem' }}>
                <div className="fw-semibold mb-2" style={{ fontSize: '0.82rem' }}>
                  Apply to Projects
                </div>
                {activeProjects.length === 0 ? (
                  <div className="text-body-secondary small">No active projects in the pool.</div>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {activeProjects.map((p) => (
                      <div key={p.projectId} className="d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          id={`proj-chk-${poolType}-${p.projectId}`}
                          checked={selectedProjectIds.includes(p.projectId)}
                          onChange={() => toggleSelectedProject(p.projectId)}
                          style={{ width: 15, height: 15, cursor: 'pointer' }}
                        />
                        <label
                          htmlFor={`proj-chk-${poolType}-${p.projectId}`}
                          className="mb-0"
                          style={{ cursor: 'pointer' }}
                        >
                          {p.projectName}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {activeProjects.length > 0 && selectedProjectIds.length === 0 && (
                  <div className="text-danger small mt-2">
                    Select at least one project, or remove {poolFundLabel} as a revenue source.
                  </div>
                )}
              </div>
            )}

            {/* ── Allocation Preview (editable) ── */}
            {hasPool && displayAllocs.length > 0 && (
              <div
                className="mb-3 p-3 rounded bg-success bg-opacity-10 border border-success"
                style={{ fontSize: '0.85rem' }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                  <div className="fw-semibold text-success">
                    Allocation Preview Across Active Projects
                    {revSources.length > 1 && (
                      <span
                        className="text-body-secondary fw-normal ms-2"
                        style={{ fontSize: '0.75rem' }}
                      >
                        ({poolFundLabel} portion: {pctBySource.project_pool}% of total amount)
                      </span>
                    )}
                  </div>
                  {customAllocs && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-warning"
                      style={{ fontSize: '0.73rem', textDecoration: 'underline' }}
                      onClick={() => setCustomAllocs(null)}
                    >
                      ↺ Reset to auto
                    </button>
                  )}
                </div>
                {/* Editable project rows */}
                <div className="d-flex flex-column gap-2">
                  {displayAllocs.map((a) => {
                    const totalPct = displayAllocs.reduce((s, x) => s + x.sharePct, 0)
                    const pctValid = Math.abs(totalPct - 100) < 0.5
                    return (
                      <div
                        key={a.projectId}
                        className="d-flex align-items-center gap-2 bg-body-secondary rounded border px-3 py-2"
                        style={{ fontSize: '0.83rem' }}
                      >
                        {/* Project name + remaining badge */}
                        <div className="d-flex flex-column" style={{ minWidth: 0, flex: '1 1 0' }}>
                          <span className="fw-medium text-truncate" title={a.projectName}>
                            {a.projectName}
                          </span>
                          {(() => {
                            const rem = projectRemainingMap[a.projectId]
                            if (!rem) return null
                            const isOver = rem.remaining < 0
                            const isTight =
                              !isOver &&
                              rem.monthlyBudget > 0 &&
                              rem.remaining < rem.monthlyBudget * 0.2
                            const color = isOver ? '#ff6b6b' : isTight ? '#f4a261' : '#06d6a0'
                            return (
                              <span style={{ fontSize: '0.68rem', color, marginTop: 1 }}>
                                Monthly budget: {fmt(rem.monthlyBudget)} • Remaining:{' '}
                                <strong style={{ color }}>{fmt(rem.remaining)}</strong>
                              </span>
                            )
                          })()}
                        </div>

                        {/* % badge + input */}
                        <div className="d-flex align-items-center gap-1" style={{ flexShrink: 0 }}>
                          <span
                            className="rounded-2 px-2 py-1 fw-bold"
                            style={{
                              background: pctValid
                                ? 'rgba(6,214,160,0.15)'
                                : 'rgba(255,107,107,0.15)',
                              color: pctValid ? '#06d6a0' : '#ff6b6b',
                              fontSize: '0.8rem',
                              minWidth: 54,
                              textAlign: 'center',
                              lineHeight: 1.4,
                            }}
                          >
                            {a.sharePct % 1 === 0 ? a.sharePct : parseFloat(a.sharePct).toFixed(2)}%
                          </span>
                          <CInputGroup size="sm" style={{ width: 80 }}>
                            <CFormInput
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={
                                a.sharePct % 1 === 0
                                  ? a.sharePct
                                  : parseFloat(a.sharePct).toFixed(2)
                              }
                              onChange={(e) => handleAllocPctChange(a.projectId, e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                padding: '3px 6px',
                                fontSize: '0.8rem',
                              }}
                              title="Edit % for this project"
                            />
                            <CInputGroupText style={{ fontSize: '0.75rem', padding: '3px 5px' }}>
                              %
                            </CInputGroupText>
                          </CInputGroup>
                        </div>

                        {/* ₹ Amount input with Recalculate */}
                        {(() => {
                          const draftVal = draftAmounts[a.projectId]
                          const isDraft =
                            draftVal !== undefined && draftVal !== String(a.amountCharged)
                          return (
                            <div
                              className="d-flex align-items-center gap-1"
                              style={{ flexShrink: 0 }}
                            >
                              <CInputGroup size="sm" style={{ width: 130 }}>
                                <CInputGroupText
                                  style={{ fontSize: '0.78rem', padding: '3px 6px' }}
                                >
                                  &#8377;
                                </CInputGroupText>
                                <CFormInput
                                  type="number"
                                  min="0"
                                  value={draftVal !== undefined ? draftVal : a.amountCharged}
                                  onChange={(e) => {
                                    setDraftAmounts((d) => ({
                                      ...d,
                                      [a.projectId]: e.target.value,
                                    }))
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRecalculate(a.projectId)
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  style={{
                                    textAlign: 'right',
                                    fontWeight: 600,
                                    padding: '3px 6px',
                                    fontSize: '0.8rem',
                                    borderColor: isDraft ? '#f4a261' : undefined,
                                  }}
                                  title="Type an amount then click Recalculate"
                                />
                              </CInputGroup>
                              {isDraft && (
                                <CButton
                                  size="sm"
                                  color="warning"
                                  variant="outline"
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '0.72rem',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                  onClick={() => handleRecalculate(a.projectId)}
                                  title="Recalculate distribution based on this amount"
                                >
                                  ↺ Recalc
                                </CButton>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
                {/* Total check */}
                {(() => {
                  const total = displayAllocs.reduce((s, a) => s + a.sharePct, 0)
                  const diff = Math.abs(total - 100)
                  return diff > 0.5 ? (
                    <div className="text-danger small mt-2" style={{ fontSize: '0.73rem' }}>
                      ⚠ Percentages sum to {Math.round(total * 100) / 100}% — must equal 100%
                    </div>
                  ) : (
                    <div className="text-success small mt-2" style={{ fontSize: '0.73rem' }}>
                      ✓ Total: {Math.round(total * 100) / 100}%
                      {customAllocs ? ' (custom weights)' : ' (auto)'}
                    </div>
                  )
                })()}
              </div>
            )}

            {!hasPool && (
              <div
                className="mb-3 p-2 rounded border border-info"
                style={{ background: 'rgba(76,201,240,0.07)', fontSize: '0.8rem' }}
              >
                <span className="text-info">
                  This expense will be fully covered by revenue sources other than {poolFundLabel}—
                  no project allocation will be distributed.
                </span>
              </div>
            )}

            <div className="d-flex gap-2">
              <CButton
                size="sm"
                color="success"
                onClick={handleAdd}
                disabled={
                  !form.label ||
                  !form.amount ||
                  !isSplitValid() ||
                  (hasPool && activeProjects.length > 0 && selectedProjectIds.length === 0) ||
                  (displayAllocs.length > 0 &&
                    Math.abs(displayAllocs.reduce((s, a) => s + a.sharePct, 0) - 100) > 0.5) ||
                  (() => {
                    if (!hasPool) return false
                    const totalAmt = parseFloat(form.amount) || 0
                    const poolPortion =
                      Math.round(totalAmt * (pctBySource.project_pool / 100) * 100) / 100
                    return (
                      poolBudgetSummary.totalMonthlyBudget > 0 &&
                      poolPortion > poolBudgetSummary.remaining
                    )
                  })() ||
                  (() => {
                    if (!hasAdminShare) return false
                    const totalAmt = parseFloat(form.amount) || 0
                    const sharePortion =
                      Math.round(totalAmt * (pctBySource.admin_pool / 100) * 100) / 100
                    return (
                      adminPoolBudgetSummary.totalMonthlyBudget > 0 &&
                      sharePortion > adminPoolBudgetSummary.remaining
                    )
                  })()
                }
              >
                Add &amp; Distribute Expense
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="ghost"
                onClick={() => {
                  setAdding(false)
                  resetAddForm()
                }}
              >
                Cancel
              </CButton>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <CButton
              size="sm"
              color="success"
              onClick={() => setAdding(true)}
              id={`btn-add-${poolType}-expense`}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Add New {poolLabel} Expense
            </CButton>
          </div>
        )}

        {allExpenses.length === 0 ? (
          <div className="text-center text-body-tertiary small py-4 bg-light rounded border border-dashed">
            No {poolLabel} expenses recorded yet.
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
                    <CButton
                      size="sm"
                      color="secondary"
                      variant="ghost"
                      onClick={() => setEditId(null)}
                    >
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
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <span className="fw-semibold fs-6">{exp.label}</span>
                      {/* Revenue source tags — % shown once 2+ sources are tagged */}
                      {(() => {
                        const multi = (exp.revenue_sources?.length || 0) > 1
                        return (
                          <>
                            {exp.revenue_sources?.includes('hr_revenue') && (
                              <CBadge
                                color="info"
                                shape="rounded-pill"
                                style={{ fontSize: '0.65rem' }}
                              >
                                HR Revenue{multi ? ` ${exp.hr_revenue_pct}%` : ''}
                              </CBadge>
                            )}
                            {exp.revenue_sources?.includes('project_pool') && (
                              <CBadge
                                color="success"
                                shape="rounded-pill"
                                style={{ fontSize: '0.65rem' }}
                              >
                                {poolFundLabel}
                                {multi ? ` ${exp.project_pool_pct}%` : ''}
                              </CBadge>
                            )}
                            {exp.revenue_sources?.includes('lsgb_revenue') && (
                              <CBadge
                                color="warning"
                                shape="rounded-pill"
                                style={{ fontSize: '0.65rem' }}
                              >
                                LSGB Revenue{multi ? ` ${exp.lsgb_revenue_pct}%` : ''}
                              </CBadge>
                            )}
                            {exp.revenue_sources?.includes('admin_pool') && (
                              <CBadge
                                color="dark"
                                shape="rounded-pill"
                                style={{ fontSize: '0.65rem' }}
                              >
                                Admin 5% Share{multi ? ` ${exp.admin_share_pct}%` : ''}
                              </CBadge>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <div className="text-body-secondary small mb-1">
                      {fmtDate(exp.date)} {exp.notes && ` · ${exp.notes}`}
                      {exp.bill_no && ` · Bill #${exp.bill_no}`}
                    </div>
                    <div className="text-body-tertiary" style={{ fontSize: '0.8rem' }}>
                      Distributed across{' '}
                      {exp.allocations?.length || exp.project_allocations?.length || 0} active
                      project(s)
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
  )
}

export default ExpensePoolCard
