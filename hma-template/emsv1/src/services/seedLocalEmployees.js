/**
 * seedLocalEmployees.js
 *
 * Pre-populates localStorage with the 64 real HMA employees from
 * docs/MANPOWER HMA.xlsx on first app load.
 *
 * Behaviour:
 *  - Runs once: if the seed flag is already set, it does nothing.
 *  - Never overwrites existing employee records — only adds employees
 *    whose employee_id is not already present in the store.
 *  - Call this once at app startup (before rendering).
 */

import seedData from './seedEmployees.json'

const KEY = 'hma_employees'
const SEED_FLAG = 'hma_employees_seeded_v1'

export function seedLocalEmployees() {
  if (localStorage.getItem(SEED_FLAG)) return // already seeded

  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || '[]')
    const existingIds = new Set(existing.map((e) => e.employee_id))

    const toAdd = seedData.filter((e) => !existingIds.has(e.employee_id))
    if (toAdd.length > 0) {
      localStorage.setItem(KEY, JSON.stringify([...existing, ...toAdd]))
    }

    localStorage.setItem(SEED_FLAG, '1')
  } catch (err) {
    console.warn('[seedLocalEmployees] Failed to seed employee data:', err)
  }
}
