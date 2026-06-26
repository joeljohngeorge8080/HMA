import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilPeople,
  cilCalendar,
  cilMoney,
  cilDollar,
  cilCash,
  cilChartPie,
  cilListRich,
  cilTransfer,
  cilTags,
  cilUser,
  cilSettings,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'

import { ROLE } from '../../constants/roles'

const STAFF_ROLES = [ROLE.ADMIN, ROLE.CEO, ROLE.HEADS, ROLE.HR, ROLE.FINANCE]

const emsNav = [
  {
    component: CNavItem,
    name: 'My Profile',
    to: '/ems/my-profile',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    roles: [ROLE.EMPLOYEE],
  },
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/ems/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },

  // ── HR Admin group ─────────────────────────────────────────────────
  {
    component: CNavGroup,
    name: 'HR Admin',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
    items: [
      {
        component: CNavItem,
        name: 'Staff & Payroll',
        to: '/ems/staff-payroll',
        icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
      },
      {
        component: CNavGroup,
        name: 'Attendance',
        icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
        items: [
          { component: CNavItem, name: 'Overview', to: '/ems/attendance' },
          { component: CNavItem, name: 'Import Excel', to: '/ems/attendance/import' },
          { component: CNavItem, name: 'Corrections', to: '/ems/attendance/corrections' },
        ],
      },
      {
        component: CNavItem,
        name: 'HR & Core Pool',
        to: '/ems/hr-pool/global',
        icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
      },
      {
        component: CNavGroup,
        name: 'Activity',
        items: [
          { component: CNavItem, name: 'Internship', to: '/ems/internship' },
          { component: CNavItem, name: 'Recruitment', to: '/ems/recruitment' },
        ],
      },
    ],
  },

  // ── Expenses ───────────────────────────────────────────────────────
  {
    component: CNavItem,
    name: 'Admin Expenses',
    to: '/ems/expense-management',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavGroup,
    name: 'General Expenses',
    icon: <CIcon icon={cilCash} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
    items: [
      { component: CNavItem, name: 'Divisions', to: '/ems/general-expenses' },
      {
        component: CNavItem,
        name: 'Categories',
        to: '/ems/general-expenses/categories',
        icon: <CIcon icon={cilTags} customClassName="nav-icon" />,
      },
    ],
  },

  // ── Other ──────────────────────────────────────────────────────────
  {
    component: CNavGroup,
    name: 'Finance',
    icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
    items: [
      { component: CNavItem, name: 'Detail 1', to: '/ems/finance/detail-1' },
      { component: CNavItem, name: 'Detail 2', to: '/ems/finance/detail-2' },
      { component: CNavItem, name: 'Detail 3', to: '/ems/finance/detail-3' },
      { component: CNavItem, name: 'Detail 4', to: '/ems/finance/detail-4' },
    ],
  },

  // ── User Management (Admin + HR) ───────────────────────────────────
  {
    component: CNavGroup,
    name: 'User Management',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    roles: [ROLE.ADMIN, ROLE.HR],
    items: [
      { component: CNavItem, name: 'Registered Users', to: '/ems/user-management' },
      { component: CNavItem, name: 'Add User', to: '/ems/user-management/add' },
    ],
  },
  {
    component: CNavItem,
    name: 'Reports & Analysis',
    to: '/ems/reports-analysis',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavItem,
    name: 'Audit Logs',
    to: '/ems/audit-logs',
    icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
    roles: STAFF_ROLES,
  },
  {
    component: CNavItem,
    name: 'Switch to PMS',
    to: '/select-system',
    icon: <CIcon icon={cilTransfer} customClassName="nav-icon" />,
  },
]

export default emsNav
