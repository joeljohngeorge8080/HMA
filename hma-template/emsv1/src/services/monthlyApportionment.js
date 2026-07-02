/**
 * monthlyApportionment.js — Pure math for project monthly planning
 * (spec: docs/superpowers/specs/2026-07-02-hr-core-admin-monthly-apportionment-design.md,
 * Sections 2-4). No localStorage or other I/O — every function is a plain
 * data-in/data-out transform so it's testable without a browser.
 */

/**
 * Working pool = total project value minus the (already-credited, locked)
 * admin lump sum. This is what the monthly plan (Task 3) must sum to.
 */
export const computeWorkingPool = (project) => {
  const pv = project.project_value || project.project_valuation || 0
  const admin = project.admin_pool_amount || 0
  return Math.round((pv - admin) * 100) / 100
}

/**
 * Every calendar month from start to end (both 'YYYY-MM-DD' or 'YYYY-MM'),
 * inclusive. Returns at least one month.
 */
export const monthsInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return []
  const [sy, sm] = startDate.split('-').map(Number)
  const [ey, em] = endDate.split('-').map(Number)
  const months = []
  let cy = sy
  let cm = sm
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
 * Splits one month's planned total into Project/HR/Core, carving HR/Core
 * out of the same pot (not additive on top) per spec Section 4.
 */
export const computeMonthSplit = (monthEntry) => {
  const total = monthEntry.total || 0
  const hrPct = monthEntry.hr_pct ?? 5
  const corePct = monthEntry.core_pct ?? 5
  const hrAmount = Math.round(total * (hrPct / 100) * 100) / 100
  const coreAmount = Math.round(total * (corePct / 100) * 100) / 100
  const projectAmount = Math.round((total - hrAmount - coreAmount) * 100) / 100
  return { projectAmount, hrAmount, coreAmount }
}

/** Sum of every month's total in a monthly plan. */
export const sumPlanTotal = (monthlyPlan) =>
  Math.round((monthlyPlan || []).reduce((s, m) => s + (m.total || 0), 0) * 100) / 100

/**
 * A plan is valid only when its total exactly matches the working pool
 * (spec Section 3) — within a half-paisa rounding tolerance.
 */
export const validatePlanTotal = (monthlyPlan, workingPool) => {
  const planTotal = sumPlanTotal(monthlyPlan)
  const diff = Math.round((planTotal - workingPool) * 100) / 100
  return { valid: Math.abs(diff) < 0.01, planTotal, workingPool, diff }
}
