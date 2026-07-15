import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CCard, CCardBody, CCardHeader, CFormInput, CFormSelect } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
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
  const accent = ACCENTS[colorIndex % ACCENTS.length]
  const monthEntry = plan.months.find((m) => m.month === month)
  const baselines = monthBaselines(
    computeWorkingPool(plan.project_value, plan.pool_pct),
    plan.months.map((m) => m.month),
  )
  const allocated = monthAllocated(baselines[month], plan.transfers, month)
  const actualSoFar = monthActualTotal(monthEntry.tasks)

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
    run(() =>
      localBudgetPlan.addSubtask(project.id, month, taskId, {
        name: draft.name,
        planned_amount: 0,
      }),
    )
    setNewSubtaskByTask((prev) => ({ ...prev, [taskId]: emptyNewSubtask }))
  }

  return (
    <CCard className="mb-3" style={{ borderLeft: `4px solid ${accent}` }}>
      <CCardHeader style={{ background: `${accent}14` }}>
        <span className="fw-semibold">{monthLabel(month)}</span>
        <span className="small text-body-secondary ms-2">
          Planned: {fmt(allocated)} · Actual so far: {fmt(actualSoFar)}
        </span>
      </CCardHeader>
      <CCardBody>
        {monthEntry.tasks.map((task) => (
          <div key={task.id} className="border rounded p-2 mb-2">
            <div className="small fw-semibold mb-1">
              {phaseLabelOf(task.phase)} — {task.name}
              {task.added_in_actual && (
                <span className="text-body-tertiary"> (added in actual)</span>
              )}
            </div>
            {task.subtasks.map((sub) => {
              const remainder = Math.round((sub.planned_amount - sub.actual_amount) * 100) / 100
              return (
                <div key={sub.id} className="d-flex gap-2 align-items-center mb-1 ms-3 flex-wrap">
                  <span className="small text-body-secondary" style={{ width: 140 }}>
                    {sub.name}
                  </span>
                  <span className="small text-body-tertiary" style={{ width: 100 }}>
                    Planned {task.added_in_actual ? '—' : fmt(sub.planned_amount)}
                  </span>
                  <CFormInput
                    size="sm"
                    type="number"
                    style={{ width: 120 }}
                    value={sub.actual_amount || ''}
                    disabled={!canEdit || sub.actual_status === 'transferred'}
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
                  {sub.actual_status === 'transferred' && (
                    <span className="small text-success">Money transferred — ₹0</span>
                  )}
                  {canEdit &&
                    sub.actual_status !== 'transferred' &&
                    !task.added_in_actual &&
                    remainder > 0.005 && (
                      <>
                        <span className="small text-body-secondary">
                          {fmt(remainder)} remaining
                        </span>
                        <CButton
                          size="sm"
                          color="success"
                          variant="outline"
                          onClick={() =>
                            run(() =>
                              localBudgetPlan.moveBalance(project.id, {
                                originMonth: month,
                                direction: 'send',
                                targets: ['hr', 'core'],
                                amount: remainder,
                                phase: 'actual',
                                createdBy: currentUser,
                                subtaskRef: { month, taskId: task.id, subtaskId: sub.id },
                              }),
                            )
                          }
                        >
                          → HR/Core
                        </CButton>
                        <MonthPicker
                          months={plan.months.map((m) => m.month)}
                          excludeMonth={month}
                          label="→ months"
                          onConfirm={(targets) =>
                            run(() =>
                              localBudgetPlan.moveBalance(project.id, {
                                originMonth: month,
                                direction: 'send',
                                targets: targets.map((m) => `month:${m}`),
                                amount: remainder,
                                phase: 'actual',
                                createdBy: currentUser,
                                subtaskRef: { month, taskId: task.id, subtaskId: sub.id },
                              }),
                            )
                          }
                        />
                      </>
                    )}
                  {canEdit && remainder < -0.005 && (
                    <>
                      <span className="small text-danger">
                        Insufficient — needs {fmt(-remainder)}
                      </span>
                      <CButton
                        size="sm"
                        color="warning"
                        variant="outline"
                        onClick={() =>
                          run(() =>
                            localBudgetPlan.moveBalance(project.id, {
                              originMonth: month,
                              direction: 'take',
                              targets: ['hr', 'core'],
                              amount: -remainder,
                              phase: 'actual',
                              createdBy: currentUser,
                            }),
                          )
                        }
                      >
                        Take from HR/Core
                      </CButton>
                      <MonthPicker
                        months={plan.months.map((m) => m.month)}
                        excludeMonth={month}
                        label="Take from months"
                        onConfirm={(targets) =>
                          run(() =>
                            localBudgetPlan.moveBalance(project.id, {
                              originMonth: month,
                              direction: 'take',
                              targets: targets.map((m) => `month:${m}`),
                              amount: -remainder,
                              phase: 'actual',
                              createdBy: currentUser,
                            }),
                          )
                        }
                      />
                    </>
                  )}
                </div>
              )
            })}
            {task.added_in_actual && canEdit && (
              <div className="d-flex gap-2 align-items-center ms-3 mt-1">
                <CFormInput
                  size="sm"
                  style={{ width: 160 }}
                  placeholder="Expense name"
                  value={subtaskDraft(task.id).name}
                  onChange={(e) => setSubtaskDraft(task.id, { name: e.target.value })}
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
