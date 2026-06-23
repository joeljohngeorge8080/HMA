import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilFolder,
  cilSync,
  cilDollar,
  cilFile,
  cilPeople,
  cilLocationPin,
  cilCash,
  cilChartPie,
  cilBuilding,
  cilListRich,
  cilTransfer,
  cilUser,
  cilBriefcase,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

const pmsNav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/pms/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  // ── Project Associate section ──
  {
    component: CNavGroup,
    name: 'Project Associate',
    icon: <CIcon icon={cilBriefcase} customClassName="nav-icon" />,
    badge: { color: 'primary', text: 'PA' },
    items: [
      { component: CNavItem, name: 'PA Dashboard', to: '/pms/pa/dashboard' },
      { component: CNavItem, name: 'All Projects', to: '/pms/projects' },
      { component: CNavItem, name: 'Create Project', to: '/pms/projects/create' },
      { component: CNavItem, name: 'Project Officers', to: '/pms/project-teams/officers' },
      { component: CNavItem, name: 'Team Overview', to: '/pms/pa/team-overview' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Projects',
    icon: <CIcon icon={cilFolder} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'My Projects', to: '/pms/projects/my-projects' },
      { component: CNavItem, name: 'Create Project', to: '/pms/projects/create' },
      { component: CNavItem, name: 'All Projects', to: '/pms/projects' },
      { component: CNavItem, name: 'Archive', to: '/pms/projects/archive' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Project Lifecycle',
    icon: <CIcon icon={cilSync} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Pipeline', to: '/pms/project-lifecycle/pipeline' },
      { component: CNavItem, name: 'Design Phase', to: '/pms/project-lifecycle/design' },
      { component: CNavItem, name: 'Implementation', to: '/pms/project-lifecycle/implementation' },
      { component: CNavItem, name: 'Follow-up', to: '/pms/project-lifecycle/followup' },
      { component: CNavItem, name: 'Completed', to: '/pms/project-lifecycle/completed' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Project Expenses',
    icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Expense Entry', to: '/pms/project-expenses/entry' },
      { component: CNavItem, name: 'Expense History', to: '/pms/project-expenses/history' },
      { component: CNavItem, name: 'Analysis', to: '/pms/project-expenses/analysis' },
      { component: CNavItem, name: 'Documents', to: '/pms/project-expenses/documents' },
    ],
  },
  {
    component: CNavGroup,
    name: 'General Expenses',
    icon: <CIcon icon={cilCash} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Overview', to: '/ems/general-expenses' },
      { component: CNavItem, name: 'Add Expense', to: '/ems/general-expenses/new' },
      { component: CNavItem, name: 'Categories', to: '/ems/general-expenses/categories' },
      { component: CNavItem, name: 'Upload Excel', to: '/ems/general-expenses/upload' },
      { component: CNavItem, name: 'Analysis', to: '/ems/general-expenses/analysis' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Project Documents',
    icon: <CIcon icon={cilFile} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Proposals', to: '/pms/project-documents/proposals' },
      { component: CNavItem, name: 'Agreements', to: '/pms/project-documents/agreements' },
      { component: CNavItem, name: 'Invoices', to: '/pms/project-documents/invoices' },
      {
        component: CNavItem,
        name: 'Utilization Certificates',
        to: '/pms/project-documents/utilization-certificates',
      },
      { component: CNavItem, name: 'Reports', to: '/pms/project-documents/reports' },
      { component: CNavItem, name: 'Other', to: '/pms/project-documents/other' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Project Teams',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Project Officers', to: '/pms/project-teams/officers' },
      { component: CNavItem, name: 'Allocation', to: '/pms/project-teams/allocation' },
      { component: CNavItem, name: 'History', to: '/pms/project-teams/history' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Project Locations',
    icon: <CIcon icon={cilLocationPin} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Locations', to: '/pms/project-locations/locations' },
      { component: CNavItem, name: 'Districts', to: '/pms/project-locations/districts' },
      { component: CNavItem, name: 'Mapping', to: '/pms/project-locations/mapping' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Project Reports',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Project-wise', to: '/pms/project-reports/project-wise' },
      { component: CNavItem, name: 'Overall', to: '/pms/project-reports/overall' },
      { component: CNavItem, name: 'Monthly', to: '/pms/project-reports/monthly' },
      { component: CNavItem, name: 'Yearly', to: '/pms/project-reports/yearly' },
      { component: CNavItem, name: 'Exports', to: '/pms/project-reports/exports' },
    ],
  },
  {
    component: CNavItem,
    name: 'Funding Agencies',
    to: '/pms/funding-agencies',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Implementing Partners',
    to: '/pms/implementing-partners',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Field Personnel',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'My Dashboard', to: '/pms/daily-reports/personnel-log' },
      { component: CNavItem, name: 'My Tasks', to: '/pms/daily-reports/my-tasks' },
      { component: CNavItem, name: 'Submit Report', to: '/pms/daily-reports/new' },
      { component: CNavItem, name: 'My Reports', to: '/pms/daily-reports/history' },
      { component: CNavItem, name: 'Upload Bills', to: '/pms/field-personnel/bills' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Daily Reports (Admin)',
    icon: <CIcon icon={cilFile} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'My Team', to: '/pms/daily-reports/team' },
      { component: CNavItem, name: 'Assign Tasks', to: '/pms/daily-reports/tasks' },
      { component: CNavItem, name: 'Review Reports', to: '/pms/daily-reports/review' },
      { component: CNavItem, name: 'Approved Reports', to: '/pms/daily-reports/approved' },
    ],
  },
  {
    component: CNavItem,
    name: 'Audit Logs',
    to: '/pms/audit-logs',
    icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Switch to EMS',
    to: '/select-system',
    icon: <CIcon icon={cilTransfer} customClassName="nav-icon" />,
  },
]

export default pmsNav
