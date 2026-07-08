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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'
import { localProjects } from '../../../services/localProjects'
import { localProjectExpenses } from '../../../services/localProjectExpenses'
import { localTasks } from '../../../services/localTasks'
import {
  computeWorkingPool,
  monthsInRange,
  computeEffectivePoolMonthly,
  computeEffectivePoolPct,
  computeEffectiveProjectMonthly,
  sumManualPoolAdjustments,
  validatePlanTotalWithCascade,
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

const emptyMonthEntry = (month) => ({ month, lines: [emptyLine()] })

/**
 * Seeds one entry per project month from project.plan_blocks (each block's
 * month range expanded and its lines applied to every month it covers,
 * cloned per month so they're independently editable), or an empty line
 * for any month not covered by a saved block.
 */
const seedMonthEntries = (months, planBlocks) => {
  const linesByMonth = {}
  ;(planBlocks || []).forEach((b) => {
    const covered = monthsInRange(b.startMonth, b.endMonth)
    const lines = b.phases.map((ph) => ({
      phase: ph.phase,
      label: ph.label,
      amount: String(ph.amount),
    }))
    covered.forEach((m) => {
      linesByMonth[m] = lines
    })
  })
  return months.map((m) =>
    linesByMonth[m]
      ? { month: m, lines: linesByMonth[m].map((l) => ({ ...l })) }
      : emptyMonthEntry(m),
  )
}

const MonthAccordion = ({
  project,
  onProjectChange,
  canEdit = false,
  defaultCollapsed = false,
}) => {
  const months = monthsInRange(project.start_date, project.end_date)
  const workingPool = computeWorkingPool(project)
  const monthCount = months.length
  const baselinePerMonth = monthCount > 0 ? Math.round((workingPool / monthCount) * 100) / 100 : 0

  const [monthEntries, setMonthEntries] = useState(() =>
    seedMonthEntries(months, project.plan_blocks),
  )
  const [expandedMonth, setExpandedMonth] = useState(null)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [error, setError] = useState('')
  const [hasAutoReplicated, setHasAutoReplicated] = useState(() =>
    Boolean(project.plan_blocks?.length),
  )

  const isUntouched = (entry) => entry.lines.every((l) => !l.label.trim() && !l.amount)

  const updateLine = (month, lineIdx, patch) => {
    setMonthEntries((prev) => {
      const next = prev.map((e) =>
        e.month === month
          ? { ...e, lines: e.lines.map((l, li) => (li === lineIdx ? { ...l, ...patch } : l)) }
          : e,
      )
      if (hasAutoReplicated) return next
      const editedEntry = next.find((e) => e.month === month)
      const hasValidLine = editedEntry.lines.some((l) => l.label.trim() && parseFloat(l.amount) > 0)
      if (!hasValidLine) return next
      setHasAutoReplicated(true)
      return next.map((e) =>
        e.month === month || !isUntouched(e)
          ? e
          : { ...e, lines: editedEntry.lines.map((l) => ({ ...l })) },
      )
    })
  }
  const addLine = (month) => {
    setMonthEntries((prev) =>
      prev.map((e) => (e.month === month ? { ...e, lines: [...e.lines, emptyLine()] } : e)),
    )
  }
  const removeLine = (month, lineIdx) => {
    setMonthEntries((prev) =>
      prev.map((e) =>
        e.month === month ? { ...e, lines: e.lines.filter((_, li) => li !== lineIdx) } : e,
      ),
    )
  }
  const copyToAllMonths = (month) => {
    const source = monthEntries.find((e) => e.month === month)
    if (!source) return
    setMonthEntries((prev) =>
      prev.map((e) =>
        e.month === month ? e : { ...e, lines: source.lines.map((l) => ({ ...l })) },
      ),
    )
  }

  const monthTotal = (entry) => entry.lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const grandTotal = monthEntries.reduce((s, e) => s + monthTotal(e), 0)

  const handleGenerate = () => {
    setError('')
    try {
      const blocks = monthEntries
        .map((e) => ({
          startMonth: e.month,
          endMonth: e.month,
          phases: e.lines
            .filter((l) => l.label.trim() && parseFloat(l.amount) > 0)
            .map((l) => ({ phase: l.phase, label: l.label.trim(), amount: parseFloat(l.amount) })),
        }))
        .filter((b) => b.phases.length > 0)
      if (project.monthly_plan?.length) {
        const ok = window.confirm(
          'Regenerating will overwrite all manual month edits made in the table below — continue?',
        )
        if (!ok) return
      }
      const updated = localProjects.generateMonthlyPlan(project.id, blocks)
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
        <span>📅 Plan the Budget by Month</span>
        {project.monthly_plan?.length > 0 && (
          <CBadge color="secondary">{collapsed ? 'Show' : 'Hide'}</CBadge>
        )}
      </CCardHeader>
      {!collapsed && (
        <CCardBody>
          <div className="text-body-secondary small mb-3">
            Project baseline: <strong>{fmt(workingPool)}</strong> across{' '}
            <strong>{monthCount}</strong> month{monthCount !== 1 ? 's' : ''} — suggestion:{' '}
            <strong>{fmt(baselinePerMonth)}</strong>/month if split evenly. Click a month to plan it
            — the first month you fill in is copied to every other empty month automatically as a
            starting point, and every month stays independently editable after that (use &quot;Copy
            to all months&quot; any time to re-sync manually). Months you leave empty are filled
            evenly with what&apos;s left when you Generate.
          </div>

          {monthCount > 0 && <BaselineTable months={months} baselinePerMonth={baselinePerMonth} />}

          {monthEntries.map((entry) => {
            const isOpen = expandedMonth === entry.month
            return (
              <CCard key={entry.month} className="mb-2 border">
                <CCardHeader
                  className="d-flex justify-content-between align-items-center py-2"
                  role="button"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedMonth(isOpen ? null : entry.month)}
                >
                  <span className="fw-semibold small">{monthLabelShort(entry.month)}</span>
                  <div className="d-flex align-items-center gap-2">
                    <CBadge color={monthTotal(entry) > 0 ? 'primary' : 'secondary'}>
                      {fmt(monthTotal(entry))}
                    </CBadge>
                    <CBadge color="secondary">{isOpen ? 'Hide' : 'Show'}</CBadge>
                  </div>
                </CCardHeader>
                {isOpen && (
                  <CCardBody>
                    {entry.lines.map((line, li) => (
                      <CRow key={li} className="g-2 mb-2 align-items-center">
                        <CCol xs={12} md={3}>
                          <CFormSelect
                            size="sm"
                            value={line.phase}
                            onChange={(e) => updateLine(entry.month, li, { phase: e.target.value })}
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
                            onChange={(e) => updateLine(entry.month, li, { label: e.target.value })}
                          />
                        </CCol>
                        <CCol xs={8} md={3}>
                          <CInputGroup size="sm">
                            <CInputGroupText>₹</CInputGroupText>
                            <CFormInput
                              type="number"
                              min="0"
                              value={line.amount}
                              onChange={(e) =>
                                updateLine(entry.month, li, { amount: e.target.value })
                              }
                            />
                          </CInputGroup>
                        </CCol>
                        <CCol xs={4} md={1}>
                          <CButton
                            size="sm"
                            color="danger"
                            variant="ghost"
                            disabled={entry.lines.length === 1}
                            onClick={() => removeLine(entry.month, li)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CCol>
                      </CRow>
                    ))}

                    <div className="d-flex gap-2">
                      <CButton
                        size="sm"
                        color="secondary"
                        variant="outline"
                        onClick={() => addLine(entry.month)}
                      >
                        <CIcon icon={cilPlus} className="me-1" />
                        Add Line
                      </CButton>
                      <CButton
                        size="sm"
                        color="info"
                        variant="outline"
                        onClick={() => copyToAllMonths(entry.month)}
                      >
                        📋 Copy to all months
                      </CButton>
                    </div>
                  </CCardBody>
                )}
              </CCard>
            )
          })}

          <div className="d-flex align-items-center gap-2 mb-3 mt-2">
            <span className="small text-body-secondary">Planned total:</span>
            <CBadge color={grandTotal > 0 ? 'primary' : 'secondary'}>{fmt(grandTotal)}</CBadge>
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

MonthAccordion.propTypes = {
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

const emptyRecurringTask = () => ({ id: Date.now() + Math.random(), phase: 'design', label: '', totalAmount: '' })

const RecurringTasksSection = ({ project, onProjectChange, canEdit, monthCount, months }) => {
  const [tasks, setTasks] = useState([])
  const [applied, setApplied] = useState(false)
  const [taskError, setTaskError] = useState('')

  const addTask = () => setTasks((prev) => [...prev, emptyRecurringTask()])
  const removeTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id))
  const updateTask = (id, patch) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const validTasks = tasks.filter((t) => t.label.trim() && parseFloat(t.totalAmount) > 0)
  const totalBudget = validTasks.reduce((s, t) => s + (parseFloat(t.totalAmount) || 0), 0)
  const perMonth = monthCount > 0 ? totalBudget / monthCount : 0

  const handleApply = () => {
    setTaskError('')
    if (!validTasks.length) {
      setTaskError('Add at least one task with a label and amount before applying.')
      return
    }
    let updated = project
    months.forEach((month) => {
      const existing = updated.monthly_plan.find((m) => m.month === month)
      const existingPhases = existing ? existing.phases.filter(
        (ph) => !validTasks.some((t) => t.label.trim() === ph.label && t.phase === ph.phase)
      ) : []
      const newPhases = [
        ...existingPhases,
        ...validTasks.map((t) => ({
          phase: t.phase,
          label: t.label.trim(),
          amount: Math.round((parseFloat(t.totalAmount) / monthCount) * 100) / 100,
        })),
      ]
      const result = localProjects.updateMonthPlan(updated.id, month, newPhases)
      updated = result.project
    })
    onProjectChange(updated)
    setApplied(true)
    setTimeout(() => setApplied(false), 3000)
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1a2e 100%)',
        borderRadius: 14,
        padding: '20px 24px 16px',
        marginBottom: 20,
        border: '1px solid rgba(99,179,237,0.18)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 2px 12px rgba(59,130,246,0.4)',
          }}>🔁</div>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.01em' }}>
              Recurring Tasks
            </div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 1 }}>
              Enter tasks to divide equally across {monthCount} month{monthCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalBudget > 0 && (
            <div style={{
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', color: '#93c5fd',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: '#64748b' }}>Total</span>
              <span style={{ fontWeight: 700 }}>{fmt(totalBudget)}</span>
              <span style={{ color: '#475569' }}>·</span>
              <span style={{ color: '#64748b' }}>Per month</span>
              <span style={{ fontWeight: 700, color: '#60a5fa' }}>{fmt(perMonth)}</span>
            </div>
          )}
          {canEdit && (
            <button
              onClick={addTask}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none', borderRadius: 8, padding: '6px 14px',
                color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '18px 0 10px',
          color: '#334155', fontSize: '0.8rem',
          border: '1.5px dashed rgba(71,85,105,0.4)', borderRadius: 10,
        }}>
          <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.5 }}>📋</div>
          No recurring tasks yet.{canEdit ? ' Click \'Add Task\' to get started.' : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '9px 12px',
                animation: 'fadeSlideIn 0.2s ease',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', color: '#a5b4fc', fontWeight: 700, flexShrink: 0,
              }}>{idx + 1}</div>
              <select
                value={task.phase}
                disabled={!canEdit}
                onChange={(e) => updateTask(task.id, { phase: e.target.value })}
                style={{
                  background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(71,85,105,0.5)',
                  borderRadius: 7, padding: '4px 8px', color: '#cbd5e1',
                  fontSize: '0.78rem', cursor: canEdit ? 'pointer' : 'default', flexShrink: 0,
                  outline: 'none',
                }}
              >
                {PHASE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Task / activity name"
                value={task.label}
                disabled={!canEdit}
                onChange={(e) => updateTask(task.id, { label: e.target.value })}
                style={{
                  flex: 1, background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(71,85,105,0.5)', borderRadius: 7,
                  padding: '4px 10px', color: '#e2e8f0', fontSize: '0.82rem',
                  outline: 'none', minWidth: 0,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                <div style={{
                  background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(71,85,105,0.5)',
                  borderLeft: 'none', borderRadius: '7px 0 0 7px',
                  padding: '4px 8px', color: '#64748b', fontSize: '0.82rem',
                  borderRight: 'none',
                  display: 'flex', alignItems: 'center',
                }}>₹</div>
                <input
                  type="number"
                  min="0"
                  placeholder="Total budget"
                  value={task.totalAmount}
                  disabled={!canEdit}
                  onChange={(e) => updateTask(task.id, { totalAmount: e.target.value })}
                  style={{
                    width: 110, background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(71,85,105,0.5)',
                    borderLeft: '1px solid rgba(71,85,105,0.5)',
                    borderRadius: '0 7px 7px 0',
                    padding: '4px 10px', color: '#e2e8f0', fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>
              {parseFloat(task.totalAmount) > 0 && monthCount > 0 && (
                <div style={{
                  flexShrink: 0, fontSize: '0.72rem', color: '#60a5fa',
                  background: 'rgba(59,130,246,0.12)', borderRadius: 6,
                  padding: '3px 8px', whiteSpace: 'nowrap',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}>
                  {fmt(parseFloat(task.totalAmount) / monthCount)}/mo
                </div>
              )}
              {canEdit && (
                <button
                  onClick={() => removeTask(task.id)}
                  style={{
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 7, width: 28, height: 28, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#f87171', cursor: 'pointer', flexShrink: 0,
                    transition: 'all 0.15s', fontSize: 14,
                  }}
                  title="Remove task"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer: error + apply button */}
      {(taskError || (canEdit && tasks.length > 0)) && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {taskError && (
            <div style={{
              flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '6px 12px', color: '#fca5a5', fontSize: '0.78rem',
            }}>⚠️ {taskError}</div>
          )}
          {applied && (
            <div style={{
              flex: 1, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 8, padding: '6px 12px', color: '#86efac', fontSize: '0.78rem',
            }}>✓ Tasks distributed across all {monthCount} months</div>
          )}
          {canEdit && validTasks.length > 0 && (
            <button
              onClick={handleApply}
              style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                border: 'none', borderRadius: 9, padding: '8px 18px',
                color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: '0 2px 12px rgba(5,150,105,0.35)',
                marginLeft: 'auto',
                transition: 'all 0.2s',
              }}
            >
              <span>⚡</span>
              Apply — divide equally across {monthCount} month{monthCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

RecurringTasksSection.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  monthCount: PropTypes.number.isRequired,
  months: PropTypes.arrayOf(PropTypes.string).isRequired,
}

const PlanTable = ({ project, onProjectChange, canEdit = false, currentUser = 'Unknown' }) => {
  const workingPool = computeWorkingPool(project)
  const validation = validatePlanTotalWithCascade(
    project.monthly_plan,
    workingPool,
    project.pool_adjustments,
  )
  const [saved, setSaved] = useState(false)
  const months = monthsInRange(project.start_date, project.end_date)
  const monthCount = months.length

  const handleAmountChange = (month, phaseIdx, amount) => {
    const monthEntry = project.monthly_plan.find((m) => m.month === month)
    const phases = monthEntry.phases.map((ph, i) =>
      i === phaseIdx ? { ...ph, amount: parseFloat(amount) || 0 } : ph,
    )
    const { project: updated } = localProjects.updateMonthPlan(project.id, month, phases)
    onProjectChange(updated)
  }

  const handleLabelChange = (month, phaseIdx, label) => {
    const monthEntry = project.monthly_plan.find((m) => m.month === month)
    const phases = monthEntry.phases.map((ph, i) => (i === phaseIdx ? { ...ph, label } : ph))
    const { project: updated } = localProjects.updateMonthPlan(project.id, month, phases)
    onProjectChange(updated)
  }

  const handlePhaseChange = (month, phaseIdx, phase) => {
    const monthEntry = project.monthly_plan.find((m) => m.month === month)
    const phases = monthEntry.phases.map((ph, i) => (i === phaseIdx ? { ...ph, phase } : ph))
    const { project: updated } = localProjects.updateMonthPlan(project.id, month, phases)
    onProjectChange(updated)
  }

  const handleAddPhase = (month) => {
    const monthEntry = project.monthly_plan.find((m) => m.month === month)
    const phases = [...monthEntry.phases, { phase: 'design', label: '', amount: 0 }]
    const { project: updated } = localProjects.updateMonthPlan(project.id, month, phases)
    onProjectChange(updated)
  }

  const handleRemovePhase = (month, phaseIdx) => {
    const monthEntry = project.monthly_plan.find((m) => m.month === month)
    const phases = monthEntry.phases.filter((_, i) => i !== phaseIdx)
    const { project: updated } = localProjects.updateMonthPlan(project.id, month, phases)
    onProjectChange(updated)
  }

  const handlePoolAmountChange = (pool, month, newAmount) => {
    const updated = localProjects.setManualPoolAdjustment(project.id, {
      pool,
      month,
      newAmount,
      createdBy: currentUser,
    })
    onProjectChange(updated)
  }

  const handlePoolPctChange = (pool, month, newPct) => {
    const pv = project.project_value || project.project_valuation || 0
    const months = monthsInRange(project.start_date, project.end_date)
    const monthlyValue = months.length > 0 ? pv / months.length : 0
    const newAmount = ((parseFloat(newPct) || 0) / 100) * monthlyValue
    const updated = localProjects.setManualPoolAdjustment(project.id, {
      pool,
      month,
      newAmount,
      createdBy: currentUser,
    })
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
        {/* ── Recurring Tasks ─────────────────────────────────────────────── */}
        <div style={{ padding: '16px 16px 0' }}>
          <RecurringTasksSection
            project={project}
            onProjectChange={onProjectChange}
            canEdit={canEdit}
            monthCount={monthCount}
            months={months}
          />
        </div>
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
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {project.monthly_plan.map((m) => {
                const adjustedFor = (pool) =>
                  (project.pool_adjustments || []).some(
                    (a) => a.pool === pool && a.month === m.month,
                  )
                const projectReallocation = sumManualPoolAdjustments(
                  project.pool_adjustments,
                  m.month,
                )
                return (
                  <CTableRow key={m.month}>
                    <CTableDataCell className="fw-semibold">{monthLabel(m.month)}</CTableDataCell>
                    <CTableDataCell>
                      {m.phases.map((ph, i) => (
                        <div key={i} className="d-flex align-items-center gap-1 mb-1 flex-wrap">
                          <CFormSelect
                            size="sm"
                            style={{ width: 110 }}
                            value={ph.phase}
                            disabled={!canEdit}
                            onChange={(e) => handlePhaseChange(m.month, i, e.target.value)}
                          >
                            {PHASE_OPTIONS.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </CFormSelect>
                          <CFormInput
                            size="sm"
                            style={{ width: 130 }}
                            placeholder="Task / activity"
                            value={ph.label}
                            disabled={!canEdit}
                            onChange={(e) => handleLabelChange(m.month, i, e.target.value)}
                          />
                          <CInputGroup size="sm" style={{ maxWidth: 120 }}>
                            <CInputGroupText>₹</CInputGroupText>
                            <CFormInput
                              type="number"
                              min="0"
                              value={ph.amount}
                              disabled={!canEdit}
                              onChange={(e) => handleAmountChange(m.month, i, e.target.value)}
                            />
                          </CInputGroup>
                          {canEdit && (
                            <CButton
                              size="sm"
                              color="danger"
                              variant="ghost"
                              disabled={m.phases.length === 1}
                              onClick={() => handleRemovePhase(m.month, i)}
                            >
                              <CIcon icon={cilTrash} size="sm" />
                            </CButton>
                          )}
                        </div>
                      ))}
                      {canEdit && (
                        <CButton
                          size="sm"
                          color="secondary"
                          variant="outline"
                          onClick={() => handleAddPhase(m.month)}
                        >
                          <CIcon icon={cilPlus} className="me-1" />
                          Add Line
                        </CButton>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold">
                      {fmt(computeEffectiveProjectMonthly(project, m.month))}
                      {projectReallocation !== 0 && (
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
                    {['admin', 'hr', 'core'].map((pool) => (
                      <CTableDataCell key={pool} className="text-end">
                        <CInputGroup size="sm" style={{ maxWidth: 130, marginLeft: 'auto' }}>
                          <CInputGroupText>₹</CInputGroupText>
                          <CFormInput
                            type="number"
                            value={computeEffectivePoolMonthly(project, pool, m.month)}
                            disabled={!canEdit}
                            onChange={(e) => handlePoolAmountChange(pool, m.month, e.target.value)}
                          />
                        </CInputGroup>
                        <CInputGroup
                          size="sm"
                          style={{ maxWidth: 90, marginLeft: 'auto', marginTop: 4 }}
                        >
                          <CFormInput
                            type="number"
                            step="0.1"
                            value={computeEffectivePoolPct(project, pool, m.month)}
                            disabled={!canEdit}
                            onChange={(e) => handlePoolPctChange(pool, m.month, e.target.value)}
                          />
                          <CInputGroupText>%</CInputGroupText>
                        </CInputGroup>
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
  currentUser: PropTypes.string,
}

const PlanningSummary = ({ project }) => {
  const workingPool = computeWorkingPool(project)
  const validation = validatePlanTotalWithCascade(
    project.monthly_plan,
    workingPool,
    project.pool_adjustments,
  )

  const projectTotal = project.monthly_plan.reduce(
    (s, m) => s + computeEffectiveProjectMonthly(project, m.month),
    0,
  )
  const poolTotal = (pool) =>
    project.monthly_plan.reduce(
      (s, m) => s + computeEffectivePoolMonthly(project, pool, m.month),
      0,
    )
  const adminTotal = poolTotal('admin')
  const hrTotal = poolTotal('hr')
  const coreTotal = poolTotal('core')
  const grandTotal = projectTotal + adminTotal + hrTotal + coreTotal

  const phaseTotals = { design: 0, implementation: 0, monitoring: 0 }
  let lineCount = 0
  project.monthly_plan.forEach((m) => {
    m.phases.forEach((ph) => {
      phaseTotals[ph.phase] = (phaseTotals[ph.phase] || 0) + (ph.amount || 0)
      lineCount += 1
    })
  })

  return (
    <CCard className="shadow-sm mb-4">
      <CCardHeader className="bg-transparent fw-semibold pt-3">📈 Planning Summary</CCardHeader>
      <CCardBody>
        <CAlert color={validation.valid ? 'success' : 'danger'} className="py-2 small">
          {validation.valid
            ? '✅ Can run as planned — the plan balances against the project baseline.'
            : `❌ Off by ${fmt(Math.abs(validation.diff))} — won't run as planned.`}
        </CAlert>

        <CRow className="g-3 mb-3">
          {[
            { label: 'Project', value: projectTotal, color: 'text-primary' },
            { label: 'Admin', value: adminTotal, color: 'text-warning' },
            { label: 'HR', value: hrTotal, color: 'text-info' },
            { label: 'Core', value: coreTotal, color: 'text-danger' },
            { label: 'Grand Total', value: grandTotal, color: 'text-dark fw-bold' },
          ].map((row) => (
            <CCol key={row.label} xs={6} md={2} className="text-center">
              <div className="small text-body-secondary">{row.label}</div>
              <div className={row.color}>{fmt(row.value)}</div>
            </CCol>
          ))}
        </CRow>

        <div className="small text-body-secondary mb-2">
          {lineCount} task line{lineCount !== 1 ? 's' : ''} planned · Design{' '}
          {fmt(phaseTotals.design)} · Implementation {fmt(phaseTotals.implementation)} · Monitoring{' '}
          {fmt(phaseTotals.monitoring)}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <CTable bordered small align="middle" className="mb-0" style={{ fontSize: '0.78rem' }}>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Month</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Project</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Admin</CTableHeaderCell>
                <CTableHeaderCell className="text-end">HR</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Core</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {project.monthly_plan.map((m) => (
                <CTableRow key={m.month}>
                  <CTableDataCell>{monthLabel(m.month)}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {fmt(computeEffectiveProjectMonthly(project, m.month))}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {fmt(computeEffectivePoolMonthly(project, 'admin', m.month))}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {fmt(computeEffectivePoolMonthly(project, 'hr', m.month))}
                  </CTableDataCell>
                  <CTableDataCell className="text-end">
                    {fmt(computeEffectivePoolMonthly(project, 'core', m.month))}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  )
}

PlanningSummary.propTypes = {
  project: PropTypes.object.isRequired,
}

const ActualSpendPanel = ({ project }) => {
  const entries = localProjectExpenses.list({ projectId: project.id, pool: 'admin' })
  const actualForMonth = (month) =>
    entries.filter((e) => e.month === month).reduce((s, e) => s + e.amount, 0)

  const projectEntries = localProjectExpenses.list({ projectId: project.id, pool: 'project' })
  const actualProjectForMonth = (month) =>
    projectEntries.filter((e) => e.month === month).reduce((s, e) => s + e.amount, 0)

  return (
    <CCard className="shadow-sm mb-4">
      <CCardHeader className="bg-transparent fw-semibold pt-3">💸 Actual Spend</CCardHeader>
      <CCardBody>
        <div className="small text-body-secondary mb-3">
          Real money spent against this project, month by month, compared to the planned pool rates.
          Admin actuals are logged by HR in EMS → Expense Management → Project Expenses. Project
          actuals are logged by the PO directly in the Expense tab. HR/Core actual tracking is not
          yet wired up.
        </div>
        <div style={{ overflowX: 'auto' }}>
          <CTable bordered small align="middle" className="mb-0" style={{ fontSize: '0.78rem' }}>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Month</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Planned Admin</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Actual Admin</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Variance</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Project</CTableHeaderCell>
                <CTableHeaderCell className="text-end">HR</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Core</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {project.monthly_plan.map((m) => {
                const planned = computeEffectivePoolMonthly(project, 'admin', m.month)
                const actual = actualForMonth(m.month)
                const variance = planned - actual
                return (
                  <CTableRow key={m.month}>
                    <CTableDataCell>{monthLabel(m.month)}</CTableDataCell>
                    <CTableDataCell className="text-end">{fmt(planned)}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {actual === 0 ? 'None' : fmt(actual)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CBadge color={variance >= 0 ? 'success' : 'danger'}>{fmt(variance)}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      {actualProjectForMonth(m.month) === 0
                        ? 'None'
                        : fmt(actualProjectForMonth(m.month))}
                    </CTableDataCell>
                    <CTableDataCell className="text-end text-body-tertiary">
                      — not yet tracked
                    </CTableDataCell>
                    <CTableDataCell className="text-end text-body-tertiary">
                      — not yet tracked
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

ActualSpendPanel.propTypes = {
  project: PropTypes.object.isRequired,
}

const POOL_SEND_LABELS = { admin: 'Admin', hr: 'HR', core: 'Core' }

const monthBounds = (month) => {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` }
}

const ActualExpenseCard = ({ projectId, month, plannedAmount, canEdit, currentUser }) => {
  // No local `entries` state — read straight from the store on every render
  // (same convention as ActualSpendPanel below). `refresh` only exists to
  // force a re-render after a mutation; its value is never read.
  const [, setRefresh] = useState(0)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')

  const entries = localProjectExpenses.list({ projectId, pool: 'project', month })
  const logged = entries.reduce((s, e) => s + (e.amount || 0), 0)
  const remaining = plannedAmount - logged
  const canAdd = desc.trim() && parseFloat(amount) > 0

  const handleAdd = () => {
    if (!canAdd) return
    localProjectExpenses.create({
      project_id: projectId,
      pool: 'project',
      month,
      amount: parseFloat(amount),
      label: desc.trim(),
      date,
      createdBy: currentUser,
    })
    setRefresh((r) => r + 1)
    setDesc('')
    setAmount('')
  }

  const handleDelete = (id) => {
    localProjectExpenses.remove(id)
    setRefresh((r) => r + 1)
  }

  const fmtEntryDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''

  return (
    <CCard className="h-100">
      <CCardHeader className="bg-transparent fw-semibold py-2">Actual Expense</CCardHeader>
      <CCardBody className="p-2">
        <div className="small text-body-secondary mb-2">
          Planned {fmt(plannedAmount)} · Logged {fmt(logged)} · Remaining {fmt(remaining)}
        </div>

        {entries.length === 0 ? (
          <div className="text-center text-body-tertiary small py-2">
            No expenses logged this month.
          </div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className="d-flex justify-content-between align-items-center border-bottom py-1 small"
            >
              <span>
                {fmtEntryDate(e.date)} — {e.label}
              </span>
              <span className="d-flex align-items-center gap-2">
                {fmt(e.amount)}
                {canEdit && (
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="ghost"
                    style={{ padding: '0 4px' }}
                    onClick={() => handleDelete(e.id)}
                  >
                    ✕
                  </CButton>
                )}
              </span>
            </div>
          ))
        )}

        {canEdit && (
          <CRow className="g-1 mt-2 align-items-center">
            <CCol xs={4} md={3}>
              <CFormInput
                type="date"
                size="sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </CCol>
            <CCol xs={8} md={5}>
              <CFormInput
                size="sm"
                placeholder="Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </CCol>
            <CCol xs={8} md={3}>
              <CInputGroup size="sm">
                <CInputGroupText>₹</CInputGroupText>
                <CFormInput
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={4} md={1}>
              <CButton size="sm" color="primary" disabled={!canAdd} onClick={handleAdd}>
                Add
              </CButton>
            </CCol>
          </CRow>
        )}
      </CCardBody>
    </CCard>
  )
}

ActualExpenseCard.propTypes = {
  projectId: PropTypes.string.isRequired,
  month: PropTypes.string.isRequired,
  plannedAmount: PropTypes.number.isRequired,
  canEdit: PropTypes.bool,
  currentUser: PropTypes.string,
}

/**
 * The PO's month-by-month execution surface: pick a month from the
 * dropdown and see everything relevant to running it — that month's tasks,
 * milestones (installments overlapping it), assignees, and the
 * Admin/HR/Core expense split with Send/Revoke actions (see
 * localProjects.sendPoolAllocation/revokePoolAllocation). Sending a
 * pool+month is what unlocks HR to log actual expenses against it in EMS,
 * capped at the sent amount; a pool+month that's never sent simply never
 * becomes available there — that IS the PO's restriction, no separate
 * block action needed.
 */
const ExpensePanel = ({ project, onProjectChange, canEdit = false, currentUser = 'Unknown' }) => {
  const months = (project.monthly_plan || []).map((m) => m.month)
  const [selectedMonth, setSelectedMonth] = useState(months[0] || '')
  const [sendError, setSendError] = useState('')
  const month = months.includes(selectedMonth) ? selectedMonth : months[0]

  if (!months.length) {
    return (
      <CCard className="shadow-sm mb-4">
        <CCardHeader className="bg-transparent fw-semibold pt-3">📤 Expense</CCardHeader>
        <CCardBody>
          <div className="text-center text-body-tertiary small py-3">
            No Monthly Plan yet — plan the project first.
          </div>
        </CCardBody>
      </CCard>
    )
  }

  const { start: monthStart, end: monthEnd } = monthBounds(month)

  const monthTasks = localTasks
    .getByProject(project.id)
    .filter((t) => (t.due_date || t.target_date || '').slice(0, 7) === month)

  const monthInstallments = (project.installments || []).filter((inst) => {
    const instEnd = inst.end_date || inst.target_date
    if (!inst.start_date || !instEnd) return false
    return inst.start_date <= monthEnd && instEnd >= monthStart
  })

  const assignees = [...new Set(monthTasks.map((t) => t.assignee).filter(Boolean))]

  // Excludes pool: 'project' — those are shown (and kept live) by the Actual
  // Expense card above; mirroring them here too would go stale between the
  // two components' independent renders and duplicate the same entry twice.
  const actualEntries = localProjectExpenses
    .list({ projectId: project.id, month })
    .filter((e) => e.pool !== 'project')

  const sentFor = (pool) =>
    (project.sent_allocations || []).find((a) => a.pool === pool && a.month === month)

  const handleSend = (pool) => {
    setSendError('')
    const amount = computeEffectivePoolMonthly(project, pool, month)
    if (amount <= 0) {
      setSendError(
        `${POOL_SEND_LABELS[pool]} for ${monthLabel(month)} is not allowed to take — there's no amount available to send (${fmt(amount)}).`,
      )
      return
    }
    try {
      const updated = localProjects.sendPoolAllocation(project.id, {
        pool,
        month,
        amount,
        sentBy: currentUser,
      })
      onProjectChange(updated)
    } catch (e) {
      setSendError(e.message)
    }
  }

  const handleRevoke = (pool) => {
    setSendError('')
    const updated = localProjects.revokePoolAllocation(project.id, { pool, month })
    onProjectChange(updated)
  }

  return (
    <CCard className="shadow-sm mb-4">
      <CCardHeader className="bg-transparent fw-semibold pt-3">📤 Expense</CCardHeader>
      <CCardBody>
        <div className="small text-body-secondary mb-3">
          Pick a month to see everything relevant to running it — tasks, milestones, assignees, and
          the Admin/HR/Core split. Sending a pool+month unlocks HR to log actual expenses against it
          in EMS, capped at the sent amount. A pool+month that's never sent stays unavailable there
          — simply don't send it to restrict that month.
        </div>

        <CFormSelect
          value={month}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ maxWidth: 220 }}
          className="mb-3"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </CFormSelect>

        <CRow className="g-3">
          <CCol xs={12} md={6}>
            <ActualExpenseCard
              projectId={project.id}
              month={month}
              plannedAmount={computeEffectiveProjectMonthly(project, month)}
              canEdit={canEdit}
              currentUser={currentUser}
            />
          </CCol>

          <CCol xs={12} md={6}>
            <CCard className="h-100">
              <CCardHeader className="bg-transparent fw-semibold py-2">
                🏁 Milestones <CBadge color="secondary">{monthInstallments.length}</CBadge>
              </CCardHeader>
              <CCardBody className="p-2">
                {monthInstallments.length === 0 ? (
                  <div className="text-center text-body-tertiary small py-2">
                    No installment overlaps this month.
                  </div>
                ) : (
                  monthInstallments.map((inst) => (
                    <div
                      key={inst.id}
                      className="d-flex justify-content-between align-items-start border-bottom py-1 small"
                    >
                      <div>
                        <div className="fw-medium">{inst.label}</div>
                        <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                          {inst.percentage}% · {fmt(inst.amount)}
                        </div>
                      </div>
                      <CBadge color="info">{inst.uc_status || 'Pending'}</CBadge>
                    </div>
                  ))
                )}
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12} md={6}>
            <CCard className="h-100">
              <CCardHeader className="bg-transparent fw-semibold py-2">
                👤 Assignees <CBadge color="secondary">{assignees.length}</CBadge>
              </CCardHeader>
              <CCardBody className="p-2">
                {assignees.length === 0 ? (
                  <div className="text-center text-body-tertiary small py-2">
                    No assignees on this month's tasks.
                  </div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {assignees.map((a) => (
                      <CBadge key={a} color="primary" shape="rounded-pill">
                        {a}
                      </CBadge>
                    ))}
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12} md={6}>
            <CCard className="h-100">
              <CCardHeader className="bg-transparent fw-semibold py-2">💰 Expenses</CCardHeader>
              <CCardBody className="p-2">
                {sendError && (
                  <CAlert color="danger" className="py-2 small mb-2">
                    {sendError}
                  </CAlert>
                )}
                {['admin', 'hr', 'core'].map((pool) => {
                  const amount = computeEffectivePoolMonthly(project, pool, month)
                  const sent = sentFor(pool)
                  const notAllowed = amount <= 0
                  return (
                    <div
                      key={pool}
                      className="d-flex justify-content-between align-items-center border-bottom py-1 small"
                    >
                      <div>
                        <div className="fw-medium">{POOL_SEND_LABELS[pool]}</div>
                        <div className="text-body-secondary" style={{ fontSize: '0.72rem' }}>
                          Planned {fmt(amount)}
                        </div>
                      </div>
                      {sent ? (
                        <div className="d-flex align-items-center gap-2">
                          <CBadge
                            color="success"
                            shape="rounded-pill"
                            style={{ fontSize: '0.62rem' }}
                          >
                            Sent {fmt(sent.amount)}
                          </CBadge>
                          {canEdit && (
                            <CButton
                              size="sm"
                              color="secondary"
                              variant="ghost"
                              onClick={() => handleRevoke(pool)}
                            >
                              Revoke
                            </CButton>
                          )}
                        </div>
                      ) : notAllowed ? (
                        <CBadge color="danger" shape="rounded-pill" style={{ fontSize: '0.62rem' }}>
                          Not allowed to take
                        </CBadge>
                      ) : (
                        canEdit && (
                          <CButton
                            size="sm"
                            color="primary"
                            variant="outline"
                            onClick={() => handleSend(pool)}
                          >
                            Send
                          </CButton>
                        )
                      )}
                    </div>
                  )
                })}
                {actualEntries.length > 0 && (
                  <div className="mt-2">
                    <div className="small fw-semibold mb-1">Actual logged this month</div>
                    {actualEntries.map((e) => (
                      <div key={e.id} className="d-flex justify-content-between small">
                        <span>
                          {POOL_SEND_LABELS[e.pool]} — {e.label}
                        </span>
                        <span>{fmt(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

ExpensePanel.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  currentUser: PropTypes.string,
}

export { ExpensePanel }

const MonthlyPlanPanel = ({
  project,
  onProjectChange,
  canEdit = false,
  currentUser = 'Unknown',
}) => {
  const hasPlan = Boolean(project.monthly_plan?.length)
  return (
    <>
      <MonthAccordion
        project={project}
        onProjectChange={onProjectChange}
        canEdit={canEdit}
        defaultCollapsed={hasPlan}
      />
      {hasPlan && (
        <>
          <PlanTable
            project={project}
            onProjectChange={onProjectChange}
            canEdit={canEdit}
            currentUser={currentUser}
          />
          <PlanningSummary project={project} />
          <ActualSpendPanel project={project} />
        </>
      )}
    </>
  )
}

MonthlyPlanPanel.propTypes = {
  project: PropTypes.object.isRequired,
  onProjectChange: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  currentUser: PropTypes.string,
}

export default MonthlyPlanPanel
