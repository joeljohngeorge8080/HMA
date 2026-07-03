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

/**
 * A project's normal Project-column share for one month — the working
 * pool spread evenly across the project's duration. This is the "baseline"
 * (B) a month's Project total is compared against to decide whether it
 * needs to borrow from HR/Core.
 */
export const computeMonthBaseline = (project) => {
  const months = monthsInRange(project.start_date, project.end_date)
  if (months.length === 0) return 0
  return Math.round((computeWorkingPool(project) / months.length) * 100) / 100
}

/**
 * One month's own combined HR+Core flat capacity (HC) — the amount a
 * Project overage can draw from that same month before needing to reach
 * into other months. `month` is accepted for API symmetry with other
 * per-month functions even though the flat rate is month-independent today.
 */
export const computeMonthHRCore = (project, month) =>
  Math.round(
    (computeFlatMonthlyRate(project, 'hr') + computeFlatMonthlyRate(project, 'core')) * 100,
  ) / 100

/**
 * Derives the auto_cascade pool_adjustments a monthly plan implies: when a
 * month's Project total (P) exceeds its baseline share (B), the excess is
 * funded by pulling from HR/Core — first that same month's own HR+Core
 * capacity (HC), split 50/50, then, if the excess is larger than HC, the
 * remainder is spread evenly across every OTHER month's HR+Core, also
 * split 50/50 within each. Pure function of the project's current
 * monthly_plan; does not read or preserve any existing pool_adjustments —
 * the caller (localProjects.js) merges this against manual ones. A
 * shortfall that can't be covered (a single-month project, or an excess
 * larger than every other month's combined capacity) is simply not
 * represented by any adjustment — no clamping, no error, nothing forced.
 *
 * Every split below computes one side and derives the other as the exact
 * remainder (never rounding both sides independently), and the last month
 * in an even cross-month spread absorbs any leftover rounding — so the sum
 * of every adjustment this function creates for one month's excess always
 * equals that excess exactly, to the paisa. This matters:
 * validatePlanTotalWithCascade compares the raw plan total against
 * workingPool + (sum of every auto_cascade amount), and that comparison
 * only tolerates half a paisa of drift — independent per-record rounding
 * would silently accumulate past that tolerance on an uneven split (e.g.
 * spreading ₹5,000 across 9 months) and produce a false "Off by X".
 */
export const computeCascadeAdjustments = (project) => {
  const plan = project.monthly_plan || []
  const allMonths = plan.map((m) => m.month)
  const baseline = computeMonthBaseline(project)
  const adjustments = []

  const pushSplit = (month, total) => {
    const hrShare = Math.round((total / 2) * 100) / 100
    const coreShare = Math.round((total - hrShare) * 100) / 100
    adjustments.push({ pool: 'hr', month, amount: hrShare, source: 'auto_cascade' })
    adjustments.push({ pool: 'core', month, amount: coreShare, source: 'auto_cascade' })
  }

  plan.forEach((m) => {
    const hc = computeMonthHRCore(project, m.month)
    const excess = Math.round((m.total - baseline) * 100) / 100
    if (excess <= 0) return

    const sameMonthPull = Math.min(excess, hc)
    if (sameMonthPull > 0) {
      pushSplit(m.month, sameMonthPull)
    }

    const remaining = Math.round((excess - sameMonthPull) * 100) / 100
    if (remaining > 0) {
      const otherMonths = allMonths.filter((mm) => mm !== m.month)
      if (otherMonths.length > 0) {
        const perMonth = Math.round((remaining / otherMonths.length) * 100) / 100
        otherMonths.forEach((om, i) => {
          const isLast = i === otherMonths.length - 1
          const amt = isLast
            ? Math.round((remaining - perMonth * (otherMonths.length - 1)) * 100) / 100
            : perMonth
          pushSplit(om, amt)
        })
      }
    }
  })

  return adjustments
}

/**
 * Same balance check as validatePlanTotal, but a month's overage that's
 * fully funded by an auto_cascade pull no longer counts against it — only
 * a genuine, uncovered shortfall does. Reuses validatePlanTotal by raising
 * the comparison baseline by however much was actually pulled via cascade:
 * every cascaded rupee exists specifically to fund an overage, so total
 * pulled always equals total funded, by construction.
 */
export const validatePlanTotalWithCascade = (monthlyPlan, workingPool, poolAdjustments) => {
  const totalCascadePulled =
    Math.round(
      (poolAdjustments || [])
        .filter((a) => a.source === 'auto_cascade')
        .reduce((s, a) => s + (a.amount || 0), 0) * 100,
    ) / 100
  return validatePlanTotal(monthlyPlan, workingPool + totalCascadePulled)
}
