/**
 * localOrgPool.js — Organisation-wide HR & Core pool for shared expense tracking.
 *
 * Budget Distribution (per installment received):
 *  ┌──────────────┬──────────┬─────────────────────────────────────────────────┐
 *  │ Pool         │ Fixed %  │ Basis                                           │
 *  ├──────────────┼──────────┼─────────────────────────────────────────────────┤
 *  │ Project      │  85%     │ 85% of installment amount; budget designed by   │
 *  │              │          │ Project Officer after receipt                   │
 *  │ HR           │   5%     │ (project_value × 5%) ÷ total project months     │
 *  │              │          │ → equal monthly contribution, independent of    │
 *  │              │          │   individual installment timing                 │
 *  │ Core         │   5%     │ Same as HR — from total project value           │
 *  │ Admin        │   5%     │ 5% of installment amount (unchanged)            │
 *  └──────────────┴──────────┴─────────────────────────────────────────────────┘
 *
 *  Special case — Budget Not Foreseen (project_value = 0 or not set):
 *    HR & Core fall back to: (installment.amount × 5%) ÷ installment_months
 *    The `budgetNotForeseen` flag is set to true so the UI can show a warning.
 */

import { localNotifications } from './localNotifications'

const PROJECTS_KEY = 'hma_projects_v9'
const ORG_POOL_KEY = 'hma_org_pool_v1'

// ─── Fixed allocation constants ───────────────────────────────────────────────
const ADMIN_PCT = 5 // % of installment → admin overhead (unchanged)

// ─── Storage helpers ──────────────────────────────────────────────────────────

const readProjects = () => {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]')
  } catch {
    return []
  }
}

const readPool = () => {
  try {
    return JSON.parse(localStorage.getItem(ORG_POOL_KEY) || '{}')
  } catch {
    return {}
  }
}

const writePool = (data) => localStorage.setItem(ORG_POOL_KEY, JSON.stringify(data))

const uid = () => `hre_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Count months between two date strings (YYYY-MM or YYYY-MM-DD), inclusive.
 */
const monthsBetween = (start, end) => {
  if (!start || !end) return 1
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1)
}

/**
 * Total duration of a project in months (start_date → end_date, inclusive).
 * Falls back to 1 if either date is missing.
 */
const totalProjectMonths = (project) => monthsBetween(project.start_date, project.end_date)

/**
 * Returns the installment covering today, or the last installment as a fallback.
 */
const getCurrentInstallment = (project) => {
  const today = new Date().toISOString().split('T')[0]
  const insts = project.installments || []
  return (
    insts.find((i) => i.start_date <= today && (i.end_date || i.target_date) >= today) ||
    insts[insts.length - 1] ||
    null
  )
}

/**
 * Resolve the effective total project value for a project.
 */
const projectValue = (p) => p.project_value || p.project_valuation || 0

/**
 * Compute the monthly HR (or Core) budget for a project.
 *
 * New rule: (project_value × pct%) ÷ totalProjectMonths
 * Fallback (budget not foreseen / project_value = 0):
 *   (installment.amount × pct%) ÷ installmentMonths
 *
 * @param {object} project
 * @param {object} inst       – current/reference installment (for fallback)
 * @param {'hr'|'core'} poolType - the type of pool being computed
 * @returns {{ monthlyBudget, totalPoolBudget, totalProjectMonths, budgetNotForeseen, pct }}
 */
const computeHRCoreMonthly = (project, inst, poolType = 'hr') => {
  const pv = projectValue(project)
  const instEnd = inst.end_date || inst.target_date || ''
  const instMonths = monthsBetween(inst.start_date, instEnd)
  const pct = poolType === 'core' ? (project.core_pct ?? 5) : (project.hr_pct ?? 5)

  if (pv > 0) {
    const tpm = totalProjectMonths(project)
    return {
      monthlyBudget: Math.round(((pv * (pct / 100)) / tpm) * 100) / 100,
      totalPoolBudget: Math.round(pv * (pct / 100) * 100) / 100,
      totalProjectMonths: tpm,
      budgetNotForeseen: false,
      pct,
    }
  }

  // Fallback — project value unknown
  const fallbackPool = inst.amount * (pct / 100)
  return {
    monthlyBudget: Math.round((fallbackPool / instMonths) * 100) / 100,
    totalPoolBudget: Math.round(fallbackPool * 100) / 100,
    totalProjectMonths: instMonths,
    budgetNotForeseen: true,
    pct,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const localOrgPool = {
  /**
   * Returns all activated active projects with their monthly HR or Core budget
   * and share percentage across the org pool.
   *
   * HR / Core monthly budget is now based on TOTAL PROJECT VALUE:
   *   monthly = (project_value × 5%) ÷ total_project_months
   *
   * Falls back to installment-based calculation when project_value is 0/unset.
   *
   * @param {'hr'|'core'} pool
   */
  getActiveProjectMonthlyBudgets(pool = 'hr') {
    const projects = readProjects().filter(
      (p) =>
        p.is_operations_active &&
        (p.status === 'ongoing' || p.status === 'active' || p.status === 'approved'),
    )

    const budgets = projects
      .map((p) => {
        const inst = getCurrentInstallment(p)
        if (!inst) return null

        const endField = inst.end_date || inst.target_date || ''
        const instMonths = monthsBetween(inst.start_date, endField)

        const {
          monthlyBudget,
          totalPoolBudget,
          totalProjectMonths: tpm,
          budgetNotForeseen,
          pct,
        } = computeHRCoreMonthly(p, inst, pool)

        return {
          projectId: p.id,
          projectName: p.title || p.name,
          installmentId: inst.id,
          installmentLabel: inst.label,
          installmentStart: inst.start_date,
          installmentEnd: endField,
          installmentAmount: inst.amount,
          pct,
          instMonths,
          totalProjectMonths: tpm,
          poolBudget: totalPoolBudget,
          monthlyBudget,
          budgetNotForeseen,
          sharePct: 0, // filled in below
        }
      })
      .filter(Boolean)

    const total = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
    const totalRounded = Math.round(total * 100) / 100

    return budgets.map((b) => ({
      ...b,
      sharePct: total > 0 ? Math.round((b.monthlyBudget / total) * 10000) / 100 : 0,
      totalMonthlyPool: totalRounded,
    }))
  },

  /**
   * Returns all installments for a project with their full budget breakdown.
   * HR/Core monthly budget = (project_value × pct%) ÷ total project months,
   * distributed equally across all installment months.
   *
   * Each installment row contains:
   *  - projectBudget       85% of installment amount  (for project spend)
   *  - adminBudget          5% of installment amount  (admin overhead, unchanged)
   *  - hrMonthlyBudget     (project_value × 5%) ÷ total_project_months
   *  - coreMonthlyBudget   same as hrMonthlyBudget
   *  - budgetNotForeseen   true → project_value missing, fallback used
   *  - budgetDesignedByOfficer  placeholder for PO-entered project budget
   *
   * @param {string}       projectId
   * @param {'hr'|'core'}  pool  (kept for API compatibility)
   */
  getProjectInstallmentBudgets(projectId, pool = 'hr') {
    const projects = readProjects()
    const p = projects.find((pr) => pr.id === projectId)
    if (!p) return []

    const pv = projectValue(p)
    const tpm = totalProjectMonths(p)
    const globalBudgetNotForeseen = pv === 0

    const hrPct = p.hr_pct ?? 5
    const corePct = p.core_pct ?? 5

    // HR/Core monthly is the same every month across the whole project
    const globalHRMonthly = globalBudgetNotForeseen
      ? null
      : Math.round(((pv * (hrPct / 100)) / tpm) * 100) / 100

    const globalCoreMonthly = globalBudgetNotForeseen
      ? null
      : Math.round(((pv * (corePct / 100)) / tpm) * 100) / 100

    // Pool-specific pct and installment list (sridd3 equal-distribution approach)
    const pct = pool === 'core' ? corePct : hrPct
    const installments = p.installments || []

    // Total project value for pool budget (use best available field)
    const totalProjectValue =
      p.project_value || p.project_valuation || p.amount_sanctioned || 0
    const totalHRBudget = totalProjectValue * (pct / 100)

    // Count total months across ALL installments combined
    const totalMonths = Math.max(
      1,
      installments.reduce((sum, inst) => {
        const endField = inst.end_date || inst.target_date || ''
        return sum + monthsBetween(inst.start_date, endField)
      }, 0),
    )

    // Equal monthly share for every month of the project
    const monthlyBudget = Math.round((totalHRBudget / totalMonths) * 100) / 100

    return installments.map((inst) => {
      const endField = inst.end_date || inst.target_date || ''
      const instMonths = monthsBetween(inst.start_date, endField)
      const months = instMonths
      const instPoolBudget = Math.round(monthlyBudget * months * 100) / 100

      // Project spend receives the remaining percentage
      const projectPct = 100 - ADMIN_PCT - hrPct - corePct
      const projectBudget = Math.round(inst.amount * (projectPct / 100) * 100) / 100

      // 5% of installment → admin (unchanged)
      const adminBudget = Math.round(inst.amount * (ADMIN_PCT / 100) * 100) / 100

      // HR / Core monthly
      let hrMonthlyBudget, coreMonthlyBudget, budgetNotForeseen
      if (globalBudgetNotForeseen) {
        // Fallback: hrPct / corePct of installment ÷ installment months
        hrMonthlyBudget = Math.round(((inst.amount * (hrPct / 100)) / instMonths) * 100) / 100
        coreMonthlyBudget = Math.round(((inst.amount * (corePct / 100)) / instMonths) * 100) / 100
        budgetNotForeseen = true
      } else {
        hrMonthlyBudget = globalHRMonthly
        coreMonthlyBudget = globalCoreMonthly
        budgetNotForeseen = false
      }

      // Month-by-month label list (for calendar views)
      const monthList = []
      if (inst.start_date && endField) {
        let [cy, cm] = inst.start_date.split('-').map(Number)
        const [ey, em] = endField.split('-').map(Number)
        while (cy < ey || (cy === ey && cm <= em)) {
          monthList.push(`${cy}-${String(cm).padStart(2, '0')}`)
          cm++
          if (cm > 12) {
            cm = 1
            cy++
          }
        }
      }

      return {
        // Identifiers
        installmentId: inst.id,
        installmentLabel: inst.label,
        installmentStart: inst.start_date,
        installmentEnd: endField,
        installmentAmount: inst.amount,
        percentage: inst.percentage,
        ucStatus: inst.uc_status,

        // Duration
        instMonths,
        months,
        totalProjectMonths: tpm,
        totalMonths,
        monthList,

        // Budget breakdown
        projectBudget, // remaining % of installment — PO designs this
        adminBudget, // 5%  of installment
        hrMonthlyBudget, // hrPct of project_value ÷ total months
        coreMonthlyBudget, // corePct of project_value ÷ total months
        hrPoolTotal: globalBudgetNotForeseen ? null : Math.round(pv * (hrPct / 100) * 100) / 100,
        corePoolTotal: globalBudgetNotForeseen
          ? null
          : Math.round(pv * (corePct / 100) * 100) / 100,
        pct: pool === 'core' ? corePct : hrPct,
        hrPct,
        corePct,
        projectPct,
        adminPct: ADMIN_PCT,

        // sridd3 equal-distribution fields
        totalHRBudget: Math.round(totalHRBudget * 100) / 100,

        // Flags
        budgetNotForeseen,
        budgetDesignedByOfficer: inst.budget_designed_by_officer || null,

        // Legacy compat fields used by old visualiser
        poolBudget: (pool === 'core' ? coreMonthlyBudget : hrMonthlyBudget) * instMonths,
        monthlyBudget: pool === 'core' ? coreMonthlyBudget : hrMonthlyBudget,
      }
    })
  },


  /**
   * Splits a given expense amount proportionally across all activated projects
   * by their monthly HR or Core contribution weight.
   */
  computeAllocations(pool, amount) {
    const budgets = this.getActiveProjectMonthlyBudgets(pool)
    return budgets.map((b) => ({
      projectId: b.projectId,
      projectName: b.projectName,
      installmentId: b.installmentId,
      sharePct: b.sharePct,
      amountCharged: Math.round(amount * (b.sharePct / 100) * 100) / 100,
    }))
  },

  // ── HR Expense CRUD ────────────────────────────────────────────────────────

  getHRExpenses() {
    return readPool().hr_expenses || []
  },

  checkHRBudgetThresholds() {
    const budgets = this.getActiveProjectMonthlyBudgets('hr')
    budgets.forEach((b) => {
      const summary = this.getProjectHRBudgetSummary(b.projectId)
      if (summary.isActive && summary.poolBudget > 0) {
        const remainingPct = summary.remaining / summary.poolBudget
        if (remainingPct <= 0.1) {
          const existing = localNotifications
            .getNotifications('HR')
            .find(
              (n) =>
                n.relatedProjectId === b.projectId &&
                !n.read &&
                n.message.includes('nearing exhaustion'),
            )
          if (!existing) {
            localNotifications.addNotification({
              message: `HR Budget for project "${b.projectName}" is nearing exhaustion (${Math.round(remainingPct * 100)}% remaining).`,
              roleTarget: 'HR',
              relatedProjectId: b.projectId,
              type: 'danger',
            })
          }
        }
      }
    })
  },

  addHRExpense(expense, enteredByProjectId) {
    const pool = readPool()
    const allocations = this.computeAllocations('hr', parseFloat(expense.amount) || 0)
    const newExp = {
      id: uid(),
      label: expense.label || '',
      vendor: expense.vendor || '',
      frequency: expense.frequency || 'Monthly',
      yearly_price: parseFloat(expense.yearly_price) || 0,
      amount: parseFloat(expense.amount) || 0,
      date: expense.date || '',
      notes: expense.notes || '',
      entered_by_project_id: enteredByProjectId,
      project_allocations: allocations,
      created_at: new Date().toISOString(),
    }
    pool.hr_expenses = [...(pool.hr_expenses || []), newExp]
    writePool(pool)
    setTimeout(() => this.checkHRBudgetThresholds(), 100)
    return newExp
  },

  removeHRExpense(expenseId) {
    const pool = readPool()
    pool.hr_expenses = (pool.hr_expenses || []).filter((e) => e.id !== expenseId)
    writePool(pool)
  },

  updateHRExpense(expenseId, data) {
    const pool = readPool()
    pool.hr_expenses = (pool.hr_expenses || []).map((e) => {
      if (e.id !== expenseId) return e
      const updated = { ...e, ...data }
      if (data.amount !== undefined) {
        updated.project_allocations = this.computeAllocations('hr', parseFloat(data.amount) || 0)
      }
      return updated
    })
    writePool(pool)
    setTimeout(() => this.checkHRBudgetThresholds(), 100)
  },

  /**
   * Returns all HR expense records allocated to this project,
   * with myAmount recomputed dynamically from current active project weights.
   * This ensures newly added HR expenses always reflect in PMS regardless of
   * when the expense was created or what project_allocations was stored.
   */
  getProjectHRCharges(projectId) {
    // Recompute current share weights for all active projects
    const budgets = this.getActiveProjectMonthlyBudgets('hr')
    const mine = budgets.find((b) => b.projectId === projectId)
    if (!mine) return [] // project not active → no charges

    const total = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
    const mySharePct = total > 0 ? (mine.monthlyBudget / total) * 100 : 0

    return (readPool().hr_expenses || []).map((exp) => ({
      ...exp,
      myAmount: Math.round(parseFloat(exp.amount || 0) * (mySharePct / 100) * 100) / 100,
      mySharePct: Math.round(mySharePct * 100) / 100,
      isFromThisProject: exp.entered_by_project_id === projectId,
    }))
  },

  /**
   * Returns this project's HR budget summary for the current installment.
   */
  getProjectHRBudgetSummary(projectId) {
    const budgets = this.getActiveProjectMonthlyBudgets('hr')
    const mine = budgets.find((b) => b.projectId === projectId)

    const charges = this.getProjectHRCharges(projectId)
    const totalCharged = charges.reduce((s, c) => s + (c.myAmount || 0), 0)

    if (!mine) {
      return {
        isActive: false,
        monthlyBudget: 0,
        poolBudget: 0,
        sharePct: 0,
        totalMonthlyPool: 0,
        totalCharged: Math.round(totalCharged * 100) / 100,
        remaining: 0,
        activeProjectCount: budgets.length,
        budgetNotForeseen: false,
      }
    }

    return {
      isActive: true,
      monthlyBudget: mine.monthlyBudget,
      poolBudget: mine.poolBudget,
      sharePct: mine.sharePct,
      totalMonthlyPool: mine.totalMonthlyPool,
      totalCharged: Math.round(totalCharged * 100) / 100,
      remaining: Math.round((mine.poolBudget - totalCharged) * 100) / 100,
      activeProjectCount: budgets.length,
      budgetNotForeseen: mine.budgetNotForeseen,
      totalProjectMonths: mine.totalProjectMonths,
    }
  },

  /** Returns all HR expenses in the org pool. */
  getAllHRExpenses() {
    return readPool().hr_expenses || []
  },

  getProjectCoreCharges(projectId) {
    return (readPool().core_expenses || [])
      .map((exp) => {
        const alloc = (exp.project_allocations || []).find((a) => a.projectId === projectId)
        if (!alloc) return null
        return {
          ...exp,
          myAmount: alloc.amountCharged,
          mySharePct: alloc.sharePct,
          isFromThisProject: exp.entered_by_project_id === projectId,
        }
      })
      .filter(Boolean)
  },

  getProjectCoreBudgetSummary(projectId) {
    const budgets = this.getActiveProjectMonthlyBudgets('core')
    const mine = budgets.find((b) => b.projectId === projectId)

    const charges = this.getProjectCoreCharges(projectId)
    const totalCharged = charges.reduce((s, c) => s + (c.myAmount || 0), 0)

    if (!mine) {
      return {
        isActive: false,
        monthlyBudget: 0,
        poolBudget: 0,
        sharePct: 0,
        totalMonthlyPool: 0,
        totalCharged: Math.round(totalCharged * 100) / 100,
        remaining: 0,
        activeProjectCount: budgets.length,
        budgetNotForeseen: false,
      }
    }

    return {
      isActive: true,
      monthlyBudget: mine.monthlyBudget,
      poolBudget: mine.poolBudget,
      sharePct: mine.sharePct,
      totalMonthlyPool: mine.totalMonthlyPool,
      totalCharged: Math.round(totalCharged * 100) / 100,
      remaining: Math.round((mine.poolBudget - totalCharged) * 100) / 100,
      activeProjectCount: budgets.length,
      budgetNotForeseen: mine.budgetNotForeseen,
      totalProjectMonths: mine.totalProjectMonths,
    }
  },

  // ── Core Expense CRUD ──────────────────────────────────────────────────────

  getCoreExpenses() {
    return readPool().core_expenses || []
  },

  addCoreExpense(expense, enteredByProjectId) {
    const pool = readPool()
    const allocations = this.computeAllocations('core', parseFloat(expense.amount) || 0)
    const newExp = {
      id: uid().replace('hre_', 'core_'),
      label: expense.label || '',
      amount: parseFloat(expense.amount) || 0,
      date: expense.date || '',
      notes: expense.notes || '',
      entered_by_project_id: enteredByProjectId,
      project_allocations: allocations,
      created_at: new Date().toISOString(),
    }
    pool.core_expenses = [...(pool.core_expenses || []), newExp]
    writePool(pool)
    return newExp
  },

  removeCoreExpense(expenseId) {
    const pool = readPool()
    pool.core_expenses = (pool.core_expenses || []).filter((e) => e.id !== expenseId)
    writePool(pool)
  },

  updateCoreExpense(expenseId, data) {
    const pool = readPool()
    pool.core_expenses = (pool.core_expenses || []).map((e) => {
      if (e.id !== expenseId) return e
      const updated = { ...e, ...data }
      if (data.amount !== undefined) {
        updated.project_allocations = this.computeAllocations('core', parseFloat(data.amount) || 0)
      }
      return updated
    })
    writePool(pool)
  },

  /**
   * Returns all Core expense records allocated to this project,
   * with myAmount recomputed dynamically from current active project weights.
   */
  getProjectCoreCharges(projectId) {
    const budgets = this.getActiveProjectMonthlyBudgets('core')
    const mine = budgets.find((b) => b.projectId === projectId)
    if (!mine) return []

    const total = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
    const mySharePct = total > 0 ? (mine.monthlyBudget / total) * 100 : 0

    return (readPool().core_expenses || []).map((exp) => ({
      ...exp,
      myAmount: Math.round(parseFloat(exp.amount || 0) * (mySharePct / 100) * 100) / 100,
      mySharePct: Math.round(mySharePct * 100) / 100,
      isFromThisProject: exp.entered_by_project_id === projectId,
    }))
  },

  /**
   * Returns this project's Core budget summary for the current installment.
   */
  getProjectCoreBudgetSummary(projectId) {
    const budgets = this.getActiveProjectMonthlyBudgets('core')
    const mine = budgets.find((b) => b.projectId === projectId)

    const charges = this.getProjectCoreCharges(projectId)
    const totalCharged = charges.reduce((s, c) => s + (c.myAmount || 0), 0)

    if (!mine) {
      return {
        isActive: false,
        monthlyBudget: 0,
        poolBudget: 0,
        sharePct: 0,
        totalMonthlyPool: 0,
        totalCharged: Math.round(totalCharged * 100) / 100,
        remaining: 0,
        activeProjectCount: budgets.length,
        budgetNotForeseen: false,
      }
    }

    return {
      isActive: true,
      monthlyBudget: mine.monthlyBudget,
      poolBudget: mine.poolBudget,
      sharePct: mine.sharePct,
      totalMonthlyPool: mine.totalMonthlyPool,
      totalCharged: Math.round(totalCharged * 100) / 100,
      remaining: Math.round((mine.poolBudget - totalCharged) * 100) / 100,
      activeProjectCount: budgets.length,
      budgetNotForeseen: mine.budgetNotForeseen,
      totalProjectMonths: mine.totalProjectMonths,
    }
  },

  /** Returns all Core expenses in the org pool. */
  getAllCoreExpenses() {
    return readPool().core_expenses || []
  },

  /** 5% (admin_pct) of total project value — credited once, as a lump sum. */
  computeAdminPoolAmount(project) {
    const pv = projectValue(project)
    const pct = project.admin_pct ?? 5
    return Math.round(pv * (pct / 100) * 100) / 100
  },

  /** Appends a lump-sum admin credit record (org-wide ledger, mirrors hr/core expense arrays). */
  recordAdminCredit(projectId, amount) {
    const pool = readPool()
    const record = { id: uid(), projectId, amount, createdAt: new Date().toISOString() }
    pool.admin_pool_credits = [...(pool.admin_pool_credits || []), record]
    writePool(pool)
    return record
  },

  /** Returns all admin pool lump-sum credit records. */
  getAdminPoolCredits() {
    return readPool().admin_pool_credits || []
  },
}
