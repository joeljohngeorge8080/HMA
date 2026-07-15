import assert from 'node:assert/strict'
import { loadEsmSource } from './load-esm-source.mjs'

// minimal localStorage shim — must be installed BEFORE the module loads
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const { localBudgetPlan } = await loadEsmSource('src/services/localBudgetPlan.js')

const PID = 'proj_test_1'

// ── initialize ──────────────────────────────────────────────────────
assert.equal(localBudgetPlan.getPlan(PID), null)
let plan = localBudgetPlan.initializePlan(PID, {
  projectValue: 1000000,
  startDate: '2026-08',
  endDate: '2026-10',
  poolPct: { admin: 5, hr: 5, core: 5 },
})
assert.equal(plan.status, 'planning')
assert.equal(plan.months.length, 3)
assert.deepEqual(
  plan.months.map((m) => m.month),
  ['2026-08', '2026-09', '2026-10'],
)
assert.deepEqual(plan.transfers, [])
assert.equal(plan.saved_snapshot, null)
assert.deepEqual(localBudgetPlan.getPlan(PID), plan)

// re-initializing an existing plan throws (must fullDelete first)
assert.throws(() =>
  localBudgetPlan.initializePlan(PID, {
    projectValue: 1,
    startDate: '2026-08',
    endDate: '2026-09',
    poolPct: { admin: 5, hr: 5, core: 5 },
  }),
)

// ── save / reset ────────────────────────────────────────────────────
plan.months[0].tasks.push({ id: 't1', phase: 'design', name: 'X', subtasks: [] })
localBudgetPlan.__setPlanForTest(PID, plan) // test-only direct write, see Step 3
localBudgetPlan.save(PID)
const afterSave = localBudgetPlan.getPlan(PID)
assert.ok(afterSave.saved_snapshot)
assert.equal(afterSave.saved_snapshot.months[0].tasks.length, 1)

// mutate further, then reset back to the save point
afterSave.months[0].tasks.push({ id: 't2', phase: 'design', name: 'Y', subtasks: [] })
localBudgetPlan.__setPlanForTest(PID, afterSave)
assert.equal(localBudgetPlan.getPlan(PID).months[0].tasks.length, 2)
const afterReset = localBudgetPlan.reset(PID)
assert.equal(afterReset.months[0].tasks.length, 1, 'reset restores the saved snapshot')

// reset with no prior save restores the empty initialized state
localBudgetPlan.fullDelete(PID)
plan = localBudgetPlan.initializePlan(PID, {
  projectValue: 1000000,
  startDate: '2026-08',
  endDate: '2026-09',
  poolPct: { admin: 5, hr: 5, core: 5 },
})
plan.months[0].tasks.push({ id: 't3', phase: 'design', name: 'Z', subtasks: [] })
localBudgetPlan.__setPlanForTest(PID, plan)
const resetToEmpty = localBudgetPlan.reset(PID)
assert.equal(resetToEmpty.months[0].tasks.length, 0, 'reset with no save point restores empty months')

// ── fullDelete ──────────────────────────────────────────────────────
localBudgetPlan.fullDelete(PID)
assert.equal(localBudgetPlan.getPlan(PID), null)

console.log('localBudgetPlan.js: ALL PASSED')
