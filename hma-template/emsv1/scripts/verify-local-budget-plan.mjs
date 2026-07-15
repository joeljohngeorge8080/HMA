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

// ── task/subtask CRUD ───────────────────────────────────────────────
localBudgetPlan.fullDelete(PID)
plan = localBudgetPlan.initializePlan(PID, {
  projectValue: 1000000,
  startDate: '2026-08',
  endDate: '2026-09',
  poolPct: { admin: 5, hr: 5, core: 5 },
})

plan = localBudgetPlan.addTask(PID, '2026-08', { phase: 'implementation', name: 'Training' })
const taskId = plan.months[0].tasks[0].id
assert.equal(plan.months[0].tasks[0].name, 'Training')
assert.deepEqual(plan.months[0].tasks[0].subtasks, [])
assert.equal(plan.months[0].tasks[0].recurring, false)
assert.equal(plan.months[0].tasks[0].added_in_actual, false)

plan = localBudgetPlan.addSubtask(PID, '2026-08', taskId, { name: 'Venue rent', planned_amount: 5000 })
const subtaskId = plan.months[0].tasks[0].subtasks[0].id
assert.equal(plan.months[0].tasks[0].subtasks[0].planned_amount, 5000)
assert.equal(plan.months[0].tasks[0].subtasks[0].actual_amount, 0)
assert.equal(plan.months[0].tasks[0].subtasks[0].actual_status, 'pending')

plan = localBudgetPlan.updateSubtaskPlanned(PID, '2026-08', taskId, subtaskId, 6000)
assert.equal(plan.months[0].tasks[0].subtasks[0].planned_amount, 6000)

plan = localBudgetPlan.addSubtask(PID, '2026-08', taskId, { name: 'Food', planned_amount: 1000 })
assert.equal(plan.months[0].tasks[0].subtasks.length, 2)
const foodId = plan.months[0].tasks[0].subtasks[1].id
plan = localBudgetPlan.removeSubtask(PID, '2026-08', taskId, foodId)
assert.equal(plan.months[0].tasks[0].subtasks.length, 1)

plan = localBudgetPlan.removeTask(PID, '2026-08', taskId)
assert.equal(plan.months[0].tasks.length, 0)

// ── recurring tasks ─────────────────────────────────────────────────
plan = localBudgetPlan.applyRecurringTasks(PID, {
  phase: 'monitoring',
  name: 'Field visit',
  totalAmount: 100,
})
assert.equal(plan.months[0].tasks.length, 1)
assert.equal(plan.months[1].tasks.length, 1)
assert.equal(plan.months[0].tasks[0].recurring, true)
// 100 split across 2 months: 50/50
assert.equal(plan.months[0].tasks[0].subtasks[0].planned_amount, 50)
assert.equal(plan.months[1].tasks[0].subtasks[0].planned_amount, 50)

// ── locked once submitted ───────────────────────────────────────────
plan.status = 'submitted'
localBudgetPlan.__setPlanForTest(PID, plan)
assert.throws(() => localBudgetPlan.addTask(PID, '2026-08', { phase: 'design', name: 'X' }), /locked/)
plan.status = 'planning'
localBudgetPlan.__setPlanForTest(PID, plan)

// ── moveBalance: send from a month to HR/Core (planning phase) ─────
localBudgetPlan.fullDelete(PID)
plan = localBudgetPlan.initializePlan(PID, {
  projectValue: 1000000,
  startDate: '2026-08',
  endDate: '2026-10',
  poolPct: { admin: 5, hr: 5, core: 5 },
})
// month 2026-08 baseline is ~283,333.33 (850000/3); send 3000 to HR+Core, 50/50
plan = localBudgetPlan.moveBalance(PID, {
  originMonth: '2026-08',
  direction: 'send',
  targets: ['hr', 'core'],
  amount: 3000,
  phase: 'planning',
  createdBy: 'PO',
})
const sendTransfers = plan.transfers.filter((t) => t.origin_month === '2026-08')
assert.equal(sendTransfers.length, 2)
assert.equal(
  sendTransfers.reduce((s, t) => s + t.amount, 0),
  3000,
)
assert.ok(sendTransfers.every((t) => t.from === 'month:2026-08'))
assert.deepEqual(sendTransfers.map((t) => t.to).sort(), ['core', 'hr'])

// ── moveBalance: send to multiple months, equal split ──────────────
plan = localBudgetPlan.moveBalance(PID, {
  originMonth: '2026-09',
  direction: 'send',
  targets: ['month:2026-08', 'month:2026-10'],
  amount: 100,
  phase: 'planning',
  createdBy: 'PO',
})
const monthSendTransfers = plan.transfers.filter((t) => t.origin_month === '2026-09')
assert.equal(monthSendTransfers.length, 2)
assert.deepEqual(
  monthSendTransfers.map((t) => t.amount).sort((a, b) => a - b),
  [50, 50],
)

// ── moveBalance: take from HR/Core into a month ────────────────────
plan = localBudgetPlan.moveBalance(PID, {
  originMonth: '2026-10',
  direction: 'take',
  targets: ['hr'],
  amount: 200,
  phase: 'planning',
  createdBy: 'PO',
})
const takeTransfer = plan.transfers.find(
  (t) => t.origin_month === '2026-10' && t.from === 'hr' && t.to === 'month:2026-10',
)
assert.ok(takeTransfer)
assert.equal(takeTransfer.amount, 200)

// ── moveBalance rejects an invalid transfer with a plain error ──────
assert.throws(
  () =>
    localBudgetPlan.moveBalance(PID, {
      originMonth: '2026-10',
      direction: 'take',
      targets: ['hr'],
      amount: 9999999,
      phase: 'planning',
      createdBy: 'PO',
    }),
  /available/,
)

// ── revokeTransfer ──────────────────────────────────────────────────
const toRevoke = plan.transfers.find((t) => t.id === takeTransfer.id)
plan = localBudgetPlan.revokeTransfer(PID, toRevoke.id)
assert.equal(plan.transfers.some((t) => t.id === toRevoke.id), false)

// revoking a planning transfer after submit is blocked
const someTransferId = plan.transfers[0].id
plan.status = 'submitted'
localBudgetPlan.__setPlanForTest(PID, plan)
assert.throws(() => localBudgetPlan.revokeTransfer(PID, someTransferId), /locked/)
plan.status = 'planning'
localBudgetPlan.__setPlanForTest(PID, plan)

// ── resetMonth ───────────────────────────────────────────────────────
// 2026-09's outgoing transfers should vanish; 2026-08/2026-10's incoming
// halves of that same pair also vanish (paired removal, both sides
// tagged with origin_month = 2026-09 in this implementation — see below).
plan = localBudgetPlan.resetMonth(PID, '2026-09')
assert.equal(
  plan.transfers.some((t) => t.origin_month === '2026-09'),
  false,
)
// the 2026-08 → HR/Core send from earlier (origin_month 2026-08) must still be there
assert.ok(plan.transfers.some((t) => t.origin_month === '2026-08'))

// ── setPoolCapAdjustment ─────────────────────────────────────────────
localBudgetPlan.fullDelete(PID)
plan = localBudgetPlan.initializePlan(PID, {
  projectValue: 1000000,
  startDate: '2026-08',
  endDate: '2026-08',
  poolPct: { admin: 5, hr: 5, core: 5 },
})
// HR cap is 50000 (5% of 1,000,000). Lower it to 30000 → 20000 flows to the target month.
plan = localBudgetPlan.setPoolCapAdjustment(PID, {
  pool: 'hr',
  targetMonth: '2026-08',
  newAmount: 30000,
  createdBy: 'PO',
})
const capTransfer = plan.transfers.find((t) => t.tag === 'pool_cap_adjustment' && t.pool_ref === 'hr')
assert.ok(capTransfer)
assert.equal(capTransfer.amount, 20000)
// raising it back above the 50000 cap is rejected
assert.throws(() =>
  localBudgetPlan.setPoolCapAdjustment(PID, {
    pool: 'hr',
    targetMonth: '2026-08',
    newAmount: 60000,
    createdBy: 'PO',
  }),
)
// raising back to exactly the cap removes the adjustment transfer entirely
plan = localBudgetPlan.setPoolCapAdjustment(PID, {
  pool: 'hr',
  targetMonth: '2026-08',
  newAmount: 50000,
  createdBy: 'PO',
})
assert.equal(
  plan.transfers.some((t) => t.tag === 'pool_cap_adjustment' && t.pool_ref === 'hr'),
  false,
)

// ── computeSettlement / submit ──────────────────────────────────────
localBudgetPlan.fullDelete(PID)
plan = localBudgetPlan.initializePlan(PID, {
  projectValue: 300000,
  startDate: '2026-08',
  endDate: '2026-08',
  poolPct: { admin: 5, hr: 5, core: 5 },
})
// working pool = 255000, 1 month → baseline 255000. Plan nothing yet → unsettled (surplus).
let check = localBudgetPlan.computeSettlement(PID)
assert.equal(check.valid, false)
assert.equal(check.totalSurplus, 255000)
assert.throws(() => localBudgetPlan.submit(PID), /settle/i)

plan = localBudgetPlan.addTask(PID, '2026-08', { phase: 'design', name: 'X' })
const soleTaskId = plan.months[0].tasks[0].id
plan = localBudgetPlan.addSubtask(PID, '2026-08', soleTaskId, { name: 'Y', planned_amount: 255000 })
check = localBudgetPlan.computeSettlement(PID)
assert.equal(check.valid, true)

plan = localBudgetPlan.submit(PID)
assert.equal(plan.status, 'submitted')
assert.ok(plan.submitted_at)
assert.equal(plan.months[0].tasks[0].subtasks[0].actual_amount, 0)
assert.equal(plan.months[0].tasks[0].subtasks[0].actual_status, 'pending')

// planning mutators are now locked
assert.throws(() => localBudgetPlan.addTask(PID, '2026-08', { phase: 'design', name: 'Z' }), /locked/)

// ── drawFromAdmin (96% regression case, exercised pre-submit) ───────
localBudgetPlan.fullDelete(PID)
plan = localBudgetPlan.initializePlan(PID, {
  projectValue: 1000000,
  startDate: '2026-08',
  endDate: '2026-08',
  poolPct: { admin: 5, hr: 5, core: 5 },
})
plan = localBudgetPlan.addTask(PID, '2026-08', { phase: 'design', name: 'Big' })
const bigTaskId = plan.months[0].tasks[0].id
plan = localBudgetPlan.addSubtask(PID, '2026-08', bigTaskId, { name: 'Everything', planned_amount: 960000 })
check = localBudgetPlan.computeSettlement(PID)
assert.equal(check.adminDraw.amount, 10000)
assert.throws(() => localBudgetPlan.submit(PID), /settle/i, 'still unsettled — HR/Core not yet drawn')

// PO takes from HR/Core first (as the ladder message directs)
plan = localBudgetPlan.moveBalance(PID, {
  originMonth: '2026-08',
  direction: 'take',
  targets: ['hr', 'core'],
  amount: 100000,
  phase: 'planning',
  createdBy: 'PO',
})
check = localBudgetPlan.computeSettlement(PID)
assert.equal(check.valid, false)
assert.equal(check.adminDraw.amount, 10000, 'exactly the true remainder, not a flat 5%')

plan = localBudgetPlan.drawFromAdmin(PID, { createdBy: 'PO' })
check = localBudgetPlan.computeSettlement(PID)
assert.equal(check.valid, true)
assert.ok(
  localBudgetPlan.getPlan(PID).transfers.some((t) => t.from === 'admin' && t.to === 'month:2026-08'),
)
plan = localBudgetPlan.submit(PID)
assert.equal(plan.status, 'submitted')

// ── actual phase: updateActual, addActualTask, Send remainder ──────
plan = localBudgetPlan.updateActual(PID, '2026-08', bigTaskId, plan.months[0].tasks[0].subtasks[0].id, 900000)
const bigSubtaskId = plan.months[0].tasks[0].subtasks[0].id
assert.equal(plan.months[0].tasks[0].subtasks[0].actual_amount, 900000)
assert.equal(plan.months[0].tasks[0].subtasks[0].actual_status, 'entered')

plan = localBudgetPlan.addActualTask(PID, '2026-08', { phase: 'monitoring', name: 'Unplanned extra' })
const extraTask = plan.months[0].tasks.find((t) => t.name === 'Unplanned extra')
assert.equal(extraTask.added_in_actual, true)
assert.equal(extraTask.subtasks.length, 0)

// send the 60000 actual remainder from the big subtask to HR/Core
plan = localBudgetPlan.moveBalance(PID, {
  originMonth: '2026-08',
  direction: 'send',
  targets: ['hr', 'core'],
  amount: 60000,
  phase: 'actual',
  createdBy: 'PO',
  subtaskRef: { month: '2026-08', taskId: bigTaskId, subtaskId: bigSubtaskId },
})
assert.equal(
  plan.months[0].tasks[0].subtasks[0].actual_status,
  'transferred',
  'sending a subtask remainder flags it transferred',
)

// addSubtask is allowed on an added_in_actual task even though the plan is submitted
plan = localBudgetPlan.getPlan(PID)
assert.equal(plan.status, 'submitted')
const extraTaskId = plan.months[0].tasks.find((t) => t.added_in_actual).id
plan = localBudgetPlan.addSubtask(PID, '2026-08', extraTaskId, { name: 'Fuel', planned_amount: 0 })
assert.equal(
  plan.months[0].tasks.find((t) => t.id === extraTaskId).subtasks.length,
  1,
)
// but a normal (non-added_in_actual) task still can't get a new subtask post-submit
assert.throws(
  () => localBudgetPlan.addSubtask(PID, '2026-08', bigTaskId, { name: 'X', planned_amount: 0 }),
  /locked/,
)

console.log('localBudgetPlan.js: ALL PASSED')
