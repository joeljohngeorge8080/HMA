/**
 * Sidebar Navigation Configuration — HMA IEMS
 *
 * Top-level items may carry a `roles` array listing which roles can SEE the
 * item. Items without `roles` are visible to everyone. AppSidebar filters
 * this list by the current role before rendering. There is no Settings item.
 *
 * @module _nav
 */

import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilFolder,
  cilPeople,
  cilCalendar,
  cilMoney,
  cilDollar,
  cilChartPie,
  cilListRich,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

import { ROLE } from './constants/roles'

const STAFF_SIDE_ROLES = [ROLE.CEO, ROLE.HEADS, ROLE.HR, ROLE.FINANCE]

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Projects',
    icon: <CIcon icon={cilFolder} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'CSR Projects', to: '/projects/csr' },
      { component: CNavItem, name: 'LSGB Projects', to: '/projects/lsgb' },
      { component: CNavItem, name: 'Other Projects', to: '/projects/other' },
    ],
  },
  {
    component: CNavItem,
    name: 'Staff & Payroll',
    to: '/staff',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: STAFF_SIDE_ROLES,
  },
  {
    component: CNavGroup,
    name: 'Attendance',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    roles: STAFF_SIDE_ROLES,
    items: [
      { component: CNavItem, name: 'Overview', to: '/attendance' },
      { component: CNavItem, name: 'Import Excel', to: '/attendance/import' },
      { component: CNavItem, name: 'Corrections', to: '/attendance/corrections' },
    ],
  },
  {
    component: CNavItem,
    name: 'Expense Management',
    to: '/expenses',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    roles: STAFF_SIDE_ROLES,
  },
  {
    component: CNavItem,
    name: 'Finance',
    to: '/finance',
    icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
    roles: STAFF_SIDE_ROLES,
  },
  {
    component: CNavItem,
    name: 'Reports & Analysis',
    to: '/reports',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Audit Logs',
    to: '/audit-logs',
    icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
  },
]

export default _nav
