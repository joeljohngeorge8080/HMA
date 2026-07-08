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

const RevenueSourceSelector = ({
  poolType,
  poolFundLabel,
  revSources,
  setRevSources,
  hrRevPct,
  setHrRevPct,
  projPoolPct,
  setProjPoolPct,
  totalAmount,
  hrRevenueTotal,
}) => {
  const hasHR = revSources.includes('hr_revenue')
  const hasPool = revSources.includes('project_pool')
  const bothSelected = hasHR && hasPool
  const total = parseFloat(totalAmount) || 0

  const toggle = (src) => {
    setRevSources((prev) => {
      if (prev.includes(src)) {
        const next = prev.filter((s) => s !== src)
        if (src === 'hr_revenue') {
          setHrRevPct(0)
          setProjPoolPct(100)
        }
        if (src === 'project_pool') {
          setProjPoolPct(0)
          setHrRevPct(100)
        }
        return next.length > 0 ? next : ['project_pool']
      }
      const next = [...prev, src]
      if (next.includes('hr_revenue') && next.includes('project_pool')) {
        setHrRevPct(50)
        setProjPoolPct(50)
      }
      return next
    })
  }

  // Change handlers — by % or by ₹ amount
  const handleHrPctChange = (val) => {
    const v = Math.max(0, Math.min(100, parseFloat(val) || 0))
    setHrRevPct(v)
    setProjPoolPct(Math.round((100 - v) * 100) / 100)
  }
  const handleHrAmtChange = (val) => {
    if (total <= 0) return
    const amt = Math.max(0, Math.min(total, parseFloat(val) || 0))
    const pct = Math.round((amt / total) * 10000) / 100
    setHrRevPct(pct)
    setProjPoolPct(Math.round((100 - pct) * 100) / 100)
  }
  const handlePoolPctChange = (val) => {
    const v = Math.max(0, Math.min(100, parseFloat(val) || 0))
    setProjPoolPct(v)
    setHrRevPct(Math.round((100 - v) * 100) / 100)
  }
  const handlePoolAmtChange = (val) => {
    if (total <= 0) return
    const amt = Math.max(0, Math.min(total, parseFloat(val) || 0))
    const pct = Math.round((amt / total) * 10000) / 100
    setProjPoolPct(pct)
    setHrRevPct(Math.round((100 - pct) * 100) / 100)
  }

  const hrAmt = total > 0 ? Math.round(total * (hrRevPct / 100) * 100) / 100 : 0
  const poolAmt = total > 0 ? Math.round(total * (projPoolPct / 100) * 100) / 100 : 0
  const totalPct = Math.round((hrRevPct + projPoolPct) * 100) / 100
  const pctValid = !bothSelected || totalPct === 100

  const rowStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '10px 14px',
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
        {/* ─ HR Revenue row ─ */}
        <div style={rowStyle}>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="checkbox"
              id={`rev-hr-${poolType}`}
              checked={hasHR}
              onChange={() => toggle('hr_revenue')}
              style={{
                accentColor: '#4cc9f0',
                width: 15,
                height: 15,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
            <label
              htmlFor={`rev-hr-${poolType}`}
              className="mb-0 fw-semibold"
              style={{ cursor: 'pointer', color: '#4cc9f0', minWidth: 96 }}
            >
              HR Revenue
            </label>
            {hasHR && bothSelected && (
              <>
                {/* % field */}
                <CInputGroup size="sm" style={{ width: 90 }}>
                  <CFormInput
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={hrRevPct}
                    onChange={(e) => handleHrPctChange(e.target.value)}
                    style={{ textAlign: 'right', fontWeight: 600 }}
                  />
                  <CInputGroupText style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    %
                  </CInputGroupText>
                </CInputGroup>
                {/* ₹ amount field */}
                <CInputGroup size="sm" style={{ width: 120 }}>
                  <CInputGroupText style={{ fontSize: '0.8rem' }}>&#8377;</CInputGroupText>
                  <CFormInput
                    type="number"
                    min="0"
                    value={hrAmt || ''}
                    placeholder="Amount"
                    onChange={(e) => handleHrAmtChange(e.target.value)}
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
            {hasHR && !bothSelected && total > 0 && (
              <span className="text-body-secondary ms-auto" style={{ fontSize: '0.78rem' }}>
                100% — {fmt(total)}
              </span>
            )}
          </div>
          {hasHR &&
            (() => {
              const drawn = bothSelected ? hrAmt : total
              const remaining = (hrRevenueTotal || 0) - drawn
              const isOver = remaining < 0
              return (
                <div
                  className={`small mt-1 ${isOver ? 'text-danger fw-semibold' : 'text-body-secondary'}`}
                  style={{ fontSize: '0.74rem' }}
                >
                  Available: {fmt(hrRevenueTotal || 0)} &nbsp;−{fmt(drawn)} this expense
                  &nbsp;→&nbsp;
                  {fmt(remaining)} remaining
                </div>
              )
            })()}
        </div>

        {/* ─ Project Pool row ─ */}
        <div style={rowStyle}>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="checkbox"
              id={`rev-pool-${poolType}`}
              checked={hasPool}
              onChange={() => toggle('project_pool')}
              style={{
                accentColor: '#06d6a0',
                width: 15,
                height: 15,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
            <label
              htmlFor={`rev-pool-${poolType}`}
              className="mb-0 fw-semibold"
              style={{ cursor: 'pointer', color: '#06d6a0', minWidth: 96 }}
            >
              {poolFundLabel}
            </label>
            {hasPool && bothSelected && (
              <>
                <CInputGroup size="sm" style={{ width: 90 }}>
                  <CFormInput
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={projPoolPct}
                    onChange={(e) => handlePoolPctChange(e.target.value)}
                    style={{ textAlign: 'right', fontWeight: 600 }}
                  />
                  <CInputGroupText style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    %
                  </CInputGroupText>
                </CInputGroup>
                <CInputGroup size="sm" style={{ width: 120 }}>
                  <CInputGroupText style={{ fontSize: '0.8rem' }}>&#8377;</CInputGroupText>
                  <CFormInput
                    type="number"
                    min="0"
                    value={poolAmt || ''}
                    placeholder="Amount"
                    onChange={(e) => handlePoolAmtChange(e.target.value)}
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
            {hasPool && !bothSelected && total > 0 && (
              <span className="text-body-secondary ms-auto" style={{ fontSize: '0.78rem' }}>
                100% — {fmt(total)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation message */}
      {bothSelected && (
        <div
          className={`small mt-2 d-flex align-items-center gap-2 ${pctValid ? 'text-success' : 'text-danger'}`}
          style={{ fontSize: '0.74rem' }}
        >
          {pctValid ? (
            <>
              <CIcon icon={cilCheck} style={{ width: 12, height: 12 }} />
              Percentages sum to 100% — HR Revenue: {hrRevPct}% · Project Pool: {projPoolPct}%
            </>
          ) : (
            <>&#9888; Percentages must sum to 100% (currently {totalPct}%)</>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Expense Pool Card (shared HR / Admin expense-adding card) ────────────────

const ExpensePoolCard = ({
  poolType,
  poolLabel,
  poolFundLabel,
  hrRevenueTotal,
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
  const [hrRevPct, setHrRevPct] = useState(0)
  const [projPoolPct, setProjPoolPct] = useState(100)

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
  const [projectRemainingMap, setProjectRemainingMap] = useState({})

  const reload = () => {
    setAllExpenses(getExpenses())
    const ap = getActiveProjects()
    setActiveProjects(ap)
    setSelectedProjectIds(ap.map((p) => p.projectId))
    setPoolBudgetSummary(getPoolBudgetSummary())
    setProjectRemainingMap(getProjectsMonthlyRemaining())
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
    setHrRevPct(0)
    setProjPoolPct(100)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.expenseMonth, allExpenses])

  // Live allocation preview — recomputes whenever amount, pool%, or source changes
  useEffect(() => {
    const amt = parseFloat(form.amount) || 0
    const hasPool = revSources.includes('project_pool')
    if (amt > 0 && hasPool) {
      const poolAmt = Math.round(amt * (projPoolPct / 100) * 100) / 100
      const computed = localOrgPool.computeAllocations(poolType, poolAmt, selectedProjectIds)
      setPreviewAllocs(computed)
      setCustomAllocs(null) // reset custom overrides when base changes
      setDraftAmounts({}) // clear drafts when base recalculates
    } else {
      setPreviewAllocs([])
      setCustomAllocs(null)
      setDraftAmounts({})
    }
  }, [form.amount, projPoolPct, revSources, selectedProjectIds, poolType])

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
    const poolAmt = Math.round(totalAmt * (projPoolPct / 100) * 100) / 100

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
    const poolAmt = Math.round(totalAmt * (projPoolPct / 100) * 100) / 100
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
    const hasHR = revSources.includes('hr_revenue')
    const hasPool = revSources.includes('project_pool')
    if (hasHR && hasPool) {
      return Math.round((hrRevPct + projPoolPct) * 100) / 100 === 100
    }
    return true
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
        hr_revenue_pct: hrRevPct,
        project_pool_pct: projPoolPct,
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
              hrRevPct={hrRevPct}
              setHrRevPct={setHrRevPct}
              projPoolPct={projPoolPct}
              setProjPoolPct={setProjPoolPct}
              totalAmount={form.amount}
              hrRevenueTotal={hrRevenueTotal}
            />

            {/* ── Budget Cap Alert — always-rendered wrapper prevents layout shift ── */}
            {hasPool &&
              (() => {
                const totalAmt = parseFloat(form.amount) || 0
                const poolPortion = Math.round(totalAmt * (projPoolPct / 100) * 100) / 100
                const { totalMonthlyBudget, usedThisMonth, remaining } = poolBudgetSummary

                if (totalAmt <= 0 || totalMonthlyBudget <= 0)
                  return <div className="mb-3" style={{ minHeight: 0 }} />

                const overage = Math.round((poolPortion - remaining) * 100) / 100
                const pctUsed = Math.round((poolPortion / totalMonthlyBudget) * 100)
                const isOver = overage > 0
                const isWarn = !isOver && poolPortion >= remaining * 0.8

                if (!isOver && !isWarn) return <div className="mb-3" style={{ minHeight: 0 }} />

                if (!isOver)
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
                        <strong>{fmt(remaining)}</strong> remaining monthly pool budget ({pctUsed}
                        %).
                      </span>
                    </div>
                  )

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
                      Project Pool budget exceeded for this month
                    </div>
                    <div
                      className="d-flex flex-wrap gap-3 mt-1"
                      style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.75)' }}
                    >
                      <span>
                        Monthly budget:{' '}
                        <strong className="text-body">{fmt(totalMonthlyBudget)}</strong>
                      </span>
                      <span>
                        Already used: <strong className="text-body">{fmt(usedThisMonth)}</strong>
                      </span>
                      <span>
                        Remaining: <strong className="text-warning">{fmt(remaining)}</strong>
                      </span>
                      <span>
                        This expense (pool portion):{' '}
                        <strong className="text-danger">{fmt(poolPortion)}</strong>
                      </span>
                      <span>
                        Overage: <strong className="text-danger">+{fmt(overage)}</strong>
                      </span>
                    </div>
                    <div className="mt-2 small text-body-secondary" style={{ fontSize: '0.73rem' }}>
                      Reduce the expense amount, reduce the {poolFundLabel} %, or route more to HR
                      Revenue to stay within budget.
                    </div>
                  </div>
                )
              })()}

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
                    {revSources.includes('hr_revenue') && revSources.includes('project_pool') && (
                      <span
                        className="text-body-secondary fw-normal ms-2"
                        style={{ fontSize: '0.75rem' }}
                      >
                        ({poolFundLabel} portion: {projPoolPct}% of total amount)
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
                  This expense will be fully covered by HR Revenue — no project allocation will be
                  distributed.
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
                    const poolPortion = Math.round(totalAmt * (projPoolPct / 100) * 100) / 100
                    return (
                      poolBudgetSummary.totalMonthlyBudget > 0 &&
                      poolPortion > poolBudgetSummary.remaining
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
                      {/* Revenue source tags */}
                      {exp.revenue_sources?.includes('hr_revenue') && (
                        <CBadge color="info" shape="rounded-pill" style={{ fontSize: '0.65rem' }}>
                          HR Revenue
                          {exp.revenue_sources?.includes('project_pool')
                            ? ` ${exp.hr_revenue_pct}%`
                            : ''}
                        </CBadge>
                      )}
                      {exp.revenue_sources?.includes('project_pool') && (
                        <CBadge
                          color="success"
                          shape="rounded-pill"
                          style={{ fontSize: '0.65rem' }}
                        >
                          {poolFundLabel}
                          {exp.revenue_sources?.includes('hr_revenue')
                            ? ` ${exp.project_pool_pct}%`
                            : ''}
                        </CBadge>
                      )}
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
