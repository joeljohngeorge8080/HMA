/**
 * monthlyApportionment.js — Pure math for project monthly planning
 * (spec: docs/superpowers/specs/2026-07-02-hr-core-admin-monthly-apportionment-design.md,
 * Sections 2-4). No localStorage or other I/O — every function is a plain
 * data-in/data-out transform so it's testable without a browser.
 */

/**
 * Working pool = the project's own baseline share of total value — the
 * residual after Admin, HR, and Core's percentages (each independently
 * pct% of total value, not carved out of this pool). This is what the
 * monthly plan (generateMonthlyPlan) must sum to.
 */
export const computeWorkingPool = (project) => {
  const pv = project.project_value || project.project_valuation || 0
  const adminPct = project.admin_pct ?? 5
  const hrPct = project.hr_pct ?? 5
  const corePct = project.core_pct ?? 5
  const projectPct = 100 - adminPct - hrPct - corePct
  return Math.round(pv * (projectPct / 100) * 100) / 100
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

/**
 * Flat monthly rate for one pool ('admin'|'hr'|'core') — pct% of total
 * project value, divided evenly across the project's duration. Identical
 * every month; recomputed live from current project fields, never cached.
 */
export const computeFlatMonthlyRate = (project, pool) => {
  const pv = project.project_value || project.project_valuation || 0
  const pct = project[`${pool}_pct`] ?? 5
  const months = monthsInRange(project.start_date, project.end_date)
  if (months.length === 0) return 0
  return Math.round(((pv * (pct / 100)) / months.length) * 100) / 100
}

/** Sum of adjustment amounts recorded against one exact (pool, month) pair. */
export const sumPoolAdjustments = (adjustments, pool, month) =>
  Math.round(
    (adjustments || [])
      .filter((a) => a.pool === pool && a.month === month)
      .reduce((s, a) => s + (a.amount || 0), 0) * 100,
  ) / 100

/**
 * Effective monthly figure for one pool/month after manual withdrawals:
 * the flat rate minus every adjustment recorded against that exact
 * (pool, month) pair. Not clamped at 0 — a negative figure legitimately
 * represents a pool in deficit for that project that month; callers that
 * display this should warn, not block, on a negative result.
 */
export const computeEffectivePoolMonthly = (project, pool, month) => {
  const flat = computeFlatMonthlyRate(project, pool)
  const withdrawn = sumPoolAdjustments(project.pool_adjustments, pool, month)
  return Math.round((flat - withdrawn) * 100) / 100
}
