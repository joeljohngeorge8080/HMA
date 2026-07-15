/**
 * localBudgetPlan.js — localStorage persistence for the two-phase project
 * budget plan (spec: docs/superpowers/specs/2026-07-15-budget-plan-two-phase-design.md).
 * Stored under its own key, one plan per project id — mirrors the
 * standalone-store convention of localProjectExpenses.js rather than
 * embedding into the project record, so this module only ever needs
 * budgetPlan.js (no dependency on localProjects.js and its demo-seed data).
 */
import { monthsInRange } from './budgetPlan.js'

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
}
