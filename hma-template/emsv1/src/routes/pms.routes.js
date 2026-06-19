import React from 'react'
import { MODULE } from '../constants/modules'
import Placeholder from '../views/Placeholder'

const placeholder = (title, message) => {
  const Page = () => React.createElement(Placeholder, { title, message })
  Page.displayName = `Placeholder(${title})`
  return Page
}

export const pmsRoutes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/pms/dashboard', name: 'Dashboard', element: placeholder('PMS Dashboard'), module: MODULE.PMS_DASHBOARD },

  { path: '/pms/projects', name: 'Projects', element: placeholder('All Projects'), module: MODULE.PMS_PROJECTS },
  { path: '/pms/projects/create', name: 'Create Project', element: placeholder('Create Project'), module: MODULE.PMS_PROJECTS },
  { path: '/pms/projects/archive', name: 'Archive', element: placeholder('Project Archive'), module: MODULE.PMS_PROJECTS },
  { path: '/pms/projects/:id', name: 'Project Detail', element: placeholder('Project Detail'), module: MODULE.PMS_PROJECTS },
  { path: '/pms/projects/:id/edit', name: 'Edit Project', element: placeholder('Edit Project'), module: MODULE.PMS_PROJECTS },

  { path: '/pms/project-lifecycle/pipeline', name: 'Pipeline', element: placeholder('Pipeline'), module: MODULE.PMS_LIFECYCLE },
  { path: '/pms/project-lifecycle/design', name: 'Design Phase', element: placeholder('Design Phase'), module: MODULE.PMS_LIFECYCLE },
  { path: '/pms/project-lifecycle/implementation', name: 'Implementation', element: placeholder('Implementation'), module: MODULE.PMS_LIFECYCLE },
  { path: '/pms/project-lifecycle/followup', name: 'Follow-up', element: placeholder('Follow-up'), module: MODULE.PMS_LIFECYCLE },
  { path: '/pms/project-lifecycle/completed', name: 'Completed', element: placeholder('Completed Projects'), module: MODULE.PMS_LIFECYCLE },

  { path: '/pms/project-expenses/entry', name: 'Expense Entry', element: placeholder('Expense Entry'), module: MODULE.PMS_EXPENSES },
  { path: '/pms/project-expenses/history', name: 'Expense History', element: placeholder('Expense History'), module: MODULE.PMS_EXPENSES },
  { path: '/pms/project-expenses/analysis', name: 'Expense Analysis', element: placeholder('Expense Analysis'), module: MODULE.PMS_EXPENSES },
  { path: '/pms/project-expenses/documents', name: 'Expense Documents', element: placeholder('Expense Documents'), module: MODULE.PMS_EXPENSES },

  { path: '/pms/project-documents/proposals', name: 'Proposals', element: placeholder('Proposals'), module: MODULE.PMS_DOCUMENTS },
  { path: '/pms/project-documents/agreements', name: 'Agreements', element: placeholder('Agreements'), module: MODULE.PMS_DOCUMENTS },
  { path: '/pms/project-documents/invoices', name: 'Invoices', element: placeholder('Invoices'), module: MODULE.PMS_DOCUMENTS },
  { path: '/pms/project-documents/utilization-certificates', name: 'Utilization Certificates', element: placeholder('Utilization Certificates'), module: MODULE.PMS_DOCUMENTS },
  { path: '/pms/project-documents/reports', name: 'Reports', element: placeholder('Document Reports'), module: MODULE.PMS_DOCUMENTS },
  { path: '/pms/project-documents/other', name: 'Other Documents', element: placeholder('Other Documents'), module: MODULE.PMS_DOCUMENTS },

  { path: '/pms/project-teams/officers', name: 'Project Officers', element: placeholder('Project Officers'), module: MODULE.PMS_TEAMS },
  { path: '/pms/project-teams/allocation', name: 'Employee Allocation', element: placeholder('Employee Allocation'), module: MODULE.PMS_TEAMS },
  { path: '/pms/project-teams/history', name: 'Assignment History', element: placeholder('Assignment History'), module: MODULE.PMS_TEAMS },

  { path: '/pms/project-locations/locations', name: 'Locations', element: placeholder('Locations'), module: MODULE.PMS_LOCATIONS },
  { path: '/pms/project-locations/districts', name: 'Districts', element: placeholder('Districts'), module: MODULE.PMS_LOCATIONS },
  { path: '/pms/project-locations/mapping', name: 'Location Mapping', element: placeholder('Location Mapping'), module: MODULE.PMS_LOCATIONS },

  { path: '/pms/project-reports/project-wise', name: 'Project-wise Report', element: placeholder('Project-wise Report'), module: MODULE.PMS_REPORTS },
  { path: '/pms/project-reports/overall', name: 'Overall Report', element: placeholder('Overall Report'), module: MODULE.PMS_REPORTS },
  { path: '/pms/project-reports/monthly', name: 'Monthly Report', element: placeholder('Monthly Report'), module: MODULE.PMS_REPORTS },
  { path: '/pms/project-reports/yearly', name: 'Yearly Report', element: placeholder('Yearly Report'), module: MODULE.PMS_REPORTS },
  { path: '/pms/project-reports/exports', name: 'Exports', element: placeholder('Report Exports'), module: MODULE.PMS_REPORTS },

  { path: '/pms/funding-agencies', name: 'Funding Agencies', element: placeholder('Funding Agencies'), module: MODULE.PMS_AGENCIES },
  { path: '/pms/implementing-partners', name: 'Implementing Partners', element: placeholder('Implementing Partners'), module: MODULE.PMS_PARTNERS },

  { path: '/pms/audit-logs', name: 'Audit Logs', element: placeholder('Audit Logs'), module: MODULE.AUDIT_LOGS },
]

export default pmsRoutes
