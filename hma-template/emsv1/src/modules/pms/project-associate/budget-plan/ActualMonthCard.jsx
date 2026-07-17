import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilReload } from '@coreui/icons'
import {
  monthAllocated,
  monthBaselines,
  computeWorkingPool,
  monthActualTotal,
} from '../../../../services/budgetPlan'
import { localBudgetPlan } from '../../../../services/localBudgetPlan'
import MonthPicker from './MonthPicker'

const PHASE_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'monitoring', label: 'Monitoring' },
]

const ACCENTS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2']

const POOL_LABELS = { admin: 'Admin', hr: 'HR', core: 'Core' }

/** This month's own net contribution to `pool` — money that moved specifically
 * between THIS month and this pool, never other months' activity. Positive
 * when the month gave the pool extra, negative when the month pulled money
 * back from the pool (returns it to the project's own budget for this month). */
const poolNetForMonth = (transfers, pool, month) =>
  (transfers || []).reduce((s, t) => {
    if (t.from === `month:${month}` && t.to === pool) return s + t.amount
    if (t.to === `month:${month}` && t.from === pool) return s - t.amount
    return s
  }, 0)

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const phaseLabelOf = (value) => PHASE_OPTIONS.find((p) => p.value === value)?.label || value

const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const emptyNewTask = { phase: 'design', name: '' }
const emptyNewSubtask = { name: '', amount: '' }

const ActualMonthCard = ({
  project,
  plan,
  month,
  colorIndex,
  canEdit,
  onPlanChange,
  currentUser,
}) => {
  const [error, setError] = useState('')
  const [newTask, setNewTask] = useState(emptyNewTask)
  const [newSubtaskByTask, setNewSubtaskByTask] = useState({})
  const [poolInputDraft, setPoolInputDraft] = useState({})
  const [resetConfirm, setResetConfirm] = useState(false)
  const accent = ACCENTS[colorIndex % ACCENTS.length]
  const monthEntry = plan.months.find((m) => m.month === month)
  const monthCount = plan.months.length
  const baselines = monthBaselines(
    computeWorkingPool(plan.project_value, plan.pool_pct),
    plan.months.map((m) => m.month),
  )
  const allocated = monthAllocated(baselines[month], plan.transfers, month)
  const actualSoFar = monthActualTotal(monthEntry.tasks)
  // Approving a month freezes it — every edit below (pool blocks, actual
  // entry, add task, send/take, this month's own Reset) is gated on this,
  // separately from `canEdit` which is the PO/owner permission check.
  const monthEditable = canEdit && !monthEntry.approved

  const run = (fn) => {
    setError('')
    try {
      onPlanChange(fn())
    } catch (e) {
      setError(e.message)
    }
  }

  /** This month's own baseline share of `pool` — a static rate that never
   * shifts because of what any OTHER month does. */
  const poolMonthBaseline = (pool) =>
    monthCount > 0 ? (plan.project_value * (plan.pool_pct[pool] || 0)) / 100 / monthCount : 0

  const handlePoolBlockChange = (pool, value) => {
    const current = poolMonthBaseline(pool) + poolNetForMonth(plan.transfers, pool, month)
    const delta = Math.round(((parseFloat(value) || 0) - current) * 100) / 100
    if (Math.abs(delta) < 0.005) return
    run(() =>
      localBudgetPlan.moveBalance(project.id, {
        originMonth: month,
        direction: delta > 0 ? 'send' : 'take',
        targets: [pool],
        amount: Math.abs(delta),
        phase: 'actual',
        createdBy: currentUser,
      }),
    )
  }

  const handleAddTask = () => {
    if (!newTask.name.trim()) return
    run(() =>
      localBudgetPlan.addActualTask(project.id, month, {
        phase: newTask.phase,
        name: newTask.name,
      }),
    )
    setNewTask(emptyNewTask)
  }

  const subtaskDraft = (taskId) => newSubtaskByTask[taskId] || emptyNewSubtask
  const setSubtaskDraft = (taskId, patch) =>
    setNewSubtaskByTask((prev) => ({ ...prev, [taskId]: { ...subtaskDraft(taskId), ...patch } }))

  const handleAddSubtask = (taskId) => {
    const draft = subtaskDraft(taskId)
    if (!draft.name.trim()) return
    setError('')
    try {
      let updated = localBudgetPlan.addSubtask(project.id, month, taskId, {
        name: draft.name,
        planned_amount: 0,
      })
      const amt = parseFloat(draft.amount) || 0
      if (amt > 0) {
        const task = updated.months
          .find((m) => m.month === month)
          .tasks.find((t) => t.id === taskId)
        const newSub = task.subtasks[task.subtasks.length - 1]
        updated = localBudgetPlan.updateActual(project.id, month, taskId, newSub.id, amt)
      }
      onPlanChange(updated)
      setNewSubtaskByTask((prev) => ({ ...prev, [taskId]: emptyNewSubtask }))
    } catch (e) {
      setError(e.message)
    }
  }

  // Unplanned (added_in_actual) tasks have no planned baseline to settle
  // against individually, so their spend is covered against the MONTH's
  // overall spare capacity (allocated so far minus everything actually
  // spent) — not per-line, so money already moved in from another month
  // (raising `allocated`) counts before asking for anything further.
  const monthShortfall = Math.round((actualSoFar - allocated) * 100) / 100
  const monthSurplus = -monthShortfall
  const handleTakeMonthShortfall = (targets) =>
    run(() =>
      localBudgetPlan.moveBalance(project.id, {
        originMonth: month,
        direction: 'take',
        targets,
        amount: monthShortfall,
        phase: 'actual',
        createdBy: currentUser,
      }),
    )
  const handleSendMonthSurplus = (targets) =>
    run(() =>
      localBudgetPlan.moveBalance(project.id, {
        originMonth: month,
        direction: 'send',
        targets,
        amount: monthSurplus,
        phase: 'actual',
        createdBy: currentUser,
      }),
    )

  const handleApprove = () => run(() => localBudgetPlan.approveMonth(project.id, month))
  const handleUnapprove = () => run(() => localBudgetPlan.unapproveMonth(project.id, month))

  return (
    <CCard className="mb-3" style={{ borderLeft: `4px solid ${accent}` }}>
      <CCardHeader
        style={{ background: `${accent}14` }}
        className="d-flex justify-content-between align-items-center flex-wrap gap-2"
      >
        <div>
          <span className="fw-semibold">{monthLabel(month)}</span>
          <span className="small text-body-secondary ms-2">
            Allocated: {fmt(allocated)} · Actual: {fmt(actualSoFar)}
          </span>
          {monthEntry.approved && (
            <span className="badge text-bg-success ms-2" style={{ fontSize: '0.62rem' }}>
              Approved
            </span>
          )}
        </div>
        {canEdit && (
          <div className="d-flex gap-2">
            {monthEntry.approved ? (
              <CButton size="sm" color="secondary" variant="outline" onClick={handleUnapprove}>
                Un-approve
              </CButton>
            ) : (
              <CButton size="sm" color="success" variant="outline" onClick={handleApprove}>
                Approve
              </CButton>
            )}
            {!monthEntry.approved && (
              <CButton
                size="sm"
                color="secondary"
                variant="ghost"
                onClick={() => setResetConfirm(true)}
              >
                <CIcon icon={cilReload} size="sm" className="me-1" /> Reset this month
              </CButton>
            )}
          </div>
        )}
      </CCardHeader>
      <CCardBody>
        <div className="d-flex gap-2 flex-wrap mb-3">
          {['admin', 'hr', 'core'].map((pool) => {
            const net = poolNetForMonth(plan.transfers, pool, month)
            const amount = poolMonthBaseline(pool) + net
            return (
              <div key={pool} className="border rounded p-2 flex-grow-1" style={{ minWidth: 140 }}>
                <div className="small text-body-secondary d-flex justify-content-between">
                  <span>
                    {POOL_LABELS[pool]} ({pool === 'admin' ? '' : 'max '}
                    {plan.pool_pct[pool]}%)
                  </span>
                  {Math.abs(net) > 0.005 && (
                    <span className="badge text-bg-warning" style={{ fontSize: '0.62rem' }}>
                      adjusted
                    </span>
                  )}
                </div>
                {pool === 'admin' || !monthEditable ? (
                  <div className="fw-semibold">{fmt(amount)}</div>
                ) : (
                  <CFormInput
                    size="sm"
                    type="number"
                    value={poolInputDraft[pool] ?? amount}
                    onChange={(e) =>
                      setPoolInputDraft((prev) => ({ ...prev, [pool]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      handlePoolBlockChange(pool, e.target.value)
                      setPoolInputDraft((prev) => {
                        const next = { ...prev }
                        delete next[pool]
                        return next
                      })
                    }}
                    onBlur={() =>
                      setPoolInputDraft((prev) => {
                        const next = { ...prev }
                        delete next[pool]
                        return next
                      })
                    }
                  />
                )}
              </div>
            )
          })}
        </div>

        {monthEntry.tasks.map((task) => (
          <div key={task.id} className="border rounded p-2 mb-2">
            <div className="d-flex gap-2 align-items-center mb-1">
              <span className="small text-body-secondary" style={{ width: 110 }}>
                {phaseLabelOf(task.phase)}
              </span>
              <span className="fw-medium flex-grow-1">
                {task.name}
                {task.added_in_actual && (
                  <span className="text-body-tertiary"> (added in actual)</span>
                )}
              </span>
            </div>
            {task.subtasks.map((sub) => (
              <div key={sub.id} className="d-flex gap-2 align-items-center mb-1 ms-3">
                <span className="small" style={{ width: 160 }}>
                  {sub.name}
                </span>
                {!task.added_in_actual && (
                  <span className="small text-body-tertiary" style={{ width: 110 }}>
                    planned {fmt(sub.planned_amount)}
                  </span>
                )}
                <CFormInput
                  size="sm"
                  type="number"
                  style={{ width: 130 }}
                  value={sub.actual_amount || ''}
                  disabled={!monthEditable}
                  onChange={(e) =>
                    run(() =>
                      localBudgetPlan.updateActual(
                        project.id,
                        month,
                        task.id,
                        sub.id,
                        e.target.value,
                      ),
                    )
                  }
                />
              </div>
            ))}
            {task.added_in_actual && monthEditable && (
              <div className="d-flex gap-2 align-items-center ms-3 mt-1">
                <CFormInput
                  size="sm"
                  style={{ width: 160 }}
                  placeholder="Expense name"
                  value={subtaskDraft(task.id).name}
                  onChange={(e) => setSubtaskDraft(task.id, { name: e.target.value })}
                />
                <CFormInput
                  size="sm"
                  type="number"
                  style={{ width: 130 }}
                  placeholder="Amount"
                  value={subtaskDraft(task.id).amount}
                  onChange={(e) => setSubtaskDraft(task.id, { amount: e.target.value })}
                />
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => handleAddSubtask(task.id)}
                >
                  <CIcon icon={cilPlus} className="me-1" /> Add Expense
                </CButton>
              </div>
            )}
          </div>
        ))}

        {monthEditable && monthShortfall > 0.005 && (
          <div className="mt-2 mb-3 p-2 border rounded bg-body-tertiary">
            <div className="small mb-1 text-danger">
              Actual spend this month needs {fmt(monthShortfall)} more than what&apos;s allocated
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CButton
                size="sm"
                color="warning"
                variant="outline"
                onClick={() => handleTakeMonthShortfall(['hr', 'core'])}
              >
                Take from HR/Core
              </CButton>
              <MonthPicker
                months={plan.months.map((m) => m.month)}
                excludeMonth={month}
                label="Take from months"
                onConfirm={(targets) => handleTakeMonthShortfall(targets.map((m) => `month:${m}`))}
              />
            </div>
          </div>
        )}

        {monthEditable && monthSurplus > 0.005 && (
          <div className="mt-2 mb-3 p-2 border rounded bg-body-tertiary">
            <div className="small mb-1">
              {fmt(monthSurplus)} of this month&apos;s allocated budget hasn&apos;t been spent yet
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CButton
                size="sm"
                color="success"
                variant="outline"
                onClick={() => handleSendMonthSurplus(['hr', 'core'])}
              >
                Send to HR/Core
              </CButton>
              <MonthPicker
                months={plan.months.map((m) => m.month)}
                excludeMonth={month}
                label="Send to other months"
                onConfirm={(targets) => handleSendMonthSurplus(targets.map((m) => `month:${m}`))}
              />
            </div>
          </div>
        )}

        {monthEditable && (
          <div className="d-flex gap-2 align-items-center mb-2">
            <CFormSelect
              size="sm"
              style={{ width: 150 }}
              value={newTask.phase}
              onChange={(e) => setNewTask((t) => ({ ...t, phase: e.target.value }))}
            >
              {PHASE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </CFormSelect>
            <CFormInput
              size="sm"
              placeholder="Unplanned task name"
              value={newTask.name}
              onChange={(e) => setNewTask((t) => ({ ...t, name: e.target.value }))}
            />
            <CButton size="sm" color="secondary" variant="outline" onClick={handleAddTask}>
              <CIcon icon={cilPlus} className="me-1" /> Add Task
            </CButton>
          </div>
        )}
        {error && <div className="text-danger small mt-2">{error}</div>}
      </CCardBody>

      <CModal
        visible={resetConfirm}
        onClose={() => setResetConfirm(false)}
        alignment="center"
        size="sm"
      >
        <CModalHeader>
          <CModalTitle>Confirm Reset</CModalTitle>
        </CModalHeader>
        <CModalBody className="small">
          This clears {monthLabel(month)}&apos;s actual entries: every actual amount, any tasks
          added during actual entry, and actual-phase transfers this month sent or took (transfers
          other months sent into it are kept). Planned amounts are not affected. Continue?
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={() => setResetConfirm(false)}
          >
            Cancel
          </CButton>
          <CButton
            color="danger"
            size="sm"
            onClick={() => {
              run(() => localBudgetPlan.resetActualMonth(project.id, month))
              setResetConfirm(false)
            }}
          >
            Confirm
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

ActualMonthCard.propTypes = {
  project: PropTypes.object.isRequired,
  plan: PropTypes.object.isRequired,
  month: PropTypes.string.isRequired,
  colorIndex: PropTypes.number.isRequired,
  canEdit: PropTypes.bool,
  onPlanChange: PropTypes.func.isRequired,
  currentUser: PropTypes.string,
}

export default ActualMonthCard
