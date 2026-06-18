/**
 * Application Routes Configuration
 *
 * HMA IEMS route table. Each route carries:
 * - path:    URL path (hash router)
 * - name:    Breadcrumb / display name
 * - element: Component to render
 * - module:  Module key from constants/modules.js (used by ProtectedRoute,
 *            wired in Phase 1)
 *
 * Modules that are not yet built render a Placeholder. As each module is
 * implemented its routes are swapped for the real lazy-loaded views.
 *
 * @module routes
 */

import React from 'react'

import { MODULE } from './constants/modules'
import Placeholder from './views/Placeholder'

// Built views
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const EmployeeList = React.lazy(() => import('./views/staff/EmployeeList'))
const EmployeeProfile = React.lazy(() => import('./views/staff/EmployeeProfile'))
const EmployeeForm = React.lazy(() => import('./views/staff/EmployeeForm'))
const AttendanceDashboard = React.lazy(() => import('./views/attendance/AttendanceDashboard'))
const AttendanceImport = React.lazy(() => import('./views/attendance/AttendanceImport'))
const AttendanceCorrections = React.lazy(() => import('./views/attendance/AttendanceCorrections'))

/**
 * Build a placeholder page component bound to a fixed title/message.
 * @param {string} title
 * @param {string} [message]
 * @returns {React.FunctionComponent}
 */
const placeholder = (title, message) => {
  const Page = () => React.createElement(Placeholder, { title, message })
  Page.displayName = `Placeholder(${title})`
  return Page
}

const ML_SOON = 'Forecasting is a future ML integration and is not yet available.'

export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard, module: MODULE.DASHBOARD },

  // Projects
  {
    path: '/projects/csr',
    name: 'CSR Projects',
    element: placeholder('CSR Projects'),
    module: MODULE.PROJECTS,
  },
  {
    path: '/projects/lsgb',
    name: 'LSGB Projects',
    element: placeholder('LSGB Projects'),
    module: MODULE.PROJECTS,
  },
  {
    path: '/projects/other',
    name: 'Other Projects',
    element: placeholder('Other Projects'),
    module: MODULE.PROJECTS,
  },
  {
    path: '/projects/:id',
    name: 'Project Detail',
    element: placeholder('Project Detail'),
    module: MODULE.PROJECTS,
  },

  // Staff & Payroll
  { path: '/staff', name: 'Staff & Payroll', element: EmployeeList, module: MODULE.STAFF_PAYROLL },
  {
    path: '/staff/new',
    name: 'Add Employee',
    element: EmployeeForm,
    module: MODULE.STAFF_PAYROLL,
  },
  {
    path: '/staff/:id/edit',
    name: 'Edit Employee',
    element: EmployeeForm,
    module: MODULE.STAFF_PAYROLL,
  },
  {
    path: '/staff/:id',
    name: 'Employee Profile',
    element: EmployeeProfile,
    module: MODULE.STAFF_PAYROLL,
  },

  // Attendance
  {
    path: '/attendance',
    name: 'Attendance',
    element: AttendanceDashboard,
    module: MODULE.ATTENDANCE,
  },
  {
    path: '/attendance/import',
    name: 'Attendance Import',
    element: AttendanceImport,
    module: MODULE.ATTENDANCE,
  },
  {
    path: '/attendance/corrections',
    name: 'Attendance Corrections',
    element: AttendanceCorrections,
    module: MODULE.ATTENDANCE,
  },

  // Expense Management
  {
    path: '/expenses',
    name: 'Expense Management',
    element: placeholder('Expense Management'),
    module: MODULE.EXPENSE_MANAGEMENT,
  },

  // Finance
  { path: '/finance', name: 'Finance', element: placeholder('Finance'), module: MODULE.FINANCE },

  // Reports & Analysis
  {
    path: '/reports',
    name: 'Reports & Analysis',
    element: placeholder('Reports & Analysis'),
    module: MODULE.REPORTS,
  },
  {
    path: '/reports/attendance',
    name: 'Attendance Report',
    element: placeholder('Attendance Report'),
    module: MODULE.REPORTS,
  },
  {
    path: '/reports/projects',
    name: 'Project Report',
    element: placeholder('Project Report'),
    module: MODULE.REPORTS,
  },
  {
    path: '/reports/projects/overall',
    name: 'Overall Project Report',
    element: placeholder('Overall Project Report'),
    module: MODULE.REPORTS,
  },
  {
    path: '/reports/forecast',
    name: 'Forecast Report',
    element: placeholder('Forecast Report', ML_SOON),
    module: MODULE.REPORTS,
  },
  {
    path: '/reports/predicted',
    name: 'Predicted vs Actual',
    element: placeholder('Predicted vs Actual', ML_SOON),
    module: MODULE.REPORTS,
  },
  {
    path: '/reports/actual-expense',
    name: 'Actual Expense Report',
    element: placeholder('Actual Expense Report'),
    module: MODULE.REPORTS,
  },

  // Audit Logs
  {
    path: '/audit-logs',
    name: 'Audit Logs',
    element: placeholder('Audit Logs'),
    module: MODULE.AUDIT_LOGS,
  },
  {
    path: '/audit-logs/:id',
    name: 'Audit Log Detail',
    element: placeholder('Audit Log Detail'),
    module: MODULE.AUDIT_LOGS,
  },
]

export default routes
