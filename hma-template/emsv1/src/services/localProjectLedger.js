/**
 * localProjectLedger.js — localStorage persistence for uploaded Excel project
 * ledgers (plan: docs/plans/actual-phase-ledger-upload.md §7). Stored under
 * its own key, one ledger per project id — mirrors the standalone-store
 * convention of localProjectExpenses.js / localBudgetPlan.js rather than
 * embedding into the plan record, so an upload can never corrupt planned or
 * manually entered actual figures: different key, different object.
 * Re-upload replaces the whole entry for that project (no merge/append).
 */
import {
  normalizeActivityText,
  activityLabelOf,
} from '../modules/pms/project-associate/budget-plan/activityOptions'

const KEY = 'hma_project_ledger_v1'

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}
const writeAll = (all) => localStorage.setItem(KEY, JSON.stringify(all))

/** A row's effective activity mapping: its own resolved `activity` if the
 * parser matched one, otherwise a lookup in this ledger's remembered
 * `activity_overrides` (keyed by normalizeActivityText(activityRaw)). Null
 * when still unmapped — such rows are excluded from aggregation. */
const effectiveActivity = (row, overrides) => {
  if (row.activity) return { value: row.activity, other: '' }
  const ov = overrides[normalizeActivityText(row.activityRaw)]
  return ov || null
}

export const localProjectLedger = {
  get(projectId) {
    return readAll()[projectId] || null
  },

  getOverrides(projectId) {
    return readAll()[projectId]?.activity_overrides || {}
  },

  /** Replaces the whole stored ledger for this project (re-upload = replace,
   * not merge — a re-upload is then a single-key swap that can't half-apply). */
  save(projectId, { sourceFile, sourceSheet, rows, uploadedBy, activityOverrides = {} }) {
    const all = readAll()
    const entry = {
      version: 1,
      uploaded_at: new Date().toISOString(),
      uploaded_by: uploadedBy || 'Unknown',
      source_file: sourceFile,
      source_sheet: sourceSheet,
      rows,
      activity_overrides: activityOverrides,
    }
    all[projectId] = entry
    writeAll(all)
    return entry
  },

  remove(projectId) {
    const all = readAll()
    delete all[projectId]
    writeAll(all)
  },

  /**
   * Row-level detail for one month — Date, Particulars, Amount, Budget Head,
   * Activity, Phase — sorted by date. Excludes committed rows by default
   * (plan P9 — not yet real spend); callers that show them anyway should
   * still exclude them from any total, e.g. via `row.committed`.
   */
  rowsForMonth(projectId, month, { includeCommitted = false } = {}) {
    const ledger = readAll()[projectId]
    if (!ledger) return []
    const overrides = ledger.activity_overrides || {}
    return ledger.rows
      .filter((row) => row.month === month && (includeCommitted || !row.committed))
      .map((row) => ({ row, eff: effectiveActivity(row, overrides) }))
      .filter(({ eff }) => eff)
      .map(({ row, eff }) => ({ ...row, activityLabel: activityLabelOf(eff.value, eff.other) }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  },

  /** Every month with at least one resolvable-activity row, sorted ascending
   * — drives which month sections the ledger view renders. */
  monthsWithData(projectId) {
    const ledger = readAll()[projectId]
    if (!ledger) return []
    const overrides = ledger.activity_overrides || {}
    const months = new Set()
    ledger.rows.forEach((row) => {
      if (effectiveActivity(row, overrides)) months.add(row.month)
    })
    return [...months].sort()
  },
}
