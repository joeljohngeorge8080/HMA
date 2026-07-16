/**
 * User Role Constants
 *
 * The five HMA IEMS roles. Used as the single vocabulary for the
 * permission matrix, sidebar role-gating, and ProtectedRoute checks.
 *
 * @module constants/roles
 */

export const ROLE = {
  ADMIN: 'Admin',
  CEO: 'CEO',
  HEADS: 'Heads',
  HR: 'HR',
  PROJECT_ASSOCIATE: 'Project Associate',
  PROJECT_OFFICER: 'Project Officer',
  EMPLOYEE: 'Employee',
}

export const ROLES = [
  ROLE.ADMIN,
  ROLE.CEO,
  ROLE.HEADS,
  ROLE.HR,
  ROLE.PROJECT_ASSOCIATE,
  ROLE.PROJECT_OFFICER,
  ROLE.EMPLOYEE,
]
