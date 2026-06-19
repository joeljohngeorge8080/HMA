/**
 * User Role Constants
 *
 * The five HMA IEMS roles. Used as the single vocabulary for the
 * permission matrix, sidebar role-gating, and ProtectedRoute checks.
 *
 * @module constants/roles
 */

export const ROLE = {
  CEO: 'CEO',
  HEADS: 'Heads',
  HR: 'HR',
  FINANCE: 'Finance',
  PROJECT_OFFICER: 'Project Officer',
}

export const ROLES = [ROLE.CEO, ROLE.HEADS, ROLE.HR, ROLE.FINANCE, ROLE.PROJECT_OFFICER]
