import React from 'react'
import { MODULE } from '../constants/modules'
import Placeholder from '../views/Placeholder'

const UserManagementPage = React.lazy(
  () => import('../modules/ems/user-management/UserManagementPage'),
)
const AdminSettingsPage = React.lazy(() => import('../modules/ems/admin/AdminSettingsPage'))
const CeoAnnouncementsPage = React.lazy(
  () => import('../modules/ems/announcements/CeoAnnouncementsPage'),
)
const AnnouncementsInboxPage = React.lazy(
  () => import('../modules/ems/announcements/AnnouncementsInboxPage'),
)

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
const GlobalHRPoolPage = React.lazy(() => import('../modules/ems/hr-pool/GlobalHRPoolPage'))
const CorePoolPage = React.lazy(() => import('../modules/ems/core-pool/CorePoolPage'))
const ProjectOverheadsList = React.lazy(() => import('../modules/ems/projects/ProjectOverheadsList'))
const ProjectOverheadView = React.lazy(() => import('../modules/ems/projects/ProjectOverheadView'))

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

const AdminExpensePage = React.lazy(
  () => import('../modules/ems/expense-management/AdminExpensePage'),
)
const InternshipPage = React.lazy(() => import('../modules/ems/internship/InternshipPage'))
const RecruitmentPage = React.lazy(() => import('../modules/ems/recruitment/RecruitmentPage'))

const placeholder = (title, message) => {
  const Page = () => React.createElement(Placeholder, { title, message })
  Page.displayName = `Placeholder(${title})`
  return Page
}

export const emsRoutes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/ems/dashboard', name: 'Dashboard', element: Dashboard, module: MODULE.DASHBOARD },
  {
    path: '/ems/my-profile',
    name: 'My Profile',
    element: MyProfilePage,
    module: MODULE.MY_PROFILE,
  },

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
    path: '/ems/internship',
    name: 'Internship',
    element: InternshipPage,
    module: MODULE.INTERNSHIP,
  },
  {
    path: '/ems/recruitment',
    name: 'Recruitment',
    element: RecruitmentPage,
    module: MODULE.RECRUITMENT,
  },

  {
    path: '/ems/hr-pool/global',
    name: 'Global HR Pool',
    element: GlobalHRPoolPage,
    module: MODULE.HR_POOL,
  },
  {
    path: '/ems/core-pool/global',
    name: 'Global Core Pool',
    element: CorePoolPage,
    module: MODULE.HR_POOL, // We can reuse HR_POOL or create a CORE_POOL module if it existed.
  },
  {
    path: '/ems/projects/overheads',
    name: 'Project Overheads',
    element: ProjectOverheadsList,
    module: MODULE.HR_POOL,
  },
  {
    path: '/ems/projects/:id/overheads',
    name: 'Project Overhead Details',
    element: ProjectOverheadView,
    module: MODULE.HR_POOL,
  },
  {
    path: '/ems/expense-management',
    name: 'Expense Management',
    element: AdminExpensePage,
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
    path: '/ems/finance/detail-1',
    name: 'Detail 1',
    element: placeholder('Finance – Detail 1'),
    module: MODULE.FINANCE,
  },
  {
    path: '/ems/finance/detail-2',
    name: 'Detail 2',
    element: placeholder('Finance – Detail 2'),
    module: MODULE.FINANCE,
  },
  {
    path: '/ems/finance/detail-3',
    name: 'Detail 3',
    element: placeholder('Finance – Detail 3'),
    module: MODULE.FINANCE,
  },
  {
    path: '/ems/finance/detail-4',
    name: 'Detail 4',
    element: placeholder('Finance – Detail 4'),
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

  {
    path: '/ems/user-management',
    name: 'Registered Users',
    element: UserManagementPage,
    module: MODULE.USER_MANAGEMENT,
  },
  {
    path: '/ems/user-management/add',
    name: 'Add User',
    element: UserManagementPage,
    module: MODULE.USER_MANAGEMENT,
  },

  // Admin Settings — Admin only
  {
    path: '/ems/admin-settings',
    name: 'Admin Settings',
    element: AdminSettingsPage,
    module: MODULE.ADMIN_SETTINGS,
  },

  // CEO Announcements — all three nav links point here; tabs are managed internally
  {
    path: '/ems/announcements',
    name: 'Announcements',
    element: CeoAnnouncementsPage,
    module: MODULE.CEO_ANNOUNCEMENTS,
  },
  {
    path: '/ems/announcements/compose',
    name: 'Compose Announcement',
    element: CeoAnnouncementsPage,
    module: MODULE.CEO_ANNOUNCEMENTS,
  },
  {
    path: '/ems/announcements/sent',
    name: 'Sent Announcements',
    element: CeoAnnouncementsPage,
    module: MODULE.CEO_ANNOUNCEMENTS,
  },

  // Notifications inbox — all non-CEO/Admin roles
  {
    path: '/ems/notifications',
    name: 'Notifications',
    element: AnnouncementsInboxPage,
    module: MODULE.NOTIFICATIONS,
  },
]

export default emsRoutes
