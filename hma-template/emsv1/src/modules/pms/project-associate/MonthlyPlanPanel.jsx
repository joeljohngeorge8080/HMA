import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CFormSelect,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CButton,
  CAlert,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormCheck,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'
import { localProjects } from '../../../services/localProjects'
import {
  computeWorkingPool,
  monthsInRange,
  computeEffectivePoolMonthly,
  validatePlanTotal,
} from '../../../services/monthlyApportionment'

const PHASE_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'monitoring', label: 'Monitoring' },
]

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const emptyLine = () => ({ phase: 'design', label: '', amount: '' })

const monthLabelShort = (ym) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const BaselineTable = ({ months, baselinePerMonth }) => (
  <div className="mb-3">
    <div style={{ overflowX: 'auto' }}>
      <CTable bordered small align="middle" className="mb-0" style={{ fontSize: '0.8rem' }}>
        <CTableHead color="light">
          <CTableRow>
            {months.map((m) => (
              <CTableHeaderCell key={m} className="text-center text-nowrap">
                {monthLabelShort(m)}
              </CTableHeaderCell>
            ))}
          </CTableRow>
        </CTableHead>
        <CTableBody>
          <CTableRow>
            {months.map((m) => (
              <CTableDataCell key={m} className="text-center text-nowrap">
                {fmt(baselinePerMonth)}
              </CTableDataCell>
            ))}
          </CTableRow>
        </CTableBody>
      </CTable>
    </div>
  </div>
)

BaselineTable.propTypes = {
  months: PropTypes.arrayOf(PropTypes.string).isRequired,
  baselinePerMonth: PropTypes.number.isRequired,
}

const emptyBlock = (months) => ({
  id: null,
  startMonth: months[0] || '',
  endMonth: months[0] || '',
  lines: [emptyLine()],
})

const BlockPlanner = ({ project, onProjectChange, canEdit = false, defaultCollapsed = false }) => {
  const months = monthsInRange(project.start_date, project.end_date)
  const workingPool = computeWorkingPool(project)
  const monthCount = months.length
  const baselinePerMonth = monthCount > 0 ? Math.round((workingPool / monthCount) * 100) / 100 : 0

  const seedBlocks = () =>
    project.plan_blocks?.length
      ? project.plan_blocks.map((b) => ({
          id: b.id,
          startMonth: b.startMonth,
          endMonth: b.endMonth,
          lines: b.phases.map((ph) => ({
            phase: ph.phase,
            label: ph.label,
            amount: String(ph.amount),
          })),
        }))
      : [emptyBlock(months)]

  const [blocks, setBlocks] = useState(seedBlocks)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [error, setError] = useState('')

  const updateBlock = (i, patch) => {
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }
  const updateBlockLine = (i, lineIdx, patch) => {
    setBlocks((prev) =>
      prev.map((b, idx) =>
        idx === i
          ? { ...b, lines: b.lines.map((l, li) => (li === lineIdx ? { ...l, ...patch } : l)) }
          : b,
      ),
    )
  }
  const addBlock = () => setBlocks((prev) => [...prev, emptyBlock(months)])
  const removeBlock = (i) => setBlocks((prev) => prev.filter((_, idx) => idx !== i))
  const addBlockLine = (i) =>
    setBlocks((prev) =>
      prev.map((b, idx) => (idx === i ? { ...b, lines: [...b.lines, emptyLine()] } : b)),
    )
  const removeBlockLine = (i, lineIdx) =>
    setBlocks((prev) =>
      prev.map((b, idx) =>
        idx === i ? { ...b, lines: b.lines.filter((_, li) => li !== lineIdx) } : b,
      ),
    )

  const blockedTotal = blocks.reduce(
    (s, b) => s + b.lines.reduce((s2, l) => s2 + (parseFloat(l.amount) || 0), 0),
    0,
  )

  const handleGenerate = () => {
    setError('')
    try {
      const payload = blocks.map((b) => ({
        id: b.id,
        startMonth: b.startMonth,
        endMonth: b.endMonth,
        phases: b.lines
          .filter((l) => l.label.trim() && parseFloat(l.amount) > 0)
          .map((l) => ({ phase: l.phase, label: l.label.trim(), amount: parseFloat(l.amount) })),
      }))
      const nonEmpty = payload.filter((b) => b.phases.length > 0)
      if (project.monthly_plan?.length) {
        const ok = window.confirm(
          'Regenerating will overwrite all manual month edits made in the table below — continue?',
        )
        if (!ok) return
      }
      const updated = localProjects.generateMonthlyPlan(project.id, nonEmpty)
      onProjectChange(updated)
      setCollapsed(true)
    } catch (e) {
      setError(e.message)
    }
  }

  if (!canEdit) {
    return (
      <CCard className="shadow-sm mb-4">
        <CCardHeader className="bg-transparent fw-semibold pt-3">📅 Plan the Budget</CCardHeader>
        <CCardBody>
          <CAlert color="info" className="mb-0 small">
            You don&apos;t have permission to plan this project&apos;s budget.
          </CAlert>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="shadow-sm mb-4">
      <CCardHeader
        className="bg-transparent fw-semibold pt-3 d-flex justify-content-between align-items-center"
        role="button"
        onClick={() => project.monthly_plan?.length && setCollapsed((c) => !c)}
      >
        <span>📅 Manage Planning Blocks</span>
        {project.monthly_plan?.length > 0 && (
          <CBadge color="secondary">{collapsed ? 'Show' : 'Hide'}</CBadge>
        )}
      </CCardHeader>
      {!collapsed && (
        <CCardBody>
          <div className="text-body-secondary small mb-3">
            Project baseline: <strong>{fmt(workingPool)}</strong> across{' '}
            <strong>{monthCount}</strong> month{monthCount !== 1 ? 's' : ''} — suggestion:{' '}
            <strong>{fmt(baselinePerMonth)}</strong>/month if split evenly. Add one or more planning
            blocks, each covering a range of months with its own phase breakdown — any months you
            don&apos;t cover are filled evenly with what&apos;s left.
          </div>

          {monthCount > 0 && <BaselineTable months={months} baselinePerMonth={baselinePerMonth} />}

          {blocks.map((block, bi) => (
            <CCard key={bi} className="mb-3 border">
              <CCardBody>
                <CRow className="g-2 mb-2 align-items-center">
                  <CCol xs={12} md={5}>
                    <CFormSelect
                      size="sm"
                      value={block.startMonth}
                      onChange={(e) => updateBlock(bi, { startMonth: e.target.value })}
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {monthLabelShort(m)}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={12} md={5}>
                    <CFormSelect
                      size="sm"
                      value={block.endMonth}
                      onChange={(e) => updateBlock(bi, { endMonth: e.target.value })}
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {monthLabelShort(m)}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={12} md={2}>
                    <CButton
                      size="sm"
                      color="danger"
                      variant="ghost"
                      disabled={blocks.length === 1}
                      onClick={() => removeBlock(bi)}
                    >
                      <CIcon icon={cilTrash} className="me-1" />
                      Block
                    </CButton>
                  </CCol>
                </CRow>

                {block.lines.map((line, li) => (
                  <CRow key={li} className="g-2 mb-2 align-items-center">
                    <CCol xs={12} md={3}>
                      <CFormSelect
                        size="sm"
                        value={line.phase}
                        onChange={(e) => updateBlockLine(bi, li, { phase: e.target.value })}
                      >
                        {PHASE_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol xs={12} md={5}>
                      <CFormInput
                        size="sm"
                        placeholder="Task / activity"
                        value={line.label}
                        onChange={(e) => updateBlockLine(bi, li, { label: e.target.value })}
                      />
                    </CCol>
                    <CCol xs={8} md={3}>
                      <CInputGroup size="sm">
                        <CInputGroupText>₹</CInputGroupText>
                        <CFormInput
                          type="number"
                          min="0"
                          value={line.amount}
                          onChange={(e) => updateBlockLine(bi, li, { amount: e.target.value })}
                        />
                      </CInputGroup>
                    </CCol>
                    <CCol xs={4} md={1}>
                      <CButton
                        size="sm"
                        color="danger"
                        variant="ghost"
                        disabled={block.lines.length === 1}
                        onClick={() => removeBlockLine(bi, li)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CCol>
                  </CRow>
                ))}

                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => addBlockLine(bi)}
                >
                  <CIcon icon={cilPlus} className="me-1" />
                  Add Line
                </CButton>
              </CCardBody>
            </CCard>
          ))}

          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            className="mb-3"
            onClick={addBlock}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Add Block
          </CButton>

          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="small text-body-secondary">Blocked total:</span>
            <CBadge color={blockedTotal > 0 ? 'primary' : 'secondary'}>{fmt(blockedTotal)}</CBadge>
            <span className="small text-body-secondary">
              of {fmt(workingPool)} project baseline
            </span>
          </div>

          {error && (
            <CAlert color="danger" className="py-2 small">
              {error}
            </CAlert>
          )}

          <CButton color="success" onClick={handleGenerate}>
            Generate Plan
          </CButton>
        </CCardBody>
      )}
    </CCard>
  )
}

BlockPlanner.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  defaultCollapsed: PropTypes.bool,
}

const monthLabel = (ym) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const POOL_LABELS = { admin: 'Admin', hr: 'HR', core: 'Core' }

const WithdrawModal = ({ visible, onClose, project, month, onProjectChange, currentUser }) => {
  const [pools, setPools] = useState([])
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const togglePool = (pool) =>
    setPools((prev) => (prev.includes(pool) ? prev.filter((p) => p !== pool) : [...prev, pool]))

  const existing = (project.pool_adjustments || []).filter((a) => a.month === month)

  const handleSubmit = () => {
    setError('')
    try {
      const updated = localProjects.addPoolAdjustment(project.id, {
        pools,
        month,
        amount: parseFloat(amount),
        reason,
        createdBy: currentUser,
      })
      onProjectChange(updated)
      setPools([])
      setAmount('')
      setReason('')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRemove = (adjustmentId) => {
    const updated = localProjects.removePoolAdjustment(project.id, adjustmentId)
    onProjectChange(updated)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Withdraw for {monthLabel(month)}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="small text-body-secondary">Split evenly across every pool selected below.</p>
        <div className="d-flex gap-3 mb-3">
          {['admin', 'hr', 'core'].map((pool) => (
            <CFormCheck
              key={pool}
              label={POOL_LABELS[pool]}
              checked={pools.includes(pool)}
              onChange={() => togglePool(pool)}
            />
          ))}
        </div>
        <CInputGroup size="sm" className="mb-2">
          <CInputGroupText>₹</CInputGroupText>
          <CFormInput
            type="number"
            min="0"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </CInputGroup>
        <CFormTextarea
          size="sm"
          placeholder="Reason (required)"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && (
          <CAlert color="danger" className="py-2 small mt-2">
            {error}
          </CAlert>
        )}
        {existing.length > 0 && (
          <div className="mt-3">
            <div className="small fw-semibold mb-1">Existing withdrawals this month</div>
            {existing.map((a) => (
              <div
                key={a.id}
                className="d-flex justify-content-between align-items-center small mb-1"
              >
                <span>
                  {POOL_LABELS[a.pool]} — {fmt(a.amount)} — {a.reason}
                </span>
                <CButton
                  size="sm"
                  color="danger"
                  variant="ghost"
                  onClick={() => handleRemove(a.id)}
                >
                  <CIcon icon={cilTrash} size="sm" />
                </CButton>
              </div>
            ))}
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onClose}>
          Close
        </CButton>
        <CButton color="warning" onClick={handleSubmit}>
          Withdraw
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

WithdrawModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  project: PropTypes.object.isRequired,
  month: PropTypes.string,
  onProjectChange: PropTypes.func.isRequired,
  currentUser: PropTypes.string,
}

const PlanTable = ({
  project,
  onProjectChange,
  canEdit = false,
  canWithdraw = false,
  currentUser = 'Unknown',
}) => {
  const workingPool = computeWorkingPool(project)
  const validation = validatePlanTotal(project.monthly_plan, workingPool)
  const [withdrawMonth, setWithdrawMonth] = useState(null)
  const [saved, setSaved] = useState(false)

  const handleAmountChange = (month, phaseIdx, amount) => {
    const monthEntry = project.monthly_plan.find((m) => m.month === month)
    const phases = monthEntry.phases.map((ph, i) =>
      i === phaseIdx ? { ...ph, amount: parseFloat(amount) || 0 } : ph,
    )
    const { project: updated } = localProjects.updateMonthPlan(project.id, month, phases)
    onProjectChange(updated)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <CCard className="shadow-sm mb-4">
      <CCardHeader className="bg-transparent fw-semibold pt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>📊 Monthly Plan</span>
        <div className="d-flex align-items-center gap-2">
          <CBadge color={validation.valid ? 'success' : 'danger'}>
            {validation.valid
              ? `Balanced — ${fmt(validation.planTotal)}`
              : `Off by ${fmt(Math.abs(validation.diff))} (plan ${fmt(validation.planTotal)} vs baseline ${fmt(validation.workingPool)})`}
          </CBadge>
          <CButton size="sm" color="primary" onClick={handleSave}>
            💾 Save Monthly Plan
          </CButton>
        </div>
      </CCardHeader>
      {saved && (
        <CAlert color="success" className="mb-0 py-2 small rounded-0 text-center">
          ✓ Monthly plan saved
        </CAlert>
      )}
      <CCardBody className="p-0">
        <div style={{ overflowX: 'auto' }}>
          <CTable hover align="middle" className="mb-0" style={{ fontSize: '0.82rem' }}>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Month</CTableHeaderCell>
                <CTableHeaderCell>Phase Breakdown (Project)</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Project Total</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Admin</CTableHeaderCell>
                <CTableHeaderCell className="text-end">HR</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Core</CTableHeaderCell>
                {canWithdraw && (
                  <CTableHeaderCell className="text-center">Withdraw</CTableHeaderCell>
                )}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {project.monthly_plan.map((m) => {
                const adjustedFor = (pool) =>
                  (project.pool_adjustments || []).some(
                    (a) => a.pool === pool && a.month === m.month,
                  )
                return (
                  <CTableRow key={m.month}>
                    <CTableDataCell className="fw-semibold">{monthLabel(m.month)}</CTableDataCell>
                    <CTableDataCell>
                      {m.phases.map((ph, i) => (
                        <div key={i} className="d-flex align-items-center gap-2 mb-1">
                          <CBadge
                            color="secondary"
                            shape="rounded-pill"
                            style={{ fontSize: '0.65rem' }}
                          >
                            {ph.phase}
                          </CBadge>
                          <span className="text-body-secondary">{ph.label}</span>
                          <CInputGroup size="sm" style={{ maxWidth: 130 }}>
                            <CInputGroupText>₹</CInputGroupText>
                            <CFormInput
                              type="number"
                              min="0"
                              value={ph.amount}
                              disabled={!canEdit}
                              onChange={(e) => handleAmountChange(m.month, i, e.target.value)}
                            />
                          </CInputGroup>
                        </div>
                      ))}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold">{fmt(m.total)}</CTableDataCell>
                    {['admin', 'hr', 'core'].map((pool) => (
                      <CTableDataCell key={pool} className="text-end">
                        {fmt(computeEffectivePoolMonthly(project, pool, m.month))}
                        {adjustedFor(pool) && (
                          <CBadge
                            color="warning"
                            shape="rounded-pill"
                            className="ms-1"
                            style={{ fontSize: '0.6rem' }}
                          >
                            adjusted
                          </CBadge>
                        )}
                      </CTableDataCell>
                    ))}
                    {canWithdraw && (
                      <CTableDataCell className="text-center">
                        <CButton
                          size="sm"
                          color="warning"
                          variant="ghost"
                          onClick={() => setWithdrawMonth(m.month)}
                        >
                          Withdraw
                        </CButton>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
      {canWithdraw && (
        <WithdrawModal
          visible={Boolean(withdrawMonth)}
          onClose={() => setWithdrawMonth(null)}
          project={project}
          month={withdrawMonth}
          onProjectChange={onProjectChange}
          currentUser={currentUser}
        />
      )}
    </CCard>
  )
}

PlanTable.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  canWithdraw: PropTypes.bool,
  currentUser: PropTypes.string,
}

const MonthlyPlanPanel = ({
  project,
  onProjectChange,
  canEdit = false,
  canWithdraw = false,
  currentUser = 'Unknown',
}) => {
  const hasPlan = Boolean(project.monthly_plan?.length)
  return (
    <>
      <BlockPlanner
        project={project}
        onProjectChange={onProjectChange}
        canEdit={canEdit}
        defaultCollapsed={hasPlan}
      />
      {hasPlan && (
        <PlanTable
          project={project}
          onProjectChange={onProjectChange}
          canEdit={canEdit}
          canWithdraw={canWithdraw}
          currentUser={currentUser}
        />
      )}
    </>
  )
}

MonthlyPlanPanel.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  canWithdraw: PropTypes.bool,
  currentUser: PropTypes.string,
}

export default MonthlyPlanPanel
