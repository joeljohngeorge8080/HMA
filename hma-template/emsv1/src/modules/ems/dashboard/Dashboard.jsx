import React, { useState } from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSettings } from '@coreui/icons'

import useDashboardWidgets from '../../../components/dashboard/useDashboardWidgets'
import DashboardGrid from '../../../components/dashboard/DashboardGrid'
import WidgetCatalog from '../../../components/dashboard/WidgetCatalog'

import EmployeeStatsWidget from './widgets/EmployeeStatsWidget'
import AttendanceSummaryWidget from './widgets/AttendanceSummaryWidget'
import GeneralExpenseWidget from './widgets/GeneralExpenseWidget'
import ExpenseByCategoryWidget from './widgets/ExpenseByCategoryWidget'
import PayrollSummaryWidget from './widgets/PayrollSummaryWidget'
import AnnouncementsWidget from './widgets/AnnouncementsWidget'
import ExpensePoolsWidget from './widgets/ExpensePoolsWidget'
import GlobalCorePoolWidget from './widgets/GlobalCorePoolWidget'
import ExpenseManagementWidget from './widgets/ExpenseManagementWidget'
import DepartmentHeadcountWidget from './widgets/DepartmentHeadcountWidget'
import AttendanceTrendWidget from './widgets/AttendanceTrendWidget'
import ProjectsOverviewWidget from './widgets/ProjectsOverviewWidget'
import ProfitLossWidget from './widgets/ProfitLossWidget'

const ALL_WIDGETS = [
  {
    id: 'employee_stats',
    title: 'Employee Overview',
    description: 'Total, active, inactive, and on-project employee counts',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'HR', color: 'primary' },
    component: EmployeeStatsWidget,
  },
  {
    id: 'attendance_summary',
    title: 'Attendance Summary',
    description: 'Present / absent / late / leave counts for this month',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'HR', color: 'primary' },
    component: AttendanceSummaryWidget,
  },
  {
    id: 'payroll_summary',
    title: 'Payroll Summary',
    description: 'Monthly payroll total, average salary, breakdown by department',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'Finance', color: 'success' },
    component: PayrollSummaryWidget,
  },
  {
    id: 'general_expense',
    title: 'General Expenses',
    description: 'YTD planned vs actual spend, this month total, budget utilisation',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'Finance', color: 'success' },
    component: GeneralExpenseWidget,
  },
  {
    id: 'expense_by_category',
    title: 'Expenses by Category',
    description: 'Top expense categories with relative spend comparison',
    colProps: { xs: 12, lg: 6 },
    badge: { label: 'Finance', color: 'success' },
    component: ExpenseByCategoryWidget,
  },
  {
    id: 'announcements',
    title: 'Recent Announcements',
    description: 'Latest announcements and notices from leadership',
    colProps: { xs: 12, lg: 6 },
    badge: { label: 'Comms', color: 'info' },
    component: AnnouncementsWidget,
  },
  {
    id: 'expense_pools',
    title: 'Expense Pools',
    description: 'HR / Admin / Core monthly pool budget vs used',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'Finance', color: 'success' },
    component: ExpensePoolsWidget,
  },
  {
    id: 'global_core_pool',
    title: 'Global Core Pool',
    description: 'Unassigned vs assigned employee salary totals',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'Finance', color: 'success' },
    component: GlobalCorePoolWidget,
  },
  {
    id: 'expense_management',
    title: 'Expense Management',
    description: 'Admin/HR/Core/Direct budget vs used, across all projects',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'Finance', color: 'success' },
    component: ExpenseManagementWidget,
  },
  {
    id: 'department_headcount',
    title: 'Department Headcount',
    description: 'Active employees by department',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'HR', color: 'primary' },
    component: DepartmentHeadcountWidget,
  },
  {
    id: 'attendance_trend',
    title: 'Attendance Trend',
    description: '6-month trailing present/absent/leave rate chart',
    colProps: { xs: 12, lg: 6 },
    badge: { label: 'HR', color: 'primary' },
    component: AttendanceTrendWidget,
  },
  {
    id: 'projects_overview',
    title: 'Projects Overview',
    description: 'Total projects, value, and beneficiaries (live data)',
    colProps: { xs: 12, sm: 6, xl: 3 },
    badge: { label: 'Projects', color: 'warning' },
    component: ProjectsOverviewWidget,
  },
  {
    id: 'profit_loss',
    title: 'Profit / Loss',
    description: 'Current-year expenses vs own revenue, LSGB dependency verdict',
    colProps: { xs: 12, lg: 6 },
    badge: { label: 'Finance', color: 'success' },
    component: ProfitLossWidget,
  },
]

const Dashboard = () => {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const { activeIds, activeWidgets, toggleWidget, resetWidgets } = useDashboardWidgets(
    'ems',
    ALL_WIDGETS,
  )

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1">EMS Dashboard</h4>
          <p className="text-body-secondary mb-0 small">
            {activeWidgets.length} of {ALL_WIDGETS.length} widgets active
          </p>
        </div>
        <CButton color="secondary" variant="outline" size="sm" onClick={() => setCatalogOpen(true)}>
          <CIcon icon={cilSettings} className="me-1" size="sm" />
          Customize
        </CButton>
      </div>

      <DashboardGrid activeWidgets={activeWidgets} />

      <WidgetCatalog
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        allWidgets={ALL_WIDGETS}
        activeIds={activeIds}
        onToggle={toggleWidget}
        onReset={resetWidgets}
      />
    </>
  )
}

export default Dashboard
