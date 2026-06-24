import React from 'react'
import { MODULE } from '../constants/modules'
import Placeholder from '../views/Placeholder'

const Dashboard = React.lazy(() => import('../modules/ems/dashboard/Dashboard'))
const MyProfilePage = React.lazy(() => import('../modules/ems/staff-payroll/MyProfilePage'))
const EmployeeList = React.lazy(() => import('../modules/ems/staff-payroll/EmployeeList'))
const EmployeeProfile = React.lazy(() => import('../modules/ems/staff-payroll/EmployeeProfile'))
const EmployeeForm = React.lazy(() => import('../modules/ems/staff-payroll/EmployeeForm'))
const AttendanceDashboard = React.lazy(
  () => import('../modules/ems/attendance/AttendanceDashboard'),
)
const AttendanceImport = React.lazy(() => import('../modules/ems/attendance/AttendanceImport'))
const AttendanceCorrections = React.lazy(
  () => import('../modules/ems/attendance/AttendanceCorrections'),
)

const GeneralExpenseList = React.lazy(
  () => import('../modules/ems/general-expenses/GeneralExpenseList'),
)
const GeneralExpenseForm = React.lazy(
  () => import('../modules/ems/general-expenses/GeneralExpenseForm'),
)
const GeneralExpenseDetail = React.lazy(
  () => import('../modules/ems/general-expenses/GeneralExpenseDetail'),
)
const CategoryManager = React.lazy(
  () => import('../modules/ems/general-expenses/components/CategoryManager'),
)
const ExpenseUpload = React.lazy(
  () => import('../modules/ems/general-expenses/components/ExpenseUpload'),
)
const ExpenseAnalysis = React.lazy(
  () => import('../modules/ems/general-expenses/components/ExpenseAnalysis'),
)

const placeholder = (title, message) => {
  const Page = () => React.createElement(Placeholder, { title, message })
  Page.displayName = `Placeholder(${title})`
  return Page
}

export const emsRoutes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/ems/dashboard', name: 'Dashboard', element: Dashboard, module: MODULE.DASHBOARD },
  { path: '/ems/my-profile', name: 'My Profile', element: MyProfilePage, module: MODULE.MY_PROFILE },

  {
    path: '/ems/staff-payroll',
    name: 'Staff & Payroll',
    element: EmployeeList,
    module: MODULE.STAFF_PAYROLL,
  },
  {
    path: '/ems/staff-payroll/new',
    name: 'Add Employee',
    element: EmployeeForm,
    module: MODULE.STAFF_PAYROLL,
  },
  {
    path: '/ems/staff-payroll/:id/edit',
    name: 'Edit Employee',
    element: EmployeeForm,
    module: MODULE.STAFF_PAYROLL,
  },
  {
    path: '/ems/staff-payroll/:id',
    name: 'Employee Profile',
    element: EmployeeProfile,
    module: MODULE.STAFF_PAYROLL,
  },

  {
    path: '/ems/attendance',
    name: 'Attendance',
    element: AttendanceDashboard,
    module: MODULE.ATTENDANCE,
  },
  {
    path: '/ems/attendance/import',
    name: 'Import Excel',
    element: AttendanceImport,
    module: MODULE.ATTENDANCE,
  },
  {
    path: '/ems/attendance/corrections',
    name: 'Corrections',
    element: AttendanceCorrections,
    module: MODULE.ATTENDANCE,
  },

  {
    path: '/ems/expense-management',
    name: 'Expense Management',
    element: placeholder('Expense Management'),
    module: MODULE.EXPENSE_MANAGEMENT,
  },

  {
    path: '/ems/general-expenses',
    name: 'General Expenses',
    element: GeneralExpenseList,
    module: MODULE.GENERAL_EXPENSES,
  },
  {
    path: '/ems/general-expenses/new',
    name: 'Add Expense',
    element: GeneralExpenseForm,
    module: MODULE.GENERAL_EXPENSES,
  },
  {
    path: '/ems/general-expenses/categories',
    name: 'Expense Categories',
    element: CategoryManager,
    module: MODULE.GENERAL_EXPENSES,
  },
  {
    path: '/ems/general-expenses/upload',
    name: 'Upload Excel',
    element: ExpenseUpload,
    module: MODULE.GENERAL_EXPENSES,
  },
  {
    path: '/ems/general-expenses/analysis',
    name: 'Expense Analysis',
    element: ExpenseAnalysis,
    module: MODULE.GENERAL_EXPENSES,
  },
  {
    path: '/ems/general-expenses/:id/edit',
    name: 'Edit Expense',
    element: GeneralExpenseForm,
    module: MODULE.GENERAL_EXPENSES,
  },
  {
    path: '/ems/general-expenses/:id',
    name: 'Expense Detail',
    element: GeneralExpenseDetail,
    module: MODULE.GENERAL_EXPENSES,
  },

  {
    path: '/ems/finance',
    name: 'Finance',
    element: placeholder('Finance'),
    module: MODULE.FINANCE,
  },

  {
    path: '/ems/reports-analysis',
    name: 'Reports & Analysis',
    element: placeholder('Reports & Analysis'),
    module: MODULE.REPORTS,
  },
  {
    path: '/ems/reports-analysis/attendance',
    name: 'Attendance Report',
    element: placeholder('Attendance Report'),
    module: MODULE.REPORTS,
  },
  {
    path: '/ems/reports-analysis/payroll',
    name: 'Payroll Report',
    element: placeholder('Payroll Report'),
    module: MODULE.REPORTS,
  },

  {
    path: '/ems/audit-logs',
    name: 'Audit Logs',
    element: placeholder('Audit Logs'),
    module: MODULE.AUDIT_LOGS,
  },
]

export default emsRoutes
