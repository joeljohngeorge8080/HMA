/**
 * localOrgPool.js — Organisation-wide HR & Core pool for shared expense tracking.
 *
 * Budget Rules (Revised):
 *
 *  ADMIN:
 *    - Active from project creation, across ALL months of project duration
 *    - Monthly = project_value × admin_pct% ÷ total_project_months
 *
 *  HR & CORE:
 *    - FROZEN at ₹0 until "Activate Project" is clicked in PMS
 *      (operations_activated_month is set at that point)
 *    - Once activated, distributed from that month onwards
 *    - Monthly = project_value × effective_pct% ÷ total_project_months
 *    - effective_pct comes from pool_pct_adjustments for the month, or default
 *    - % may be REDUCED from any month — frees budget for project direct work
 *
 *  DIRECT PROJECT:
 *    - Per month = installment_amount × (100 - admin - hr - core)% ÷ installment_months
 *    - Reducing HR/Core % increases the direct %
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

// ─── New: month-aware helpers ─────────────────────────────────────────────────────────

/** Convert a date string (YYYY-MM-DD or YYYY-MM) to YYYY-MM. */
const toYM = (dateStr) => (dateStr ? dateStr.slice(0, 7) : null)

/**
 * Derive the activation month. Prefers the explicit operations_activated_month
 * field (set by the new activateProject()); falls back to the legacy
 * operations_activated_at ISO timestamp for projects activated before this change.
 */
const getActivationMonth = (project) =>
  project.operations_activated_month ||
  (project.operations_activated_at ? project.operations_activated_at.slice(0, 7) : null)

/**
 * Get the effective HR and Core percentages for a specific month,
 * honouring any pool_pct_adjustments on the project.
 * Adjustments are sorted by from_month; the latest one ≤ month wins.
 */
const getEffectivePoolPcts = (project, month) => {
  const adj = (project.pool_pct_adjustments || []).filter((a) => a.from_month <= month)
  if (!adj.length) {
    return { hr_pct: project.hr_pct ?? 5, core_pct: project.core_pct ?? 5, isAdjusted: false }
  }
  const latest = adj[adj.length - 1]
  return {
    hr_pct: latest.hr_pct,
    core_pct: latest.core_pct,
    isAdjusted: true,
    adjustedFrom: latest.from_month,
  }
}

/**
 * Build an ordered month list (YYYY-MM strings) from startDate to endDate, inclusive.
 */
const buildMonthList = (startDate, endDate) => {
  const months = []
  if (!startDate || !endDate) return months
  let [cy, cm] = startDate.split('-').map(Number)
  const [ey, em] = endDate.split('-').map(Number)
  while (cy < ey || (cy === ey && cm <= em)) {
    months.push(`${cy}-${String(cm).padStart(2, '0')}`)
    cm++
    if (cm > 12) {
      cm = 1
      cy++
    }
  }
  return months
}

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
   * for the current month, using adjustment-aware effective percentages.
   *
   * HR/Core: only included after operations_activated_month.
   * Pool budget: sum of per-month contributions from activation to project end.
   */
  getActiveProjectMonthlyBudgets(pool = 'hr') {
    const todayYM = new Date().toISOString().slice(0, 7) // YYYY-MM

    const statusOk = (p) =>
      p.status === 'ongoing' || p.status === 'active' || p.status === 'approved'
    const projects = readProjects().filter((p) =>
      pool === 'admin' ? statusOk(p) : p.is_operations_active && statusOk(p),
    )

    const budgets = projects
      .map((p) => {
        if (pool === 'admin') {
          const pv = projectValue(p)
          const tpm = totalProjectMonths(p)
          const pct = p.admin_pct ?? 5
          const monthlyBudget = pv > 0 ? Math.round(((pv * (pct / 100)) / tpm) * 100) / 100 : 0
          const poolBudget = pv > 0 ? Math.round(pv * (pct / 100) * 100) / 100 : 0
          return {
            projectId: p.id,
            projectName: p.title || p.name,
            installmentId: null,
            installmentLabel: null,
            pct,
            totalProjectMonths: tpm,
            poolBudget,
            monthlyBudget,
            budgetNotForeseen: pv === 0,
            sharePct: 0, // filled below
            activationMonth: null,
          }
        }

        // HR/Core only apply from the month the project was activated
        const activationMonth = getActivationMonth(p)
        if (!activationMonth || activationMonth > todayYM) return null

        const inst = getCurrentInstallment(p)
        if (!inst) return null

        const pv = projectValue(p)
        const tpm = totalProjectMonths(p)
        const pcts = getEffectivePoolPcts(p, todayYM)
        const pct = pool === 'core' ? pcts.core_pct : pcts.hr_pct

        // Monthly budget for this pool at today's effective %
        const monthlyBudget = pv > 0 ? Math.round(((pv * (pct / 100)) / tpm) * 100) / 100 : 0

        // Total pool budget = sum across all active months (activation → project end)
        const allMonths = buildMonthList(p.start_date, p.end_date)
        const poolBudget = allMonths.reduce((sum, month) => {
          if (month < activationMonth) return sum
          const mPcts = getEffectivePoolPcts(p, month)
          const mPct = pool === 'core' ? mPcts.core_pct : mPcts.hr_pct
          return sum + (pv > 0 ? Math.round(((pv * (mPct / 100)) / tpm) * 100) / 100 : 0)
        }, 0)

        const endField = inst.end_date || inst.target_date || ''
        const instMonths = monthsBetween(inst.start_date, endField)

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
          poolBudget: Math.round(poolBudget * 100) / 100,
          monthlyBudget,
          budgetNotForeseen: pv === 0,
          sharePct: 0, // filled below
          activationMonth,
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
    const totalProjectValue = p.project_value || p.project_valuation || p.amount_sanctioned || 0
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
   * Builds a complete month-by-month budget breakdown for ONE project.
   *
   * Rules implemented:
   *  Admin  : project_value × admin_pct% ÷ total_months — every month from creation
   *  HR     : ₹0 before operations_activated_month; after: project_value × effective_hr_pct% ÷ total_months
   *  Core   : same freeze rule as HR
   *  Direct : installment_amount × (100 - admin - hr - core)% ÷ installment_months
   *           Reducing HR/Core raises Direct for those months.
   *
   * @param {object} project  full project record from localProjects
   * @returns {Array<{
   *   month, isActive,
   *   adminBudget, hrBudget, coreBudget, directBudget,
   *   admin_pct, hr_pct, core_pct, direct_pct,
   *   isAdjusted, hasNewAdjustment,
   *   installmentId, installmentLabel, phaseName
   * }>}
   */
  buildProjectMonthlyBreakdown(project) {
    const pv = project.project_value || project.project_valuation || project.amount_sanctioned || 0
    const tpm = totalProjectMonths(project)
    const adminPct = project.admin_pct ?? 5
    const activationMonth = getActivationMonth(project)

    // Admin: fixed per-month amount from project_value, spread across ALL months
    const adminMonthly = pv > 0 ? Math.round(((pv * (adminPct / 100)) / tpm) * 100) / 100 : 0

    // Full month list for this project
    const months = buildMonthList(project.start_date, project.end_date)

    return months.map((month) => {
      const isActive = !!(activationMonth && month >= activationMonth)
      const pcts = getEffectivePoolPcts(project, month)

      // HR / Core: ₹0 before activation
      const effectiveHrPct = isActive ? pcts.hr_pct : 0
      const effectiveCorePct = isActive ? pcts.core_pct : 0
      const hrBudget =
        isActive && pv > 0 ? Math.round(((pv * (pcts.hr_pct / 100)) / tpm) * 100) / 100 : 0
      const coreBudget =
        isActive && pv > 0 ? Math.round(((pv * (pcts.core_pct / 100)) / tpm) * 100) / 100 : 0

      // Find the installment this month belongs to
      const installment = (project.installments || []).find((inst) => {
        const instEnd = inst.end_date || inst.target_date || ''
        return (
          inst.start_date && instEnd && month >= toYM(inst.start_date) && month <= toYM(instEnd)
        )
      })

      let directBudget = 0
      let directPct = 0
      if (installment) {
        const instEnd = installment.end_date || installment.target_date || ''
        const instMonths = monthsBetween(installment.start_date, instEnd)
        directPct = Math.max(0, 100 - adminPct - effectiveHrPct - effectiveCorePct)
        directBudget =
          Math.round(((installment.amount * (directPct / 100)) / instMonths) * 100) / 100
      }

      return {
        month,
        isActive,
        adminBudget: adminMonthly,
        hrBudget,
        coreBudget,
        directBudget,
        admin_pct: adminPct,
        hr_pct: effectiveHrPct,
        core_pct: effectiveCorePct,
        direct_pct: directPct,
        isAdjusted: isActive && pcts.isAdjusted,
        hasNewAdjustment: (project.pool_pct_adjustments || []).some((a) => a.from_month === month),
        installmentId: installment?.id || null,
        installmentLabel: installment?.label || null,
        phaseName: installment?.phase_name || installment?.label || null,
      }
    })
  },

  /**
   * Splits a given expense amount proportionally across all activated projects
   * by their monthly HR or Core contribution weight.
   */
  computeAllocations(pool, amount, allowedProjectIds) {
    let budgets = this.getActiveProjectMonthlyBudgets(pool)
    if (allowedProjectIds) {
      budgets = budgets.filter((b) => allowedProjectIds.includes(b.projectId))
    }
    const total = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
    return budgets.map((b) => {
      const sharePct = total > 0 ? Math.round((b.monthlyBudget / total) * 10000) / 100 : 0
      return {
        projectId: b.projectId,
        projectName: b.projectName,
        installmentId: b.installmentId,
        sharePct,
        amountCharged: Math.round(amount * (sharePct / 100) * 100) / 100,
      }
    })
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

  /**
   * Returns the total monthly HR project-pool budget across all active projects,
   * and how much has already been used (charged to project_pool) this month.
   *
   * @returns {{ totalMonthlyBudget: number, usedThisMonth: number, remaining: number }}
   */
  getMonthlyHRPoolBudgetSummary(month) {
    const budgets = this.getActiveProjectMonthlyBudgets('hr')
    const totalMonthlyBudget = budgets.length > 0 ? (budgets[0].totalMonthlyPool ?? 0) : 0

    const expenses = this.getHRExpenses()
    const targetMonth = month || new Date().toISOString().slice(0, 7) // YYYY-MM

    const usedThisMonth = expenses
      .filter((e) => {
        const eMonth = e.date ? e.date.slice(0, 7) : targetMonth
        return eMonth === targetMonth
      })
      .reduce((sum, e) => {
        const sources = e.revenue_sources || ['project_pool']
        if (!sources.includes('project_pool')) return sum
        const poolPct = parseFloat(e.project_pool_pct) ?? 100
        const totalAmt = parseFloat(e.amount) || 0
        return sum + Math.round(totalAmt * (poolPct / 100) * 100) / 100
      }, 0)

    return {
      totalMonthlyBudget: Math.round(totalMonthlyBudget * 100) / 100,
      usedThisMonth: Math.round(usedThisMonth * 100) / 100,
      remaining: Math.round((totalMonthlyBudget - usedThisMonth) * 100) / 100,
    }
  },

  addHRExpense(expense, enteredByProjectId) {
    const pool = readPool()
    const totalAmt = parseFloat(expense.amount) || 0

    // Determine revenue sources
    const revenueSources = expense.revenue_sources || ['project_pool']
    const projectPoolPct = parseFloat(expense.project_pool_pct) ?? 100
    const hrRevenuePct = parseFloat(expense.hr_revenue_pct) ?? 0

    // Use caller-provided allocations (user-edited) if present, else auto-compute
    let allocations
    if (expense.project_allocations && expense.project_allocations.length > 0) {
      allocations = expense.project_allocations
    } else {
      const projectPoolAmt = Math.round(totalAmt * (projectPoolPct / 100) * 100) / 100
      allocations = revenueSources.includes('project_pool')
        ? this.computeAllocations('hr', projectPoolAmt)
        : []
    }

    const newExp = {
      id: uid(),
      label: expense.label || '',
      vendor: expense.vendor || '',
      frequency: expense.frequency || 'Monthly',
      yearly_price: parseFloat(expense.yearly_price) || 0,
      amount: totalAmt,
      date: expense.date || '',
      notes: expense.notes || '',
      bill_no: expense.bill_no || '',
      entered_by_project_id: enteredByProjectId,
      // Revenue source metadata
      revenue_sources: revenueSources,
      hr_revenue_pct: hrRevenuePct,
      project_pool_pct: projectPoolPct,
      // Project allocations — may be user-customised or auto-computed
      project_allocations: allocations,
      created_at: new Date().toISOString(),
    }
    pool.hr_expenses = [...(pool.hr_expenses || []), newExp]
    writePool(pool)
    setTimeout(() => this.checkHRBudgetThresholds(), 100)
    return newExp
  },

  /**
   * Overrides the allocation share for one project on one expense.
   * The target project gets newSharePct of the TOTAL expense amount.
   * All other active projects split the remaining (100 - newSharePct)%
   * proportionally by their original weights.
   *
   * @param {string} expenseId
   * @param {string} projectId
   * @param {number} newSharePct  — 0..100
   */
  updateExpenseProjectAllocation(expenseId, projectId, newSharePct) {
    const pool = readPool()
    pool.hr_expenses = (pool.hr_expenses || []).map((e) => {
      if (e.id !== expenseId) return e

      const totalAmt = parseFloat(e.amount) || 0
      const clampedPct = Math.max(0, Math.min(100, newSharePct))

      // Current allocations (use stored or compute fresh)
      const existing = e.project_allocations?.length
        ? e.project_allocations
        : this.computeAllocations('hr', totalAmt)

      // Remaining pct for everyone else
      const remainingPct = 100 - clampedPct
      const others = existing.filter((a) => a.projectId !== projectId)
      const othersTotal = others.reduce((s, a) => s + a.sharePct, 0)

      const newAllocations = existing.map((a) => {
        if (a.projectId === projectId) {
          return {
            ...a,
            sharePct: Math.round(clampedPct * 100) / 100,
            amountCharged: Math.round(totalAmt * (clampedPct / 100) * 100) / 100,
          }
        }
        // Redistribute remaining proportionally
        const weight = othersTotal > 0 ? a.sharePct / othersTotal : 1 / others.length
        const pct = Math.round(remainingPct * weight * 100) / 100
        return {
          ...a,
          sharePct: pct,
          amountCharged: Math.round(totalAmt * (pct / 100) * 100) / 100,
        }
      })

      return { ...e, project_allocations: newAllocations }
    })
    writePool(pool)
    setTimeout(() => this.checkHRBudgetThresholds(), 100)
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
   * Returns all HR expense records allocated to this project.
   *
   * Priority:
   *  1. If the expense has a per-expense custom allocation for this project
   *     (i.e. updateExpenseProjectAllocation was called), use that stored value.
   *  2. Otherwise fall back to the live proportional share based on monthly budgets.
   */
  getProjectsMonthlyHRRemaining(month) {
    const budgets = this.getActiveProjectMonthlyBudgets('hr')
    const expenses = this.getHRExpenses()
    const targetMonth = month || new Date().toISOString().slice(0, 7)

    const usedMap = {}
    for (const exp of expenses) {
      const eMonth = exp.date ? exp.date.slice(0, 7) : targetMonth
      if (eMonth !== targetMonth) continue
      const sources = exp.revenue_sources || ['project_pool']
      if (!sources.includes('project_pool')) continue

      const allocs = exp.project_allocations || []
      if (allocs.length > 0) {
        for (const a of allocs) {
          usedMap[a.projectId] = (usedMap[a.projectId] || 0) + (a.amountCharged || 0)
        }
      } else {
        const total = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
        for (const b of budgets) {
          const share = total > 0 ? b.monthlyBudget / total : 0
          const poolPct = parseFloat(exp.project_pool_pct) ?? 100
          const poolAmt = parseFloat(exp.amount || 0) * (poolPct / 100)
          usedMap[b.projectId] =
            (usedMap[b.projectId] || 0) + Math.round(poolAmt * share * 100) / 100
        }
      }
    }

    const result = {}
    for (const b of budgets) {
      const used = Math.round((usedMap[b.projectId] || 0) * 100) / 100
      result[b.projectId] = {
        monthlyBudget: b.monthlyBudget,
        usedThisMonth: used,
        remaining: Math.round((b.monthlyBudget - used) * 100) / 100,
      }
    }
    return result
  },

  getProjectHRCharges(projectId) {
    const budgets = this.getActiveProjectMonthlyBudgets('hr')
    const mine = budgets.find((b) => b.projectId === projectId)
    if (!mine) return []

    const total = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
    const liveSharePct = total > 0 ? (mine.monthlyBudget / total) * 100 : 0

    return (readPool().hr_expenses || []).map((exp) => {
      // Check for a custom per-expense allocation for this project
      const customAlloc = (exp.project_allocations || []).find((a) => a.projectId === projectId)

      // Use custom allocation if stored, otherwise fall back to live share
      const mySharePct = customAlloc ? customAlloc.sharePct : liveSharePct
      const myAmount = customAlloc
        ? customAlloc.amountCharged
        : Math.round(parseFloat(exp.amount || 0) * (liveSharePct / 100) * 100) / 100

      return {
        ...exp,
        myAmount,
        mySharePct: Math.round(mySharePct * 100) / 100,
        isFromThisProject: exp.entered_by_project_id === projectId,
        hasCustomAllocation: !!customAlloc,
      }
    })
  },

  /**
   * Returns the current HR Revenue balance available (sum of amount_received
   * across Recruitment, Training, Internship, and Hall Rent in localRecruitments
   * and localInternships, minus any amounts already drawn for HR expenses).
   */
  getHRRevenueBalance() {
    return readPool().hr_revenue_balance ?? null
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
    const totalAmt = parseFloat(expense.amount) || 0

    const revenueSources = expense.revenue_sources || ['project_pool']
    const projectPoolPct = parseFloat(expense.project_pool_pct) ?? 100
    const hrRevenuePct = parseFloat(expense.hr_revenue_pct) ?? 0

    let allocations
    if (expense.project_allocations && expense.project_allocations.length > 0) {
      allocations = expense.project_allocations
    } else {
      const projectPoolAmt = Math.round(totalAmt * (projectPoolPct / 100) * 100) / 100
      allocations = revenueSources.includes('project_pool')
        ? this.computeAllocations('core', projectPoolAmt)
        : []
    }

    const newExp = {
      id: uid().replace('hre_', 'core_'),
      label: expense.label || '',
      vendor: expense.vendor || '',
      frequency: expense.frequency || 'Monthly',
      yearly_price: parseFloat(expense.yearly_price) || 0,
      amount: totalAmt,
      date: expense.date || '',
      notes: expense.notes || '',
      bill_no: expense.bill_no || '',
      employee_id: expense.employee_id || null,
      entered_by_project_id: enteredByProjectId,
      revenue_sources: revenueSources,
      hr_revenue_pct: hrRevenuePct,
      project_pool_pct: projectPoolPct,
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

  /**
   * Returns the total monthly Core project-pool budget across all active projects,
   * and how much has already been used (charged to project_pool) this month.
   */
  getMonthlyCorePoolBudgetSummary(month) {
    const budgets = this.getActiveProjectMonthlyBudgets('core')
    const totalMonthlyBudget = budgets.length > 0 ? (budgets[0].totalMonthlyPool ?? 0) : 0

    const expenses = this.getCoreExpenses()
    const targetMonth = month || new Date().toISOString().slice(0, 7)

    const usedThisMonth = expenses
      .filter((e) => (e.date ? e.date.slice(0, 7) : targetMonth) === targetMonth)
      .reduce((sum, e) => {
        const sources = e.revenue_sources || ['project_pool']
        if (!sources.includes('project_pool')) return sum
        const poolPct = parseFloat(e.project_pool_pct) ?? 100
        const totalAmt = parseFloat(e.amount) || 0
        return sum + Math.round(totalAmt * (poolPct / 100) * 100) / 100
      }, 0)

    return {
      totalMonthlyBudget: Math.round(totalMonthlyBudget * 100) / 100,
      usedThisMonth: Math.round(usedThisMonth * 100) / 100,
      remaining: Math.round((totalMonthlyBudget - usedThisMonth) * 100) / 100,
    }
  },

  getProjectsMonthlyCoreRemaining(month) {
    const budgets = this.getActiveProjectMonthlyBudgets('core')
    const expenses = this.getCoreExpenses()
    const targetMonth = month || new Date().toISOString().slice(0, 7)

    const usedMap = {}
    for (const exp of expenses) {
      const eMonth = exp.date ? exp.date.slice(0, 7) : targetMonth
      if (eMonth !== targetMonth) continue
      const sources = exp.revenue_sources || ['project_pool']
      if (!sources.includes('project_pool')) continue

      const allocs = exp.project_allocations || []
      if (allocs.length > 0) {
        for (const a of allocs) {
          usedMap[a.projectId] = (usedMap[a.projectId] || 0) + (a.amountCharged || 0)
        }
      } else {
        const total = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
        for (const b of budgets) {
          const share = total > 0 ? b.monthlyBudget / total : 0
          const poolPct = parseFloat(exp.project_pool_pct) ?? 100
          const poolAmt = parseFloat(exp.amount || 0) * (poolPct / 100)
          usedMap[b.projectId] =
            (usedMap[b.projectId] || 0) + Math.round(poolAmt * share * 100) / 100
        }
      }
    }

    const result = {}
    for (const b of budgets) {
      const used = Math.round((usedMap[b.projectId] || 0) * 100) / 100
      result[b.projectId] = {
        monthlyBudget: b.monthlyBudget,
        usedThisMonth: used,
        remaining: Math.round((b.monthlyBudget - used) * 100) / 100,
      }
    }
    return result
  },

  // ── Admin Expense CRUD ─────────────────────────────────────────────────────

  getAdminExpenses() {
    return readPool().admin_expenses || []
  },

  addAdminExpense(expense, enteredByProjectId) {
    const pool = readPool()
    const totalAmt = parseFloat(expense.amount) || 0

    const revenueSources = expense.revenue_sources || ['project_pool']
    const projectPoolPct = parseFloat(expense.project_pool_pct) ?? 100
    const hrRevenuePct = parseFloat(expense.hr_revenue_pct) ?? 0

    let allocations
    if (expense.project_allocations && expense.project_allocations.length > 0) {
      allocations = expense.project_allocations
    } else {
      const projectPoolAmt = Math.round(totalAmt * (projectPoolPct / 100) * 100) / 100
      allocations = revenueSources.includes('project_pool')
        ? this.computeAllocations('admin', projectPoolAmt)
        : []
    }

    const newExp = {
      id: uid(),
      label: expense.label || '',
      vendor: expense.vendor || '',
      frequency: expense.frequency || 'Monthly',
      yearly_price: parseFloat(expense.yearly_price) || 0,
      amount: totalAmt,
      date: expense.date || '',
      notes: expense.notes || '',
      bill_no: expense.bill_no || '',
      entered_by_project_id: enteredByProjectId,
      revenue_sources: revenueSources,
      hr_revenue_pct: hrRevenuePct,
      project_pool_pct: projectPoolPct,
      project_allocations: allocations,
      created_at: new Date().toISOString(),
    }
    pool.admin_expenses = [...(pool.admin_expenses || []), newExp]
    writePool(pool)
    return newExp
  },

  removeAdminExpense(expenseId) {
    const pool = readPool()
    pool.admin_expenses = (pool.admin_expenses || []).filter((e) => e.id !== expenseId)
    writePool(pool)
  },

  updateAdminExpense(expenseId, data) {
    const pool = readPool()
    pool.admin_expenses = (pool.admin_expenses || []).map((e) => {
      if (e.id !== expenseId) return e
      const updated = { ...e, ...data }
      if (data.amount !== undefined) {
        updated.project_allocations = this.computeAllocations('admin', parseFloat(data.amount) || 0)
      }
      return updated
    })
    writePool(pool)
  },

  /** Returns all Admin expenses in the org pool. */
  getAllAdminExpenses() {
    return readPool().admin_expenses || []
  },

  /**
   * Returns the total monthly Admin project-pool budget across all active projects,
   * and how much has already been used (charged to project_pool) this month.
   */
  getMonthlyAdminPoolBudgetSummary(month) {
    const budgets = this.getActiveProjectMonthlyBudgets('admin')
    const totalMonthlyBudget = budgets.length > 0 ? (budgets[0].totalMonthlyPool ?? 0) : 0

    const expenses = this.getAdminExpenses()
    const targetMonth = month || new Date().toISOString().slice(0, 7)

    const usedThisMonth = expenses
      .filter((e) => (e.date ? e.date.slice(0, 7) : targetMonth) === targetMonth)
      .reduce((sum, e) => {
        const sources = e.revenue_sources || ['project_pool']
        if (!sources.includes('project_pool')) return sum
        const poolPct = parseFloat(e.project_pool_pct) ?? 100
        const totalAmt = parseFloat(e.amount) || 0
        return sum + Math.round(totalAmt * (poolPct / 100) * 100) / 100
      }, 0)

    return {
      totalMonthlyBudget: Math.round(totalMonthlyBudget * 100) / 100,
      usedThisMonth: Math.round(usedThisMonth * 100) / 100,
      remaining: Math.round((totalMonthlyBudget - usedThisMonth) * 100) / 100,
    }
  },

  getProjectsMonthlyAdminRemaining(month) {
    const budgets = this.getActiveProjectMonthlyBudgets('admin')
    const expenses = this.getAdminExpenses()
    const targetMonth = month || new Date().toISOString().slice(0, 7)

    const usedMap = {}
    for (const exp of expenses) {
      const eMonth = exp.date ? exp.date.slice(0, 7) : targetMonth
      if (eMonth !== targetMonth) continue
      const sources = exp.revenue_sources || ['project_pool']
      if (!sources.includes('project_pool')) continue

      const allocs = exp.project_allocations || []
      if (allocs.length > 0) {
        for (const a of allocs) {
          usedMap[a.projectId] = (usedMap[a.projectId] || 0) + (a.amountCharged || 0)
        }
      } else {
        const total = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
        for (const b of budgets) {
          const share = total > 0 ? b.monthlyBudget / total : 0
          const poolPct = parseFloat(exp.project_pool_pct) ?? 100
          const poolAmt = parseFloat(exp.amount || 0) * (poolPct / 100)
          usedMap[b.projectId] =
            (usedMap[b.projectId] || 0) + Math.round(poolAmt * share * 100) / 100
        }
      }
    }

    const result = {}
    for (const b of budgets) {
      const used = Math.round((usedMap[b.projectId] || 0) * 100) / 100
      result[b.projectId] = {
        monthlyBudget: b.monthlyBudget,
        usedThisMonth: used,
        remaining: Math.round((b.monthlyBudget - used) * 100) / 100,
      }
    }
    return result
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
