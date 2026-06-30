/**
 * localPayroll.js — Payroll utilities for Project Budget & Overhead tracking.
 *
 * Provides:
 *  - splitSalaryByProject()     — proportional salary split across projects
 *  - getAllEmployeesWithProjectInfo() — all employees enriched with project counts
 *  - getProjectEmployees()      — employees actively assigned to a specific project
 *  - computeCoreDeductions()    — salary deductions from core pool per installment
 *  - suggestRecurringAmount()   — ±5% suggestion for recurring admin expenses
 *  - getCorePoolSummary()       — overview of core pool usage for an installment
 */

const EMPLOYEES_KEY = 'hma_employees'
const PROJECTS_KEY = 'hma_projects_v8'

// ─── Internal helpers ──────────────────────────────────────────────────────────

const readEmployees = () => {
  try {
    return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]')
  } catch {
    return []
  }
}

const readProjects = () => {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Count months between two "YYYY-MM" strings (inclusive).
 * e.g. monthsBetween('2026-01', '2026-04') === 4
 */
const monthsBetween = (startMonth, endMonth) => {
  if (!startMonth || !endMonth) return 1
  const [sy, sm] = startMonth.split('-').map(Number)
  const [ey, em] = endMonth.split('-').map(Number)
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1)
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const localPayroll = {
  /**
   * Split an employee's salary proportionally across projects by project value.
   * @param {number} salary
   * @param {number[]} projectValues
   * @returns {number[]} deductions per project (same order as projectValues)
   *
   * @example
   * splitSalaryByProject(35000, [20000000, 1000000, 5000000])
   * // → [26923.07, 1346.15, 6730.76]
   */
  splitSalaryByProject(salary, projectValues) {
    const total = projectValues.reduce((s, v) => s + v, 0)
    if (total === 0) return projectValues.map(() => 0)
    return projectValues.map((v) => salary * (v / total))
  },

  /**
   * Returns ALL employees enriched with:
   *  - activeProjectCount  (number of active project_assignments)
   *  - activeProjectNames  (string[])
   *  - activeProjectIds    (string[]) — matched from projects store by project name
   *  - isOverhead          (true when activeProjectCount === 0)
   */
  getAllEmployeesWithProjectInfo() {
    const employees = readEmployees().filter((e) => e.status !== 'Deleted')
    const projects = readProjects()

    return employees.map((emp) => {
      const activeAssignments = (emp.project_assignments || []).filter((a) => a.status === 'Active')

      // Try to resolve project ids from the projects store by matching project name
      const activeProjectNames = activeAssignments.map((a) => a.project_name || '')
      const activeProjectIds = activeProjectNames
        .map((name) => {
          const match = projects.find(
            (p) => (p.title || p.name || '').toLowerCase() === name.toLowerCase(),
          )
          return match?.id || null
        })
        .filter(Boolean)

      const activeProjectValues = activeProjectIds.map((pid) => {
        const p = projects.find((pr) => pr.id === pid)
        return p ? p.project_valuation || p.project_value || 0 : 0
      })

      return {
        ...emp,
        activeProjectCount: activeAssignments.length,
        activeProjectNames,
        activeProjectIds,
        activeProjectValues,
        isOverhead: activeAssignments.length === 0,
      }
    })
  },

  /**
   * Returns employees actively assigned to a specific project.
   * Matches by project title/name (case-insensitive) stored in project_assignments.
   */
  getProjectEmployees(projectId) {
    const projects = readProjects()
    const project = projects.find((p) => p.id === projectId)
    if (!project) return []

    const projectName = (project.title || project.name || '').toLowerCase()
    const employees = readEmployees().filter((e) => e.status !== 'Deleted')

    return employees.filter((emp) =>
      (emp.project_assignments || []).some(
        (a) => a.status === 'Active' && (a.project_name || '').toLowerCase() === projectName,
      ),
    )
  },

  /**
   * Computes how much of each project-assigned employee's salary should be
   * deducted from THIS project's core pool.
   *
   * Logic:
   *  1. Get all employees assigned to this project.
   *  2. For each employee, for EVERY active project they work on, compute its MONTHLY RATE:
   *       monthly_rate = project.value / project_duration_months
   *  3. Use splitSalaryByProject() with these monthly rates as weights.
   *  4. Multiply the resulting monthly share by THIS project's month count.
   *
   * @returns {Array<{ employee, monthlyShare, projectMonths, totalDeduction, allActiveProjects, allMonthlyRates }>}
   */
  computeCoreDeductions(projectId) {
    const projects = readProjects()
    const thisProject = projects.find((p) => p.id === projectId)
    if (!thisProject) return []

    const projectName = (thisProject.title || thisProject.name || '').toLowerCase()
    const employees = readEmployees().filter((e) => e.status !== 'Deleted')
    const projectMonths = Math.max(monthsBetween(thisProject.start_date, thisProject.end_date), 1)

    const getMonthlyRate = (proj) => {
      const months = Math.max(monthsBetween(proj.start_date, proj.end_date), 1)
      return (proj.project_valuation || proj.project_value || 0) / months
    }

    const deductions = []

    employees.forEach((emp) => {
      const activeAssignments = (emp.project_assignments || []).filter((a) => a.status === 'Active')
      const isOnThisProject = activeAssignments.some(
        (a) => (a.project_name || '').toLowerCase() === projectName,
      )
      if (!isOnThisProject) return

      const salary = parseFloat(emp.current_salary) || 0
      if (salary <= 0) return

      // Build monthly-rate weights for all projects this employee works on
      const allActiveNames = activeAssignments.map((a) => a.project_name || '')
      const allMonthlyRates = allActiveNames.map((name) => {
        const match = projects.find(
          (p) => (p.title || p.name || '').toLowerCase() === name.toLowerCase(),
        )
        return match ? getMonthlyRate(match) : 0
      })

      // Position of THIS project in the employee's active list
      const thisIdx = allActiveNames.findIndex((name) => name.toLowerCase() === projectName)

      const splits = localPayroll.splitSalaryByProject(salary, allMonthlyRates)
      const monthlyShare = splits[thisIdx] ?? salary
      const totalDeduction = monthlyShare * projectMonths

      deductions.push({
        employee: emp,
        salary,
        allActiveProjects: allActiveNames,
        allMonthlyRates: allMonthlyRates.map((r) => Math.round(r * 100) / 100),
        monthlyShare: Math.round(monthlyShare * 100) / 100,
        projectMonths: projectMonths,
        totalDeduction: Math.round(totalDeduction * 100) / 100,
      })
    })

    return deductions
  },

  /**
   * Returns a suggested amount for a recurring admin expense type,
   * based on the previous expense of matching type ± 5%.
   */
  suggestRecurringAmount(projectId, recurringType) {
    const projects = readProjects()
    const project = projects.find((p) => p.id === projectId)
    if (!project || !project.admin_expenses)
      return { suggested: null, prevAmount: null, trend: null }

    // Find the latest recurring expense of this type
    const expenses = [...project.admin_expenses].reverse()
    const prevExp = expenses.find((e) => e.is_recurring && e.recurring_type === recurringType)

    if (prevExp && prevExp.amount > 0) {
      const prev = parseFloat(prevExp.amount)
      const variance = prev * 0.05
      // Suggest +5% (standard escalation); user can adjust
      const suggested = Math.round((prev + variance) * 100) / 100
      return { suggested, prevAmount: prev, trend: 'up' }
    }
    return { suggested: null, prevAmount: null, trend: null }
  },

  /**
   * Returns a summary of the global core pool usage for the project.
   */
  getCorePoolSummary(projectId) {
    const projects = readProjects()
    const project = projects.find((p) => p.id === projectId)
    if (!project) return { allocated: 0, used: 0, remaining: 0, deductions: [] }

    const deductions = localPayroll.computeCoreDeductions(projectId)
    const projectValue = project.project_valuation || project.project_value || 0
    const allocated = projectValue * ((project.core_pct ?? 5) / 100)
    const used = deductions.reduce((s, d) => s + d.totalDeduction, 0)
    const remaining = allocated - used

    return {
      allocated: Math.round(allocated * 100) / 100,
      used: Math.round(used * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      deductions,
    }
  },
}
