import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilPeople,
  cilCalendar,
  cilMoney,
  cilDollar,
  cilChartPie,
  cilListRich,
  cilTransfer,
  cilReload,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

import { ROLE } from '../../constants/roles'

const STAFF_ROLES = [ROLE.CEO, ROLE.HEADS, ROLE.HR, ROLE.FINANCE]

const emsNav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/ems/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Staff & Payroll',
    to: '/ems/staff-payroll',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavGroup,
    name: 'Attendance',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
    items: [
      { component: CNavItem, name: 'Overview', to: '/ems/attendance' },
      { component: CNavItem, name: 'Import Excel', to: '/ems/attendance/import' },
      { component: CNavItem, name: 'Corrections', to: '/ems/attendance/corrections' },
    ],
  },
  {
    component: CNavItem,
    name: 'Expense Management',
    to: '/ems/expense-management',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavItem,
    name: 'Admin Expenses',
    to: '/ems/admin-expenses',
    icon: <CIcon icon={cilReload} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavItem,
    name: 'Finance',
    to: '/ems/finance',
    icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavItem,
    name: 'Reports & Analysis',
    to: '/ems/reports-analysis',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Audit Logs',
    to: '/ems/audit-logs',
    icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Switch to PMS',
    to: '/select-system',
    icon: <CIcon icon={cilTransfer} customClassName="nav-icon" />,
  },
]

export default emsNav
