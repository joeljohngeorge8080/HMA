import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'
import { localProjectLedger } from '../../../../services/localProjectLedger'
import { localBudgetPlan } from '../../../../services/localBudgetPlan'

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

/** Sum of planned_amount across every subtask in this month's tasks whose
 * activity is X, however many separate tasks they're spread over (plan §6 —
 * planned and uploaded are compared as aggregates, never row-to-row). */
const plannedByActivityKey = (tasks) => {
  const out = {}
  ;(tasks || []).forEach((task) => {
    ;(task.subtasks || []).forEach((sub) => {
      const key = sub.activity === 'other' ? `other:${sub.activity_other}` : sub.activity
      if (!key) return
      out[key] = Math.round(((out[key] || 0) + (parseFloat(sub.planned_amount) || 0)) * 100) / 100
    })
  })
  return out
}

/** Every existing subtask across this month's tasks whose activity is X —
 * used to decide whether "apply to actual" can safely overwrite one
 * subtask's actual_amount (exactly one match) or must add a new one
 * (zero or several matches, where overwriting would be a guess). */
const findSubtasksForKey = (tasks, key) => {
  const matches = []
  ;(tasks || []).forEach((task) => {
    ;(task.subtasks || []).forEach((sub) => {
      const subKey = sub.activity === 'other' ? `other:${sub.activity_other}` : sub.activity
      if (subKey === key) matches.push({ taskId: task.id, subtaskId: sub.id })
    })
  })
  return matches
}

/**
 * Read-only per-month block showing uploaded-ledger totals next to planned
 * figures (plan §8). Never feeds settlement/approval math directly — the
 * only way uploaded figures affect the plan is the PO explicitly clicking
 * "Apply to actual" on a row, which writes through the normal actual-entry
 * path (localBudgetPlan.updateActual / addActualTask+addSubtask) exactly as
 * if the PO had typed the figure in by hand.
 */
const LedgerMonthBlock = ({ project, month, tasks, monthEditable, onPlanChange }) => {
  const [error, setError] = useState('')
  const ledger = localProjectLedger.get(project.id)
  if (!ledger) return null

  const uploaded = localProjectLedger.aggregateByMonthActivity(project.id)[month]
  if (!uploaded) return null

  const planned = plannedByActivityKey(tasks)
  const keys = [...new Set([...Object.keys(uploaded), ...Object.keys(planned)])]
  const uploadedTotal = Object.values(uploaded).reduce((s, a) => s + a.total, 0)
  const plannedTotal = keys.reduce((s, k) => s + (planned[k] || 0), 0)

  const handleApply = (key, a) => {
    setError('')
    try {
      const matches = findSubtasksForKey(tasks, key)
      let updated
      if (matches.length === 1) {
        updated = localBudgetPlan.updateActual(
          project.id,
          month,
          matches[0].taskId,
          matches[0].subtaskId,
          a.total,
        )
      } else {
        updated = localBudgetPlan.addActualTask(project.id, month, {
          phase: 'implementation',
          name: 'Uploaded from Excel',
        })
        const monthEntry = updated.months.find((m) => m.month === month)
        const newTask = monthEntry.tasks[monthEntry.tasks.length - 1]
        updated = localBudgetPlan.addSubtask(project.id, month, newTask.id, {
          name: a.label,
          planned_amount: 0,
          activity: a.value,
          activity_other: a.other,
          sub_budget_head: '',
        })
        const refreshed = updated.months
          .find((m) => m.month === month)
          .tasks.find((t) => t.id === newTask.id)
        const newSub = refreshed.subtasks[refreshed.subtasks.length - 1]
        updated = localBudgetPlan.updateActual(project.id, month, newTask.id, newSub.id, a.total)
      }
      onPlanChange(updated)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="mt-2 pt-2 border-top">
      <div className="d-flex justify-content-between align-items-center small text-body-secondary mb-1">
        <span className="fw-semibold">Uploaded from Excel</span>
        <span title="Reporting only — never counted toward settlement, approval, or transfers">
          ⓘ not in settlement
        </span>
      </div>
      {keys.map((key) => {
        const a = uploaded[key]
        return (
          <div key={key} className="d-flex gap-2 align-items-center small mb-1 flex-wrap">
            <span style={{ width: 180 }}>{a ? a.label : key}</span>
            <span className="text-body-tertiary" style={{ width: 110 }}>
              planned {planned[key] ? fmt(planned[key]) : '—'}
            </span>
            <span style={{ width: 110 }}>{a ? `uploaded ${fmt(a.total)}` : ''}</span>
            {a && monthEditable && (
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => handleApply(key, a)}
              >
                Apply to actual
              </CButton>
            )}
          </div>
        )
      })}
      <div className="d-flex gap-2 fw-semibold small border-top pt-1">
        <span style={{ width: 180 }} />
        <span className="text-body-tertiary" style={{ width: 110 }}>
          {fmt(plannedTotal)}
        </span>
        <span style={{ width: 110 }}>{fmt(uploadedTotal)}</span>
      </div>
      <div className="small text-body-tertiary mt-1">
        Uploaded {new Date(ledger.uploaded_at).toLocaleDateString('en-IN')} by {ledger.uploaded_by}{' '}
        · sheet &quot;{ledger.source_sheet}&quot;
      </div>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  )
}

LedgerMonthBlock.propTypes = {
  project: PropTypes.object.isRequired,
  month: PropTypes.string.isRequired,
  tasks: PropTypes.array,
  monthEditable: PropTypes.bool,
  onPlanChange: PropTypes.func.isRequired,
}

export default LedgerMonthBlock
