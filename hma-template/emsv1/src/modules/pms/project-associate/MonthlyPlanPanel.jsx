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
import { cilPlus, cilTrash, cilArrowThickTop, cilArrowThickBottom } from '@coreui/icons'
import { localProjects } from '../../../services/localProjects'
import {
  computeWorkingPool,
  monthsInRange,
  computeFlatMonthlyRate,
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

const PctStepper = ({ value, onChange, disabled = false }) => (
  <div className="d-flex align-items-center gap-1">
    <CButton
      size="sm"
      color="secondary"
      variant="ghost"
      style={{ padding: '2px 6px' }}
      disabled={disabled}
      onClick={() => onChange(Math.max(0, Math.round((value - 0.5) * 10) / 10))}
    >
      <CIcon icon={cilArrowThickBottom} size="sm" />
    </CButton>
    <span className="fw-semibold" style={{ minWidth: 40, textAlign: 'center' }}>
      {value}%
    </span>
    <CButton
      size="sm"
      color="secondary"
      variant="ghost"
      style={{ padding: '2px 6px' }}
      disabled={disabled}
      onClick={() => onChange(Math.round((value + 0.5) * 10) / 10)}
    >
      <CIcon icon={cilArrowThickTop} size="sm" />
    </CButton>
  </div>
)

PctStepper.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

const PlanTable = ({ project, onProjectChange, canEdit = false }) => {
  const workingPool = computeWorkingPool(project)
  const validation = validatePlanTotal(project.monthly_plan, workingPool)

  const handlePctChange = (month, patch) => {
    const updated = localProjects.updateMonthPct(project.id, month, patch)
    onProjectChange(updated)
  }

  const handleAmountChange = (month, phaseIdx, amount) => {
    const monthEntry = project.monthly_plan.find((m) => m.month === month)
    const phases = monthEntry.phases.map((ph, i) =>
      i === phaseIdx ? { ...ph, amount: parseFloat(amount) || 0 } : ph,
    )
    const { project: updated } = localProjects.updateMonthPlan(project.id, month, phases)
    onProjectChange(updated)
  }

  return (
    <CCard className="shadow-sm mb-4">
      <CCardHeader className="bg-transparent fw-semibold pt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>📊 Monthly Plan</span>
        <CBadge color={validation.valid ? 'success' : 'danger'}>
          {validation.valid
            ? `Balanced — ${fmt(validation.planTotal)}`
            : `Off by ${fmt(Math.abs(validation.diff))} (plan ${fmt(validation.planTotal)} vs pool ${fmt(validation.workingPool)})`}
        </CBadge>
      </CCardHeader>
      <CCardBody className="p-0">
        <div style={{ overflowX: 'auto' }}>
          <CTable hover align="middle" className="mb-0" style={{ fontSize: '0.82rem' }}>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Month</CTableHeaderCell>
                <CTableHeaderCell>Phase Breakdown</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                <CTableHeaderCell className="text-center">HR %</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Core %</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Project / HR / Core</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {project.monthly_plan.map((m) => {
                const split = computeMonthSplit(m)
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
                    <CTableDataCell className="text-center">
                      <PctStepper
                        value={m.hr_pct}
                        onChange={(v) => handlePctChange(m.month, { hr_pct: v })}
                        disabled={!canEdit}
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <PctStepper
                        value={m.core_pct}
                        onChange={(v) => handlePctChange(m.month, { core_pct: v })}
                        disabled={!canEdit}
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <div className="text-primary">{fmt(split.projectAmount)}</div>
                      <div className="text-info">{fmt(split.hrAmount)}</div>
                      <div className="text-danger">{fmt(split.coreAmount)}</div>
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  )
}

PlanTable.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
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
