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
  PROJECT_ASSOCIATE: 'Project Associate',
  PROJECT_OFFICER: 'Project Officer',
  FIELD_PERSONNEL: 'Field Personnel',
  BACKEND_TEAM: 'Backend Team',
  PROJECT_COORDINATOR: 'Project Coordinator',
}

export const ROLES = [
  ROLE.CEO,
  ROLE.HEADS,
  ROLE.HR,
  ROLE.FINANCE,
  ROLE.PROJECT_ASSOCIATE,
  ROLE.PROJECT_OFFICER,
  ROLE.FIELD_PERSONNEL,
  ROLE.BACKEND_TEAM,
  ROLE.PROJECT_COORDINATOR,
]
