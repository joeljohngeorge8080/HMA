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

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const now = () => new Date().toISOString()

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

const SALARY_20000_FLAG = 'hma_employees_salary_20000_v1'

/**
 * One-time migration: sets every employee's current_salary to ₹20,000,
 * recording the change in each employee's salary_history (same record
 * shape as localEmployees.updateSalaryDirect) rather than silently
 * overwriting current_salary, per the payroll immutability rule.
 * Runs once per browser (guarded by SALARY_20000_FLAG); call after seedLocalEmployees().
 */
export function applySalary20000Migration() {
  if (localStorage.getItem(SALARY_20000_FLAG)) return // already applied

  try {
    const employees = JSON.parse(localStorage.getItem(KEY) || '[]')
    const ts = now()
    const today = ts.slice(0, 10)

    const updated = employees.map((e) => {
      const previous = parseFloat(e.current_salary || 0)
      const newSalary = 20000
      if (previous === newSalary) return e
      return {
        ...e,
        current_salary: newSalary,
        salary_history: [
          ...(e.salary_history || []),
          {
            id: uid(),
            previous_salary: previous,
            increment_percentage: 0,
            increment_amount: newSalary - previous,
            new_salary: newSalary,
            effective_date: today,
            remarks: 'Bulk salary set to ₹20,000',
            created_at: ts,
          },
        ],
        updated_at: ts,
      }
    })

    localStorage.setItem(KEY, JSON.stringify(updated))
    localStorage.setItem(SALARY_20000_FLAG, '1')
  } catch (err) {
    console.warn('[applySalary20000Migration] Failed to set employee salaries:', err)
  }
}

const CORE_SALARY_SYNC_FLAG = 'hma_core_salary_expenses_synced_20000_v1'
const CORE_SAL_KEY = 'hma_core_salary_expenses'

/**
 * One-time migration: Core Pool "Core Expenses" (modules/ems/core-pool/CorePoolPage.jsx)
 * snapshots an employee's salary into a separate persisted record when they're added
 * as a core overhead expense — it does not read current_salary live afterward. Any
 * entry added before applySalary20000Migration() ran is now stale. This brings existing
 * entries in line with the new ₹20,000 baseline; entries added from now on already
 * snapshot the live (updated) current_salary at add-time, so only pre-existing entries
 * need this one-time correction.
 * Runs once per browser (guarded by CORE_SALARY_SYNC_FLAG); call after applySalary20000Migration().
 */
export function syncCoreSalaryExpenses() {
  if (localStorage.getItem(CORE_SALARY_SYNC_FLAG)) return // already synced

  try {
    const employees = JSON.parse(localStorage.getItem(KEY) || '[]')
    const employeeById = new Map(employees.map((e) => [e.id, e]))

    const entries = JSON.parse(localStorage.getItem(CORE_SAL_KEY) || '[]')
    const updated = entries.map((entry) => {
      const emp = employeeById.get(entry.employee_id)
      if (!emp) return entry
      return { ...entry, salary: parseFloat(emp.current_salary) || 0 }
    })

    localStorage.setItem(CORE_SAL_KEY, JSON.stringify(updated))
    localStorage.setItem(CORE_SALARY_SYNC_FLAG, '1')
  } catch (err) {
    console.warn('[syncCoreSalaryExpenses] Failed to sync core salary expenses:', err)
  }
}

const DESIGNATION_MIGRATION_FLAG = 'hma_employees_designation_po_v1';

export function applyProjectOfficerMigration() {
  if (localStorage.getItem(DESIGNATION_MIGRATION_FLAG)) return;
  try {
    const employees = JSON.parse(localStorage.getItem(KEY) || '[]');
    let changed = false;
    const updated = employees.map(e => {
      if (e.employee_name !== 'Jithin Dominic' && e.employee_name !== 'Arjuna V Nath') {
        if (e.employment && e.employment.designation && e.employment.designation.includes('Project Associate')) {
          e.employment.designation = e.employment.designation.replace('Project Associate', 'Project Officer');
          changed = true;
        }
      }
      return e;
    });
    if (changed) {
      localStorage.setItem(KEY, JSON.stringify(updated));
    }
    localStorage.setItem(DESIGNATION_MIGRATION_FLAG, '1');
  } catch (err) {
    console.warn('[applyProjectOfficerMigration] Failed:', err);
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
