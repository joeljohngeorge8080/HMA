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
   * Sums uploaded rows by month + activity (plan §6 decision B — Budget Head
   * does not split the total). Committed rows are excluded by default (plan
   * P9) since they're not yet real spend. Rows whose activity is still
   * unmapped are excluded — commit-time mapping should leave none, but this
   * stays defensive rather than silently mis-grouping them under 'other'.
   */
  aggregateByMonthActivity(projectId, { includeCommitted = false } = {}) {
    const ledger = readAll()[projectId]
    if (!ledger) return {}
    const overrides = ledger.activity_overrides || {}
    const out = {}
    ledger.rows.forEach((row) => {
      if (row.committed && !includeCommitted) return
      const eff = effectiveActivity(row, overrides)
      if (!eff) return
      const key = eff.value === 'other' ? `other:${eff.other}` : eff.value
      out[row.month] = out[row.month] || {}
      out[row.month][key] = out[row.month][key] || {
        value: eff.value,
        other: eff.other,
        label: activityLabelOf(eff.value, eff.other),
        total: 0,
      }
      out[row.month][key].total = Math.round((out[row.month][key].total + row.amount) * 100) / 100
    })
    return out
  },
}
