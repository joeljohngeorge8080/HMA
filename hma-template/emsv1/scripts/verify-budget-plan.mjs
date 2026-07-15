import assert from 'node:assert/strict'
import { loadEsmSource } from './load-esm-source.mjs'

const {
  monthsInRange,
  equalSplit,
  computeWorkingPool,
  monthBaseline,
  netForEntity,
  monthAllocated,
  monthPlannedTotal,
  monthActualTotal,
  poolBalance,
  monthAvailableBalance,
} = await loadEsmSource('src/services/budgetPlan.js')

// ── monthsInRange ───────────────────────────────────────────────────
assert.deepEqual(monthsInRange('2026-08', '2026-10'), ['2026-08', '2026-09', '2026-10'])
assert.deepEqual(monthsInRange('2026-11', '2027-01'), ['2026-11', '2026-12', '2027-01'])
assert.deepEqual(monthsInRange('', ''), [])

// ── equalSplit — exact paise, last recipient absorbs rounding ──────
assert.deepEqual(equalSplit(100, 3), [33.33, 33.33, 33.34])
assert.equal(
  equalSplit(100, 3).reduce((s, n) => s + n, 0),
  100,
)
assert.equal(
  Math.round(equalSplit(5000, 9).reduce((s, n) => s + n, 0) * 100) / 100,
  5000,
)
assert.deepEqual(equalSplit(10, 1), [10])
assert.deepEqual(equalSplit(10, 0), [])

// ── computeWorkingPool ──────────────────────────────────────────────
assert.equal(computeWorkingPool(1000000, { admin: 5, hr: 5, core: 5 }), 850000)
assert.equal(computeWorkingPool(1000000, { admin: 5, hr: 5, core: 6 }), 840000)

// ── monthBaseline ───────────────────────────────────────────────────
assert.equal(monthBaseline(850000, 10), 85000)
assert.equal(monthBaseline(850000, 0), 0)

// ── netForEntity ────────────────────────────────────────────────────
const transfers = [
  { from: 'month:2026-08', to: 'hr', amount: 2000 },
  { from: 'hr', to: 'month:2026-09', amount: 500 },
]
assert.equal(netForEntity(transfers, 'month:2026-08'), -2000)
assert.equal(netForEntity(transfers, 'hr'), 2000 - 500)
assert.equal(netForEntity(transfers, 'month:2026-09'), 500)
assert.equal(netForEntity(transfers, 'core'), 0)

// ── monthAllocated ──────────────────────────────────────────────────
assert.equal(monthAllocated(85000, transfers, '2026-08'), 83000)
assert.equal(monthAllocated(85000, transfers, '2026-09'), 85500)
assert.equal(monthAllocated(85000, transfers, '2026-10'), 85000)

// ── monthPlannedTotal / monthActualTotal ───────────────────────────
const tasks = [
  {
    phase: 'implementation',
    name: 'Training',
    subtasks: [
      { name: 'Venue rent', planned_amount: 5000, actual_amount: 4200 },
      { name: 'Food', planned_amount: 3000, actual_amount: 3000 },
    ],
  },
  {
    phase: 'design',
    name: 'Survey',
    subtasks: [{ name: 'Printing', planned_amount: 2000, actual_amount: 0 }],
  },
]
assert.equal(monthPlannedTotal(tasks), 10000)
assert.equal(monthActualTotal(tasks), 7200)
assert.equal(monthPlannedTotal([]), 0)
assert.equal(monthPlannedTotal(undefined), 0)

// ── poolBalance ─────────────────────────────────────────────────────
assert.equal(poolBalance(1000000, { admin: 5, hr: 5, core: 5 }, 'hr', transfers), 50000 + 1500)
assert.equal(poolBalance(1000000, { admin: 5, hr: 5, core: 5 }, 'core', transfers), 50000)

// ── monthAvailableBalance ───────────────────────────────────────────
// month 2026-08 is allocated 83000 (after the -2000 transfer above) with 10000 planned → 73000 spare
const byMonth = { '2026-08': tasks }
assert.equal(monthAvailableBalance(85000, transfers, byMonth, '2026-08'), 73000)
assert.equal(monthAvailableBalance(85000, transfers, {}, '2026-10'), 85000)

console.log('budgetPlan.js: ALL PASSED')
