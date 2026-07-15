/**
 * localBudgetPlan.js — localStorage persistence for the two-phase project
 * budget plan (spec: docs/superpowers/specs/2026-07-15-budget-plan-two-phase-design.md).
 * Stored under its own key, one plan per project id — mirrors the
 * standalone-store convention of localProjectExpenses.js rather than
 * embedding into the project record, so this module only ever needs
 * budgetPlan.js (no dependency on localProjects.js and its demo-seed data).
 */
import { monthsInRange, equalSplit } from './budgetPlan.js'

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
}
