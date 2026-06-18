/**
 * Permission Matrix — Single Source of Truth
 *
 * Maps every module to each role's access level:
 *   'V'  → View only
 *   'E'  → Edit / Create / Update (also grants view)
 *   null → No access
 *
 * Consumed via the usePermission hook and ProtectedRoute. Business locks
 * (completed projects, locked payroll, imported attendance) are enforced
 * separately in their modules and override these grants unconditionally.
 *
 * @module constants/permissions
 */

import { ROLE } from './roles'
import { MODULE } from './modules'

export const ACCESS = {
  VIEW: 'V',
  EDIT: 'E',
  NONE: null,
}

export const PERMISSIONS = {
  [MODULE.DASHBOARD]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.VIEW,
    [ROLE.FINANCE]: ACCESS.VIEW,
    [ROLE.PROJECT_OFFICER]: ACCESS.VIEW,
  },
  [MODULE.PROJECTS]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.VIEW,
    [ROLE.FINANCE]: ACCESS.VIEW,
    [ROLE.PROJECT_OFFICER]: ACCESS.EDIT,
  },
  [MODULE.PROJECT_EXPENSES]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.VIEW,
    [ROLE.FINANCE]: ACCESS.EDIT,
    [ROLE.PROJECT_OFFICER]: ACCESS.EDIT,
  },
  [MODULE.PROJECT_DOCUMENTS]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.VIEW,
    [ROLE.FINANCE]: ACCESS.VIEW,
    [ROLE.PROJECT_OFFICER]: ACCESS.EDIT,
  },
  [MODULE.STAFF_PAYROLL]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.EDIT,
    [ROLE.FINANCE]: ACCESS.VIEW,
    [ROLE.PROJECT_OFFICER]: ACCESS.NONE,
  },
  [MODULE.ATTENDANCE]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.EDIT,
    [ROLE.FINANCE]: ACCESS.VIEW,
    [ROLE.PROJECT_OFFICER]: ACCESS.NONE,
  },
  [MODULE.EXPENSE_MANAGEMENT]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.EDIT,
    [ROLE.FINANCE]: ACCESS.VIEW,
    [ROLE.PROJECT_OFFICER]: ACCESS.NONE,
  },
  [MODULE.FINANCE]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.VIEW,
    [ROLE.FINANCE]: ACCESS.EDIT,
    [ROLE.PROJECT_OFFICER]: ACCESS.NONE,
  },
  [MODULE.REPORTS]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.VIEW,
    [ROLE.FINANCE]: ACCESS.VIEW,
    [ROLE.PROJECT_OFFICER]: ACCESS.VIEW,
  },
  [MODULE.AUDIT_LOGS]: {
    [ROLE.CEO]: ACCESS.VIEW,
    [ROLE.HEADS]: ACCESS.VIEW,
    [ROLE.HR]: ACCESS.VIEW,
    [ROLE.FINANCE]: ACCESS.VIEW,
    [ROLE.PROJECT_OFFICER]: ACCESS.VIEW,
  },
}
