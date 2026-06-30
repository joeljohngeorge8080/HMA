/**
 * localOrgPool.js — Organisation-wide HR pool for shared expense tracking.
 *
 * Logic:
 *  Each activated active project contributes a "monthly HR budget" based on
 *  its current installment: monthly_hr = (inst.amount * hr_pct/100) / inst_months
 *
 *  When an HR expense is entered, it is proportionally split across all activated
 *  projects by their monthly HR contribution weight.
 */

const PROJECTS_KEY = 'hma_projects_v9'
const ORG_POOL_KEY = 'hma_org_pool_v1'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const readProjects = () => {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') } catch { return [] }
}

const readPool = () => {
  try { return JSON.parse(localStorage.getItem(ORG_POOL_KEY) || '{}') } catch { return {} }
}

const writePool = (data) => {
  localStorage.setItem(ORG_POOL_KEY, JSON.stringify(data))
}

const uid = () => `hre_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`

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
 * Returns the installment covering today, or the last installment as fallback.
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

// ─── Public API ───────────────────────────────────────────────────────────────

export const localOrgPool = {
  /**
   * Returns all activated active projects with their current installment monthly
   * HR or Core budget and share percentage across the org pool.
   *
   * @param {'hr'|'core'} pool
   */
  getActiveProjectMonthlyBudgets(pool = 'hr') {
    const pctKey = pool === 'hr' ? 'hr_pct' : 'core_pct'
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
        const months = monthsBetween(inst.start_date, endField)
        const poolBudget = inst.amount * ((p[pctKey] ?? 5) / 100)
        const monthlyBudget = poolBudget / months
        return {
          projectId: p.id,
          projectName: p.title || p.name,
          installmentId: inst.id,
          installmentLabel: inst.label,
          installmentStart: inst.start_date,
          installmentEnd: endField,
          installmentAmount: inst.amount,
          months,
          poolBudget: Math.round(poolBudget * 100) / 100,
          monthlyBudget: Math.round(monthlyBudget * 100) / 100,
          sharePct: 0,
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
   * Returns all installments for a project with their monthly HR/Core breakdown.
   *
   * Monthly budget = (total project value × pool%) / total months across ALL installments.
   * Every month gets an equal share regardless of installment size.
   *
   * @param {string} projectId
   * @param {'hr'|'core'} pool
   */
  getProjectInstallmentBudgets(projectId, pool = 'hr') {
    const projects = readProjects()
    const p = projects.find((pr) => pr.id === projectId)
    if (!p) return []
    const pctKey = pool === 'hr' ? 'hr_pct' : 'core_pct'
    const pct = p[pctKey] ?? 5
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
      const months = monthsBetween(inst.start_date, endField)
      const instPoolBudget = Math.round(monthlyBudget * months * 100) / 100

      // Build individual month labels within this installment
      const monthList = []
      if (inst.start_date && endField) {
        let [cy, cm] = inst.start_date.split('-').map(Number)
        const [ey, em] = endField.split('-').map(Number)
        while (cy < ey || (cy === ey && cm <= em)) {
          monthList.push(`${cy}-${String(cm).padStart(2, '0')}`)
          cm++
          if (cm > 12) { cm = 1; cy++ }
        }
      }

      return {
        installmentId: inst.id,
        installmentLabel: inst.label,
        installmentStart: inst.start_date,
        installmentEnd: endField,
        installmentAmount: inst.amount,
        percentage: inst.percentage,
        pct,
        months,
        poolBudget: instPoolBudget,
        monthlyBudget,
        totalHRBudget: Math.round(totalHRBudget * 100) / 100,
        totalMonths,
        monthList,
        ucStatus: inst.uc_status,
      }
    })
  },


  /**
   * Splits a given expense amount proportionally across all activated projects.
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

  addHRExpense(expense, enteredByProjectId) {
    const pool = readPool()
    const allocations = this.computeAllocations('hr', parseFloat(expense.amount) || 0)
    const newExp = {
      id: uid(),
      label: expense.label || '',
      amount: parseFloat(expense.amount) || 0,
      date: expense.date || '',
      notes: expense.notes || '',
      entered_by_project_id: enteredByProjectId,
      project_allocations: allocations,
      created_at: new Date().toISOString(),
    }
    pool.hr_expenses = [...(pool.hr_expenses || []), newExp]
    writePool(pool)
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
  },

  /**
   * Returns all HR expense records in which this project has an allocated charge,
   * enriched with myAmount, mySharePct, isFromThisProject.
   */
  getProjectHRCharges(projectId) {
    return (readPool().hr_expenses || [])
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
    }
  },

  /** Returns all HR expenses in the org pool. */
  getAllHRExpenses() {
    return readPool().hr_expenses || []
  },
}
