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
import { cilTrash, cilPlus, cilReload } from '@coreui/icons'
import {
  monthAllocated,
  monthBaselines,
  computeWorkingPool,
  monthPlannedTotal,
} from '../../../../services/budgetPlan'
import { localBudgetPlan } from '../../../../services/localBudgetPlan'
import MonthPicker from './MonthPicker'
import { ACTIVITY_OPTIONS, activityLabelOf } from './activityOptions'

const PHASE_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'monitoring', label: 'Monitoring' },
]

const ACCENTS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2']

const POOL_LABELS = { admin: 'Admin', hr: 'HR', core: 'Core' }

/** This month's own net contribution to `pool` — money that moved specifically
 * between THIS month and this pool, never other months' activity. Positive
 * when the month gave the pool extra (increases the pool's take this month),
 * negative when the month pulled money back from the pool (returns it to
 * the project's own budget for this month). */
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
const emptyNewSubtask = { name: '', amount: '', activity: '', activityOther: '', subBudgetHead: '' }

const PlanningMonthCard = ({
  project,
  plan,
  month,
  colorIndex,
  canEdit,
  onPlanChange,
  currentUser,
}) => {
  const [resetConfirm, setResetConfirm] = useState(false)
  const [error, setError] = useState('')
  const [poolInputDraft, setPoolInputDraft] = useState({})
  const [newTask, setNewTask] = useState(emptyNewTask)
  const [newSubtaskByTask, setNewSubtaskByTask] = useState({})
  const accent = ACCENTS[colorIndex % ACCENTS.length]

  const monthEntry = plan.months.find((m) => m.month === month)
  const monthCount = plan.months.length
  const baselines = monthBaselines(
    computeWorkingPool(plan.project_value, plan.pool_pct),
    plan.months.map((m) => m.month),
  )
  const allocated = monthAllocated(baselines[month], plan.transfers, month)
  const planned = monthPlannedTotal(monthEntry.tasks)
  const diff = Math.round((planned - allocated) * 100) / 100
  const monthTransfers = plan.transfers.filter(
    (t) => t.from === `month:${month}` || t.to === `month:${month}`,
  )

  const run = (fn) => {
    setError('')
    try {
      onPlanChange(fn())
    } catch (e) {
      setError(e.message)
    }
  }

  const handleAddTask = () => {
    if (!newTask.name.trim()) return
    run(() =>
      localBudgetPlan.addTask(project.id, month, { phase: newTask.phase, name: newTask.name }),
    )
    setNewTask(emptyNewTask)
  }

  const subtaskDraft = (taskId) => newSubtaskByTask[taskId] || emptyNewSubtask
  const setSubtaskDraft = (taskId, patch) =>
    setNewSubtaskByTask((prev) => ({ ...prev, [taskId]: { ...subtaskDraft(taskId), ...patch } }))

  const handleAddSubtask = (taskId) => {
    const draft = subtaskDraft(taskId)
    if (!draft.name.trim() || !draft.activity) return
    run(() =>
      localBudgetPlan.addSubtask(project.id, month, taskId, {
        name: draft.name,
        planned_amount: parseFloat(draft.amount) || 0,
        activity: draft.activity,
        activity_other: draft.activityOther,
        sub_budget_head: draft.subBudgetHead,
      }),
    )
    setNewSubtaskByTask((prev) => ({ ...prev, [taskId]: emptyNewSubtask }))
  }

  const handleSend = (targets) =>
    run(() =>
      localBudgetPlan.moveBalance(project.id, {
        originMonth: month,
        direction: 'send',
        targets,
        amount: Math.abs(diff),
        phase: 'planning',
        createdBy: currentUser,
      }),
    )
  const handleTake = (targets) =>
    run(() =>
      localBudgetPlan.moveBalance(project.id, {
        originMonth: month,
        direction: 'take',
        targets,
        amount: Math.abs(diff),
        phase: 'planning',
        createdBy: currentUser,
      }),
    )

  /** This month's own baseline share of `pool` — a static rate that never
   * shifts because of what any OTHER month does, so a pool block only ever
   * changes when THIS month's own transfers change. */
  const poolMonthBaseline = (pool) =>
    monthCount > 0 ? (plan.project_value * (plan.pool_pct[pool] || 0)) / 100 / monthCount : 0

  const handlePoolBlockChange = (pool, value) => {
    const current = poolMonthBaseline(pool) + poolNetForMonth(plan.transfers, pool, month)
    const delta = Math.round(((parseFloat(value) || 0) - current) * 100) / 100
    if (Math.abs(delta) < 0.005) return
    run(() =>
      localBudgetPlan.moveBalance(project.id, {
        originMonth: month,
        // Raising the block sends the extra from this month's own budget
        // TO the pool; lowering it takes that much back FROM the pool
        // into this month's budget — same convention as Send/Take below.
        direction: delta > 0 ? 'send' : 'take',
        targets: [pool],
        amount: Math.abs(delta),
        phase: 'planning',
        createdBy: currentUser,
      }),
    )
  }

  return (
    <CCard className="mb-3" style={{ borderLeft: `4px solid ${accent}` }}>
      <CCardHeader
        style={{ background: `${accent}14` }}
        className="d-flex justify-content-between align-items-center"
      >
        <span className="fw-semibold">{monthLabel(month)}</span>
        {canEdit && (
          <CButton
            size="sm"
            color="secondary"
            variant="ghost"
            onClick={() => setResetConfirm(true)}
          >
            <CIcon icon={cilReload} size="sm" className="me-1" /> Reset this month
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        <div className="small text-body-secondary mb-2">
          Allocated: <strong>{fmt(allocated)}</strong> &nbsp;·&nbsp; Planned:{' '}
          <strong>{fmt(planned)}</strong>
        </div>

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
                {pool === 'admin' || !canEdit ? (
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
              <span className="fw-medium flex-grow-1">{task.name}</span>
              {canEdit && (
                <CButton
                  size="sm"
                  color="danger"
                  variant="ghost"
                  onClick={() => run(() => localBudgetPlan.removeTask(project.id, month, task.id))}
                >
                  <CIcon icon={cilTrash} size="sm" />
                </CButton>
              )}
            </div>
            {task.subtasks.map((sub) => (
              <div key={sub.id} className="d-flex gap-2 align-items-center mb-1 ms-3 flex-wrap">
                <span className="small" style={{ width: 160 }}>
                  {sub.name}
                </span>
                <span className="small text-body-secondary" style={{ width: 150 }}>
                  {activityLabelOf(sub.activity, sub.activity_other)}
                </span>
                {sub.sub_budget_head && (
                  <span className="small text-body-tertiary" style={{ width: 140 }}>
                    {sub.sub_budget_head}
                  </span>
                )}
                <CFormInput
                  size="sm"
                  type="number"
                  style={{ width: 130 }}
                  value={sub.planned_amount || ''}
                  disabled={!canEdit}
                  onChange={(e) =>
                    run(() =>
                      localBudgetPlan.updateSubtaskPlanned(
                        project.id,
                        month,
                        task.id,
                        sub.id,
                        e.target.value,
                      ),
                    )
                  }
                />
                {canEdit && (
                  <CButton
                    size="sm"
                    color="danger"
                    variant="ghost"
                    onClick={() =>
                      run(() => localBudgetPlan.removeSubtask(project.id, month, task.id, sub.id))
                    }
                  >
                    <CIcon icon={cilTrash} size="sm" />
                  </CButton>
                )}
              </div>
            ))}
            {canEdit && (
              <div className="d-flex gap-2 align-items-center ms-3 mt-1 flex-wrap">
                <CFormInput
                  size="sm"
                  style={{ width: 160 }}
                  placeholder="Subtask"
                  value={subtaskDraft(task.id).name}
                  onChange={(e) => setSubtaskDraft(task.id, { name: e.target.value })}
                />
                <CFormSelect
                  size="sm"
                  style={{ width: 170 }}
                  value={subtaskDraft(task.id).activity}
                  onChange={(e) => setSubtaskDraft(task.id, { activity: e.target.value })}
                >
                  <option value="">Activity...</option>
                  {ACTIVITY_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </CFormSelect>
                {subtaskDraft(task.id).activity === 'other' && (
                  <CFormInput
                    size="sm"
                    style={{ width: 150 }}
                    placeholder="Activity name"
                    value={subtaskDraft(task.id).activityOther}
                    onChange={(e) => setSubtaskDraft(task.id, { activityOther: e.target.value })}
                  />
                )}
                <CFormInput
                  size="sm"
                  style={{ width: 150 }}
                  placeholder="Sub-budget head"
                  value={subtaskDraft(task.id).subBudgetHead}
                  onChange={(e) => setSubtaskDraft(task.id, { subBudgetHead: e.target.value })}
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
                  disabled={
                    !subtaskDraft(task.id).activity ||
                    (subtaskDraft(task.id).activity === 'other' &&
                      !subtaskDraft(task.id).activityOther.trim())
                  }
                >
                  <CIcon icon={cilPlus} className="me-1" /> Subtask
                </CButton>
              </div>
            )}
          </div>
        ))}

        {canEdit && (
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
              placeholder="Task name"
              value={newTask.name}
              onChange={(e) => setNewTask((t) => ({ ...t, name: e.target.value }))}
            />
            <CButton size="sm" color="secondary" variant="outline" onClick={handleAddTask}>
              <CIcon icon={cilPlus} className="me-1" /> Add Task
            </CButton>
          </div>
        )}

        {monthTransfers.map((t) => {
          const outgoing = t.from === `month:${month}`
          const counterpart = outgoing ? t.to : t.from
          const counterpartLabel = counterpart.startsWith('month:')
            ? monthLabel(counterpart.slice('month:'.length))
            : counterpart.toUpperCase()
          return (
            <div key={t.id} className="small text-body-secondary">
              {outgoing
                ? `− ${fmt(t.amount)} sent to ${counterpartLabel}`
                : `+ ${fmt(t.amount)} received from ${counterpartLabel}`}
              {canEdit && plan.status === 'planning' && (
                <CButton
                  size="sm"
                  color="secondary"
                  variant="ghost"
                  className="ms-1 p-0 px-1"
                  onClick={() => run(() => localBudgetPlan.revokeTransfer(project.id, t.id))}
                >
                  revoke
                </CButton>
              )}
            </div>
          )
        })}

        {canEdit && diff < -0.005 && (
          <div className="mt-2 p-2 border rounded bg-body-tertiary">
            <div className="small mb-1">
              Not fully utilized — balance this month: <strong>{fmt(-diff)}</strong>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CButton size="sm" color="success" onClick={() => handleSend(['hr', 'core'])}>
                Send to HR/Core
              </CButton>
              <MonthPicker
                months={plan.months.map((m) => m.month)}
                excludeMonth={month}
                label="Send to other months"
                onConfirm={(targets) => handleSend(targets.map((m) => `month:${m}`))}
              />
            </div>
          </div>
        )}

        {canEdit && diff > 0.005 && (
          <div className="mt-2 p-2 border rounded bg-body-tertiary">
            <div className="small mb-1 text-danger">Needs {fmt(diff)} more to satisfy</div>
            <div className="d-flex gap-2 flex-wrap">
              <CButton size="sm" color="warning" onClick={() => handleTake(['hr', 'core'])}>
                Take from HR/Core
              </CButton>
              <MonthPicker
                months={plan.months.map((m) => m.month)}
                excludeMonth={month}
                label="Take from months"
                onConfirm={(targets) => handleTake(targets.map((m) => `month:${m}`))}
              />
            </div>
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
          This restores {monthLabel(month)}&apos;s tasks to the last save and undoes every transfer
          it sent or took — which also restores any other month or pool those transfers touched.
          Continue?
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
              run(() => localBudgetPlan.resetMonth(project.id, month))
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

PlanningMonthCard.propTypes = {
  project: PropTypes.object.isRequired,
  plan: PropTypes.object.isRequired,
  month: PropTypes.string.isRequired,
  colorIndex: PropTypes.number.isRequired,
  canEdit: PropTypes.bool,
  onPlanChange: PropTypes.func.isRequired,
  currentUser: PropTypes.string,
}

export default PlanningMonthCard
