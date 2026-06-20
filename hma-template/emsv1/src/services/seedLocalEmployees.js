/**
 * seedLocalEmployees.js
 *
 * Pre-populates localStorage with the 73 HMA employees (64 from MANPOWER HMA.xlsx
 * + 9 attendance-only employees) on first app load. Employee IDs now use the Pace
 * attendance THLL format (e.g. THLL2408) so that attendance imports link correctly.
 *
 * Behaviour:
 *  - Runs once per version: if the current seed flag is already set, it does nothing.
 *  - Never overwrites existing employee records — only adds employees whose
 *    employee_id is not already present in the store.
 *  - v2 migration: renames HMA* employee_ids to their THLL equivalents in existing
 *    localStorage data so that any previously-seeded records stay linked correctly.
 *  - Call this once at app startup (before rendering).
 */

import seedData from './seedEmployees.json'

const KEY = 'hma_employees'
const SEED_FLAG = 'hma_employees_seeded_v2'
const OLD_FLAG = 'hma_employees_seeded_v1'

// Maps old HMA IDs (from v1 seed) to corrected THLL IDs
const HMA_TO_THLL = {
  HMA010: 'THLL2408',
  HMA011: 'THLL4831',
  HMA012: 'THLL2412',
  HMA013: 'THLL2414',
  HMA014: 'THLL2415',
  HMA015: 'THLL2419',
  HMA016: 'THLL2421',
  HMA017: 'THLL2426',
  HMA018: 'THLL2707',
  HMA019: 'THLL2721',
  HMA020: 'THLL2722',
  HMA021: 'THLL2752',
  HMA022: 'THLL2815',
  HMA024: 'THLL2994',
  HMA025: 'THLL2997',
  HMA027: 'THLL3312',
  HMA028: 'THLL3351',
  HMA029: 'THLL3353',
  HMA030: 'THLL3448',
  HMA033: 'THLL4073',
  HMA041: 'THLL4229',
  HMA042: 'THLL4398',
  HMA044: 'THLL4868',
  HMA045: 'THLL4896',
  HMA046: 'THLL4941',
  HMA047: 'THLL4977',
  HMA049: 'THLL5548',
  HMA050: 'THLL5642',
  HMA052: 'THLL5811',
  HMA053: 'THLL5852',
  HMA054: 'THLL5910',
  HMA055: 'THLL6289',
  HMA056: 'THLL6296',
  HMA058: 'THLL6428',
  HMA059: 'THLL6464',
  HMA060: 'THLL6466',
  HMA061: 'THLL6465',
  HMA062: 'THLL6467',
  HMA063: 'THLL6468',
  HMA064: 'THLL6478',
}

function migrateEmployeeIds(employees) {
  return employees.map((e) => {
    const newId = HMA_TO_THLL[e.employee_id]
    if (!newId) return e
    return {
      ...e,
      employee_id: newId,
      employment: e.employment ? { ...e.employment } : e.employment,
    }
  })
}

function migrateAttendanceIds() {
  try {
    const raw = localStorage.getItem('hma_attendance')
    if (!raw) return
    const data = JSON.parse(raw)
    let changed = false
    const updated = data.map((record) => {
      const newId = HMA_TO_THLL[record.employee_id]
      if (!newId) return record
      changed = true
      return { ...record, employee_id: newId }
    })
    if (changed) localStorage.setItem('hma_attendance', JSON.stringify(updated))
  } catch {
    // silent — attendance migration is best-effort
  }
}

export function seedLocalEmployees() {
  if (localStorage.getItem(SEED_FLAG)) return // already on v2

  try {
    let existing = JSON.parse(localStorage.getItem(KEY) || '[]')

    // If this browser had the v1 seed, migrate employee_ids in-place first
    if (localStorage.getItem(OLD_FLAG)) {
      existing = migrateEmployeeIds(existing)
      migrateAttendanceIds()
      localStorage.removeItem(OLD_FLAG)
    }

    const existingIds = new Set(existing.map((e) => e.employee_id))
    const toAdd = seedData.filter((e) => !existingIds.has(e.employee_id))
    if (toAdd.length > 0) {
      localStorage.setItem(KEY, JSON.stringify([...existing, ...toAdd]))
    } else {
      localStorage.setItem(KEY, JSON.stringify(existing))
    }

    localStorage.setItem(SEED_FLAG, '1')
  } catch (err) {
    console.warn('[seedLocalEmployees] Failed to seed employee data:', err)
  }
}
