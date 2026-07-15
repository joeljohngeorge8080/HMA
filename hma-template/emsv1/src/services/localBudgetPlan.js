/**
 * localBudgetPlan.js — localStorage persistence for the two-phase project
 * budget plan (spec: docs/superpowers/specs/2026-07-15-budget-plan-two-phase-design.md).
 * Stored under its own key, one plan per project id — mirrors the
 * standalone-store convention of localProjectExpenses.js rather than
 * embedding into the project record, so this module only ever needs
 * budgetPlan.js (no dependency on localProjects.js and its demo-seed data).
 */
import {
  monthsInRange,
  equalSplit,
  validateTransfer,
  removeTransfersOriginatingFrom,
  settlementCheck,
} from './budgetPlan.js'

const KEY = 'hma_budget_plans_v1'

const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
const now = () => new Date().toISOString()

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}
const writeAll = (all) => localStorage.setItem(KEY, JSON.stringify(all))

const emptyMonths = (months) => months.map((month) => ({ month, tasks: [] }))

const requirePlan = (all, projectId) => {
  const plan = all[projectId]
  if (!plan) throw new Error('No budget plan exists for this project yet.')
  return plan
}

export const localBudgetPlan = {
  getPlan(projectId) {
    return readAll()[projectId] || null
  },

  /** Test-only direct writer — lets verify scripts set up mutated fixtures
   * without duplicating every mutation helper. Not used by any UI code. */
  __setPlanForTest(projectId, plan) {
    const all = readAll()
    all[projectId] = plan
    writeAll(all)
  },

  initializePlan(projectId, { projectValue, startDate, endDate, poolPct }) {
    const all = readAll()
    if (all[projectId]) {
      throw new Error('A budget plan already exists for this project — use Full Delete first.')
    }
    const months = monthsInRange(startDate, endDate)
    if (months.length === 0) {
      throw new Error('Project must have a start and end date before initializing a plan.')
    }
    const plan = {
      version: 2,
      status: 'planning',
      submitted_at: null,
      project_value: projectValue,
      start_date: startDate,
      end_date: endDate,
      pool_pct: { admin: poolPct?.admin ?? 5, hr: poolPct?.hr ?? 5, core: poolPct?.core ?? 5 },
      months: emptyMonths(months),
      transfers: [],
      saved_snapshot: null,
    }
    all[projectId] = plan
    writeAll(all)
    return plan
  },

  save(projectId) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    plan.saved_snapshot = {
      months: JSON.parse(JSON.stringify(plan.months)),
      transfers: JSON.parse(JSON.stringify(plan.transfers)),
      saved_at: now(),
    }
    writeAll(all)
    return plan
  },

  reset(projectId) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    if (plan.saved_snapshot) {
      plan.months = JSON.parse(JSON.stringify(plan.saved_snapshot.months))
      plan.transfers = JSON.parse(JSON.stringify(plan.saved_snapshot.transfers))
    } else {
      plan.months = emptyMonths(plan.months.map((m) => m.month))
      plan.transfers = []
    }
    writeAll(all)
    return plan
  },

  fullDelete(projectId) {
    const all = readAll()
    delete all[projectId]
    writeAll(all)
  },

  requirePlanning(plan) {
    if (plan.status !== 'planning') {
      throw new Error('Plan is locked — planning is closed.')
    }
  },

  addTask(projectId, month, { phase, name, recurring = false }) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    const monthEntry = plan.months.find((m) => m.month === month)
    if (!monthEntry) throw new Error(`${month} is not part of this plan.`)
    monthEntry.tasks.push({
      id: uid('task'),
      phase,
      name: (name || '').trim(),
      recurring,
      added_in_actual: false,
      subtasks: [],
    })
    writeAll(all)
    return plan
  },

  removeTask(projectId, month, taskId) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    const monthEntry = plan.months.find((m) => m.month === month)
    if (!monthEntry) throw new Error(`${month} is not part of this plan.`)
    monthEntry.tasks = monthEntry.tasks.filter((t) => t.id !== taskId)
    writeAll(all)
    return plan
  },

  addSubtask(projectId, month, taskId, { name, planned_amount }) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    const monthEntry = plan.months.find((m) => m.month === month)
    if (!monthEntry) throw new Error(`${month} is not part of this plan.`)
    const task = monthEntry.tasks.find((t) => t.id === taskId)
    if (!task) throw new Error('Task not found.')
    if (!task.added_in_actual) localBudgetPlan.requirePlanning(plan)
    task.subtasks.push({
      id: uid('sub'),
      name: (name || '').trim(),
      planned_amount: Math.round((parseFloat(planned_amount) || 0) * 100) / 100,
      actual_amount: 0,
      actual_status: 'pending',
    })
    writeAll(all)
    return plan
  },

  removeSubtask(projectId, month, taskId, subtaskId) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    const monthEntry = plan.months.find((m) => m.month === month)
    if (!monthEntry) throw new Error(`${month} is not part of this plan.`)
    const task = monthEntry.tasks.find((t) => t.id === taskId)
    if (!task) throw new Error('Task not found.')
    task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId)
    writeAll(all)
    return plan
  },

  updateSubtaskPlanned(projectId, month, taskId, subtaskId, amount) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    const monthEntry = plan.months.find((m) => m.month === month)
    if (!monthEntry) throw new Error(`${month} is not part of this plan.`)
    const task = monthEntry.tasks.find((t) => t.id === taskId)
    if (!task) throw new Error('Task not found.')
    const subtask = task.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) throw new Error('Subtask not found.')
    subtask.planned_amount = Math.round((parseFloat(amount) || 0) * 100) / 100
    writeAll(all)
    return plan
  },

  /** Divides `totalAmount` equally across every month, creating one
   * recurring task + single subtask per month (spec Section 4.1). */
  applyRecurringTasks(projectId, { phase, name, totalAmount }) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    const amt = Math.round((parseFloat(totalAmount) || 0) * 100) / 100
    if (amt <= 0) throw new Error('Total amount must be greater than zero.')
    if (!name || !name.trim()) throw new Error('A task name is required.')
    const shares = equalSplit(amt, plan.months.length)
    plan.months.forEach((monthEntry, i) => {
      monthEntry.tasks.push({
        id: uid('task'),
        phase,
        name: name.trim(),
        recurring: true,
        added_in_actual: false,
        subtasks: [
          {
            id: uid('sub'),
            name: name.trim(),
            planned_amount: shares[i],
            actual_amount: 0,
            actual_status: 'pending',
          },
        ],
      })
    })
    writeAll(all)
    return plan
  },

  buildMonthTasksByMonth(plan) {
    return Object.fromEntries(plan.months.map((m) => [m.month, m.tasks]))
  },

  buildTransferCtx(plan) {
    return {
      projectValue: plan.project_value,
      poolPct: plan.pool_pct,
      months: plan.months.map((m) => m.month),
      monthTasksByMonth: localBudgetPlan.buildMonthTasksByMonth(plan),
      transfers: plan.transfers,
    }
  },

  /**
   * Moves `amount` either away from `originMonth` (direction 'send', split
   * across `targets`) or into it (direction 'take', drawn from `targets`),
   * validating and appending one ledger record per target. `subtaskRef`
   * (actual phase only) flags the originating subtask 'transferred' when
   * sending its remainder away (spec Section 6).
   */
  moveBalance(
    projectId,
    { originMonth, direction, targets, amount, phase, createdBy, subtaskRef },
  ) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    const amt = Math.round((parseFloat(amount) || 0) * 100) / 100
    if (amt <= 0) throw new Error('Amount must be greater than zero.')
    if (!targets || targets.length === 0) throw new Error('Select at least one destination.')

    const shares = equalSplit(amt, targets.length)
    const ctx = localBudgetPlan.buildTransferCtx(plan)
    const newTransfers = []

    targets.forEach((target, i) => {
      const share = shares[i]
      const from = direction === 'send' ? `month:${originMonth}` : target
      const to = direction === 'send' ? target : `month:${originMonth}`
      const validation = validateTransfer(
        { ...ctx, phase, transfers: [...ctx.transfers, ...newTransfers] },
        { from, to, amount: share },
      )
      if (!validation.valid) throw new Error(validation.error)
      newTransfers.push({
        id: uid('xfer'),
        phase,
        origin_month: originMonth,
        from,
        to,
        amount: share,
        created_at: now(),
        created_by: createdBy || 'Unknown',
      })
    })

    plan.transfers = [...plan.transfers, ...newTransfers]

    if (subtaskRef && direction === 'send' && phase === 'actual') {
      const monthEntry = plan.months.find((m) => m.month === subtaskRef.month)
      const task = monthEntry?.tasks.find((t) => t.id === subtaskRef.taskId)
      const subtask = task?.subtasks.find((s) => s.id === subtaskRef.subtaskId)
      if (subtask) subtask.actual_status = 'transferred'
    }

    writeAll(all)
    return plan
  },

  /** Removes one ledger record by id. Planning-phase transfers are frozen once submitted. */
  revokeTransfer(projectId, transferId) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    const transfer = plan.transfers.find((t) => t.id === transferId)
    if (!transfer) throw new Error('Transfer not found.')
    if (transfer.phase === 'planning' && plan.status === 'submitted') {
      throw new Error('Planning transfers are locked after submit.')
    }
    plan.transfers = plan.transfers.filter((t) => t.id !== transferId)
    writeAll(all)
    return plan
  },

  /**
   * Reset this month: restore its tasks from the save snapshot (or empty)
   * AND drop every ledger transfer this month originated (which restores
   * every other month/pool that transfer touched) — spec Section 4.2.
   * Transfers where this month is only a counterparty (originated by a
   * DIFFERENT month) are kept.
   */
  resetMonth(projectId, month) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    const monthEntry = plan.months.find((m) => m.month === month)
    if (!monthEntry) throw new Error(`${month} is not part of this plan.`)

    const savedMonth = plan.saved_snapshot?.months.find((m) => m.month === month)
    monthEntry.tasks = savedMonth ? JSON.parse(JSON.stringify(savedMonth.tasks)) : []
    plan.transfers = removeTransfersOriginatingFrom(plan.transfers, month)

    writeAll(all)
    return plan
  },

  /**
   * The header HR/Core amount input (spec Section 4.1): upserts the single
   * pool→month adjustment tagged 'pool_cap_adjustment' for this pool,
   * capped so the pool's balance never exceeds its original pct cap.
   * Raising back to exactly the cap removes the adjustment (no no-op record).
   */
  setPoolCapAdjustment(projectId, { pool, targetMonth, newAmount, createdBy }) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    if (pool !== 'hr' && pool !== 'core') throw new Error('Pool must be hr or core.')

    const cap = Math.round(((plan.project_value * (plan.pool_pct[pool] || 0)) / 100) * 100) / 100
    const amt = Math.round((parseFloat(newAmount) || 0) * 100) / 100
    if (amt > cap + 0.005) {
      throw new Error(`${pool.toUpperCase()} cannot be raised above its set ₹${cap.toFixed(2)}.`)
    }
    if (amt < 0) throw new Error(`${pool.toUpperCase()} cannot go below zero.`)

    const delta = Math.round((cap - amt) * 100) / 100
    const withoutExisting = plan.transfers.filter(
      (t) => !(t.tag === 'pool_cap_adjustment' && t.pool_ref === pool),
    )

    if (Math.abs(delta) < 0.01) {
      plan.transfers = withoutExisting
    } else {
      plan.transfers = [
        ...withoutExisting,
        {
          id: uid('xfer'),
          phase: 'planning',
          origin_month: targetMonth,
          from: pool,
          to: `month:${targetMonth}`,
          amount: delta,
          tag: 'pool_cap_adjustment',
          pool_ref: pool,
          created_at: now(),
          created_by: createdBy || 'Unknown',
        },
      ]
    }
    writeAll(all)
    return plan
  },

  computeSettlement(projectId) {
    const plan = requirePlan(readAll(), projectId)
    return settlementCheck(localBudgetPlan.buildTransferCtx(plan))
  },

  /** Submits the plan (spec Section 5) — blocked until settlementCheck.valid. */
  submit(projectId) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    const check = settlementCheck(localBudgetPlan.buildTransferCtx(plan))
    if (!check.valid) {
      throw new Error(
        'Plan is not fully settled — settle every month (and any HR/Core/Admin shortfall) before submitting.',
      )
    }
    plan.status = 'submitted'
    plan.submitted_at = now()
    writeAll(all)
    return plan
  },

  /**
   * The one last-resort submit-time action (spec Section 5): draws the
   * settlementCheck's reported adminDraw.amount from Admin, split equally
   * across every month still in deficit after HR/Core's own capacity is
   * accounted for by settlementCheck's math.
   */
  drawFromAdmin(projectId, { createdBy }) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requirePlanning(plan)
    const check = settlementCheck(localBudgetPlan.buildTransferCtx(plan))
    if (!check.adminDraw || check.adminDraw.amount <= 0) {
      throw new Error('No Admin draw is needed right now.')
    }
    const deficitMonths = check.monthIssues.filter((i) => i.diff > 0).map((i) => i.month)
    const shares = equalSplit(check.adminDraw.amount, deficitMonths.length)
    const newTransfers = deficitMonths.map((month, i) => ({
      id: uid('xfer'),
      phase: 'planning',
      origin_month: month,
      from: 'admin',
      to: `month:${month}`,
      amount: shares[i],
      created_at: now(),
      created_by: createdBy || 'Unknown',
    }))
    plan.transfers = [...plan.transfers, ...newTransfers]
    writeAll(all)
    return plan
  },

  requireSubmitted(plan) {
    if (plan.status !== 'submitted') {
      throw new Error('Actual expense entry opens only after the plan is submitted.')
    }
  },

  updateActual(projectId, month, taskId, subtaskId, amount) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requireSubmitted(plan)
    const monthEntry = plan.months.find((m) => m.month === month)
    const task = monthEntry?.tasks.find((t) => t.id === taskId)
    const subtask = task?.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) throw new Error('Subtask not found.')
    const amt = Math.round((parseFloat(amount) || 0) * 100) / 100
    subtask.actual_amount = amt
    subtask.actual_status = amt > 0 ? 'entered' : 'pending'
    writeAll(all)
    return plan
  },

  /** New task row added during actual entry — has no planned amount (spec Section 6). */
  addActualTask(projectId, month, { phase, name }) {
    const all = readAll()
    const plan = requirePlan(all, projectId)
    localBudgetPlan.requireSubmitted(plan)
    const monthEntry = plan.months.find((m) => m.month === month)
    if (!monthEntry) throw new Error(`${month} is not part of this plan.`)
    monthEntry.tasks.push({
      id: uid('task'),
      phase,
      name: (name || '').trim(),
      recurring: false,
      added_in_actual: true,
      subtasks: [],
    })
    writeAll(all)
    return plan
  },
}
